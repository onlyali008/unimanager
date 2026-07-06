// Prevents an extra console window on Windows in release builds.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::path::Path;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::time::{Duration, Instant};

use tauri::{Manager, RunEvent, WebviewUrl, WebviewWindowBuilder};

/// The packaged Next.js server listens here (distinct from `next dev`'s 3000).
const PORT: u16 = 3210;

struct ServerProcess(Mutex<Option<Child>>);

/// Minimal KEY=VALUE parser for the bundled .env.local (no dotenv dep).
fn parse_env_file(path: &Path) -> Vec<(String, String)> {
    let Ok(raw) = std::fs::read_to_string(path) else {
        return Vec::new();
    };
    raw.lines()
        .filter_map(|line| {
            let line = line.trim();
            if line.is_empty() || line.starts_with('#') {
                return None;
            }
            let (key, value) = line.split_once('=')?;
            let value = value.trim().trim_matches('"').trim_matches('\'');
            Some((key.trim().to_string(), value.to_string()))
        })
        .collect()
}

fn wait_for_server(timeout: Duration) -> bool {
    let start = Instant::now();
    while start.elapsed() < timeout {
        if std::net::TcpStream::connect(("127.0.0.1", PORT)).is_ok() {
            return true;
        }
        std::thread::sleep(Duration::from_millis(300));
    }
    false
}

fn spawn_bundled_server(app: &tauri::App) -> Result<Child, String> {
    let server_dir = app
        .path()
        .resource_dir()
        .map_err(|e| format!("no resource dir: {e}"))?
        .join("standalone");

    let mut envs = parse_env_file(&server_dir.join(".env.local"));
    envs.push(("PORT".into(), PORT.to_string()));
    envs.push(("HOSTNAME".into(), "127.0.0.1".into()));
    envs.push(("NODE_ENV".into(), "production".into()));

    let mut cmd = Command::new("node");
    cmd.arg("server.js")
        .current_dir(&server_dir)
        .envs(envs)
        .stdout(Stdio::null())
        .stderr(Stdio::null());

    // Keep the Node child from opening its own console window.
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x0800_0000); // CREATE_NO_WINDOW
    }

    cmd.spawn().map_err(|e| {
        format!(
            "Couldn't start the bundled server — is Node.js installed and on PATH? ({e})"
        )
    })
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let url = if cfg!(debug_assertions) {
                // `tauri dev` runs `npm run dev` via beforeDevCommand.
                "http://localhost:3000".to_string()
            } else {
                let child = spawn_bundled_server(app)?;
                app.manage(ServerProcess(Mutex::new(Some(child))));
                if !wait_for_server(Duration::from_secs(20)) {
                    return Err("The Semestra server didn't come up within 20s.".into());
                }
                format!("http://127.0.0.1:{PORT}")
            };

            WebviewWindowBuilder::new(
                app,
                "main",
                WebviewUrl::External(url.parse().expect("static url is valid")),
            )
            .title("Semestra")
            .inner_size(1280.0, 850.0)
            .min_inner_size(720.0, 560.0)
            .build()?;

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building Semestra")
        .run(|app, event| {
            if let RunEvent::Exit = event {
                // Take the Node server down with the window.
                if let Some(state) = app.try_state::<ServerProcess>() {
                    if let Ok(mut guard) = state.0.lock() {
                        if let Some(mut child) = guard.take() {
                            let _ = child.kill();
                        }
                    }
                }
            }
        });
}
