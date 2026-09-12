"use client";

import { useRef, useState } from "react";
import type { Density, ThemePref } from "@/lib/types";
import { useStore } from "@/hooks/useStore";
import * as storeApi from "@/lib/store";
import { buildBackup, restoreBackup } from "@/lib/backup";
import { importJSON } from "@/lib/storage";
import { listOllamaModels } from "@/lib/assistant";

export default function SettingsPage() {
  const {
    ready,
    terms,
    settings,
    updateSettings,
    addTerm,
    setCurrentTerm,
    resetDemo,
    clear,
    replaceAll,
  } = useStore();

  const [newTerm, setNewTerm] = useState("");
  const [message, setMessage] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function announce(text: string) {
    setMessage(text);
  }

  const [busy, setBusy] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"reset" | "clear" | null>(
    null,
  );
  const [pendingImport, setPendingImport] = useState<{
    text: string;
    tasks: number;
    courses: number;
  } | null>(null);

  async function handleExport() {
    setBusy(true);
    try {
      const { json, stats } = await buildBackup(storeApi.getSnapshot());
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "semestra-data.json";
      a.click();
      URL.revokeObjectURL(url);
      announce(
        `Exported your data${
          stats.recordings > 0
            ? ` including ${stats.recordings} recording${
                stats.recordings === 1 ? "" : "s"
              }`
            : ""
        }.`,
      );
    } catch {
      announce("Export failed — your data may be too large to bundle at once.");
    } finally {
      setBusy(false);
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      const preview = importJSON(text); // validates without touching storage
      setPendingImport({
        text,
        tasks: preview.tasks.length,
        courses: preview.courses.length,
      });
    } catch {
      announce("That file could not be imported. Expected Semestra JSON.");
    }
  }

  async function confirmImport() {
    if (!pendingImport) return;
    setBusy(true);
    try {
      const { state, stats } = await restoreBackup(pendingImport.text);
      replaceAll(state);
      announce(
        `Imported ${state.tasks.length} tasks, ${state.courses.length} courses` +
          (stats.recordings > 0
            ? `, and ${stats.recordings} recording${
                stats.recordings === 1 ? "" : "s"
              }.`
            : "."),
      );
    } catch {
      announce("Import failed.");
    } finally {
      setBusy(false);
      setPendingImport(null);
    }
  }

  async function testConnection() {
    setTesting(true);
    setTestResult(null);
    try {
      const models = await listOllamaModels(settings.ollamaUrl);
      const has = models.includes(settings.ollamaModel);
      setTestResult(
        has
          ? `Connected. ${settings.ollamaModel} is installed and ready.`
          : `Connected, but ${settings.ollamaModel} isn't installed. Run: ollama pull ${settings.ollamaModel}` +
              (models.length ? ` (found: ${models.join(", ")})` : ""),
      );
    } catch {
      setTestResult(
        "Could not reach Ollama. Start it with OLLAMA_ORIGINS=http://localhost:3000 ollama serve.",
      );
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Settings</p>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">
            Appearance, terms, and your data — all stored in this browser.
          </p>
        </div>
      </header>

      <div aria-live="polite" className="sr-only">
        {message}
      </div>

      {!ready ? (
        <p className="muted-note">Loading…</p>
      ) : (
        <>
          <section className="card settings-section">
            <h2 className="group-title">Appearance</h2>
            <div className="settings-grid">
              <div>
                <label htmlFor="theme" className="field-label">
                  Theme
                </label>
                <select
                  id="theme"
                  className="field-input"
                  value={settings.theme}
                  onChange={(e) =>
                    updateSettings({ theme: e.target.value as ThemePref })
                  }
                >
                  <option value="system">Match system</option>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </div>
              <div>
                <label htmlFor="density" className="field-label">
                  Density
                </label>
                <select
                  id="density"
                  className="field-input"
                  value={settings.density}
                  onChange={(e) =>
                    updateSettings({ density: e.target.value as Density })
                  }
                >
                  <option value="comfortable">Comfortable</option>
                  <option value="compact">Compact</option>
                </select>
              </div>
            </div>
          </section>

          <section className="card settings-section">
            <h2 className="group-title">Reminders</h2>
            <p className="muted-note">
              Get a browser notification about 30 minutes before a task is due,
              while Semestra is open in a tab.
            </p>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={settings.remindersEnabled}
                onChange={(e) =>
                  updateSettings({ remindersEnabled: e.target.checked })
                }
              />
              <span>Enable deadline reminders</span>
            </label>
            <div className="data-buttons">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={async () => {
                  if (typeof Notification === "undefined") {
                    announce("This browser doesn't support notifications.");
                    return;
                  }
                  const p = await Notification.requestPermission();
                  announce(
                    p === "granted"
                      ? "Notifications enabled."
                      : "Notifications are blocked — enable them in your browser settings.",
                  );
                }}
              >
                Enable notifications
              </button>
            </div>
          </section>

          <section className="card settings-section">
            <h2 className="group-title">Terms</h2>
            <div className="settings-grid">
              <div>
                <label htmlFor="current-term" className="field-label">
                  Current term
                </label>
                <select
                  id="current-term"
                  className="field-input"
                  value={settings.currentTermId}
                  onChange={(e) => setCurrentTerm(e.target.value)}
                >
                  {terms.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="new-term" className="field-label">
                  Add a term
                </label>
                <div className="inline-add">
                  <input
                    id="new-term"
                    className="field-input"
                    value={newTerm}
                    onChange={(e) => setNewTerm(e.target.value)}
                    placeholder="e.g. Spring 2027"
                  />
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => {
                      if (!newTerm.trim()) return;
                      const term = addTerm(newTerm);
                      setCurrentTerm(term.id);
                      setNewTerm("");
                      announce(`Added ${term.name}.`);
                    }}
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="card settings-section">
            <h2 className="group-title">AI assistant</h2>
            <p className="muted-note">
              The assistant runs on a local{" "}
              <a
                href="https://ollama.com"
                target="_blank"
                rel="noopener noreferrer"
                className="course-name-link"
              >
                Ollama
              </a>{" "}
              model — private and offline. A light model like{" "}
              <code>llama3.2:1b</code> is plenty for schedule questions; try{" "}
              <code>qwen2.5:1.5b</code> or <code>llama3.2:3b</code> for sharper
              answers.
            </p>
            <div className="settings-grid">
              <div>
                <label htmlFor="ollama-url" className="field-label">
                  Ollama URL
                </label>
                <input
                  id="ollama-url"
                  className="field-input"
                  value={settings.ollamaUrl}
                  onChange={(e) =>
                    updateSettings({ ollamaUrl: e.target.value })
                  }
                  placeholder="http://localhost:11434"
                />
              </div>
              <div>
                <label htmlFor="ollama-model" className="field-label">
                  Model
                </label>
                <input
                  id="ollama-model"
                  className="field-input"
                  value={settings.ollamaModel}
                  onChange={(e) =>
                    updateSettings({ ollamaModel: e.target.value })
                  }
                  placeholder="llama3.2:1b"
                />
              </div>
            </div>
            <div className="data-buttons">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={testConnection}
                disabled={testing}
              >
                {testing ? "Testing…" : "Test connection"}
              </button>
            </div>
            {testResult && <p className="muted-note">{testResult}</p>}
            <p className="muted-note">
              Ollama must allow this app to reach it. Start it with{" "}
              <code>OLLAMA_ORIGINS=http://localhost:3000 ollama serve</code>.
            </p>
          </section>

          <section className="card settings-section">
            <h2 className="group-title">Your data</h2>
            <p className="muted-note">
              Everything lives in this browser only. Nothing is uploaded.
              Export makes a JSON backup you control — audio recordings are
              embedded in it — and import replaces your current data with a
              validated file.
            </p>
            <div className="data-buttons">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={handleExport}
                disabled={busy}
              >
                {busy ? "Working…" : "Export JSON"}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => fileRef.current?.click()}
                disabled={busy}
              >
                Import JSON
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json"
                className="sr-only"
                onChange={handleImport}
                aria-label="Import Semestra JSON file"
              />
              {confirmAction === "reset" ? (
                <span className="confirm-inline">
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => {
                      resetDemo();
                      setConfirmAction(null);
                      announce("Demo data restored.");
                    }}
                  >
                    Confirm restore
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setConfirmAction(null)}
                  >
                    Cancel
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setConfirmAction("reset")}
                >
                  Restore demo data
                </button>
              )}
              {confirmAction === "clear" ? (
                <span className="confirm-inline">
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => {
                      clear();
                      setConfirmAction(null);
                      announce("All tasks cleared.");
                    }}
                  >
                    Confirm clear
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setConfirmAction(null)}
                  >
                    Cancel
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => setConfirmAction("clear")}
                >
                  Clear all tasks
                </button>
              )}
            </div>

            {pendingImport && (
              <div className="import-confirm" role="alert">
                <p>
                  Replace <strong>all current data</strong> with{" "}
                  {pendingImport.tasks} tasks and {pendingImport.courses}{" "}
                  courses from this file? This cannot be undone.
                </p>
                <div className="data-buttons">
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={confirmImport}
                    disabled={busy}
                  >
                    {busy ? "Importing…" : "Replace my data"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setPendingImport(null)}
                    disabled={busy}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
