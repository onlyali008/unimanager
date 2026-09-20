import { ImageResponse } from "next/og";

// Generated to a static PNG at build time and auto-wired into og:image /
// twitter:image by Next's file convention.
export const dynamic = "force-static";
export const alt = "Semestra — your semester at a glance";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#f6f2ea",
          color: "#2b2620",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: "linear-gradient(135deg, #b5651d, #d98a4a)",
            }}
          />
          <div style={{ fontSize: 40, fontWeight: 800 }}>Semestra</div>
        </div>
        <div
          style={{
            fontSize: 68,
            fontWeight: 800,
            marginTop: 44,
            lineHeight: 1.05,
            maxWidth: 940,
          }}
        >
          Your semester at a glance.
        </div>
        <div
          style={{
            fontSize: 30,
            color: "#6d675b",
            marginTop: 24,
            maxWidth: 880,
          }}
        >
          A calm, local-first planner for courses, assignments, exams, grades,
          and study time.
        </div>
      </div>
    ),
    { ...size },
  );
}
