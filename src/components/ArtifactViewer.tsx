"use client";

import { useEffect, useRef, useState } from "react";
import type { Artifact } from "@/lib/types";
import { ARTIFACT_KIND_LABELS } from "@/lib/types";
import { renderMarkdown } from "@/lib/markdown";
import { getAudio } from "@/lib/audioStore";
import { useDictation } from "@/hooks/useDictation";

interface ArtifactViewerProps {
  artifact: Artifact;
  onUpdate: (
    id: string,
    patch: Partial<Pick<Artifact, "title" | "content">>,
  ) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

function fmtDuration(ms: number | undefined): string {
  if (!ms) return "";
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function ArtifactViewer({
  artifact,
  onUpdate,
  onDelete,
  onClose,
}: ArtifactViewerProps) {
  const [mode, setMode] = useState<"edit" | "preview">(
    artifact.kind === "audio" ? "preview" : "edit",
  );
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Keep the latest content so dictation appends to fresh text.
  const contentRef = useRef(artifact.content);
  useEffect(() => {
    contentRef.current = artifact.content;
  }, [artifact.content]);

  const dictation = useDictation((text) => {
    if (!text) return;
    const base = contentRef.current;
    onUpdate(artifact.id, {
      content: base ? `${base}\n${text}` : text,
    });
  });

  // Load the audio blob for audio artifacts.
  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;
    if (artifact.kind === "audio" && artifact.audioId) {
      getAudio(artifact.audioId)
        .then((blob) => {
          if (blob && !cancelled) {
            url = URL.createObjectURL(blob);
            setAudioUrl(url);
          }
        })
        .catch(() => {});
    }
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [artifact.kind, artifact.audioId]);

  const isText = artifact.kind === "note" || artifact.kind === "transcript";

  return (
    <div className="artifact-viewer card" aria-label={`Artifact: ${artifact.title}`}>
      <div className="artifact-viewer-head">
        <div className="artifact-title-wrap">
          <span className="artifact-badge" data-kind={artifact.kind}>
            {ARTIFACT_KIND_LABELS[artifact.kind]}
          </span>
          <input
            className="artifact-title-input"
            value={artifact.title}
            onChange={(e) => onUpdate(artifact.id, { title: e.target.value })}
            aria-label="Artifact title"
          />
        </div>
        <button
          type="button"
          className="btn-icon"
          onClick={onClose}
          aria-label="Close artifact"
        >
          ✕
        </button>
      </div>

      {isText && (
        <div className="artifact-toolbar">
          <div className="segmented" role="group" aria-label="View mode">
            <button
              type="button"
              className={mode === "edit" ? "seg active" : "seg"}
              aria-pressed={mode === "edit"}
              onClick={() => setMode("edit")}
            >
              Edit
            </button>
            <button
              type="button"
              className={mode === "preview" ? "seg active" : "seg"}
              aria-pressed={mode === "preview"}
              onClick={() => setMode("preview")}
            >
              Preview
            </button>
          </div>

          {artifact.kind === "transcript" &&
            (dictation.supported ? (
              <button
                type="button"
                className={
                  dictation.listening ? "btn btn-danger" : "btn btn-ghost"
                }
                onClick={() =>
                  dictation.listening ? dictation.stop() : dictation.start()
                }
              >
                {dictation.listening ? (
                  <>
                    <span className="rec-dot" aria-hidden="true" /> Stop
                    dictation
                  </>
                ) : (
                  "Start dictation"
                )}
              </button>
            ) : (
              <span className="muted-note">Dictation not supported here</span>
            ))}
        </div>
      )}

      {isText && mode === "edit" && (
        <>
          <textarea
            className="field-input artifact-editor"
            value={artifact.content}
            onChange={(e) => onUpdate(artifact.id, { content: e.target.value })}
            placeholder="Write here. Markdown supported: # heading, **bold**, - lists, [links](https://…)."
            aria-label="Artifact content"
            rows={14}
          />
          {dictation.listening && (
            <p className="dictation-live" aria-live="polite">
              {dictation.interim || "Listening…"}
            </p>
          )}
        </>
      )}

      {isText && mode === "preview" && (
        <div
          className="artifact-preview markdown-body"
          // Safe: renderMarkdown HTML-escapes input before formatting.
          dangerouslySetInnerHTML={{ __html: renderMarkdown(artifact.content) }}
        />
      )}

      {artifact.kind === "audio" && (
        <div className="artifact-audio">
          {audioUrl ? (
            <audio controls src={audioUrl} className="audio-player" />
          ) : (
            <p className="muted-note">Loading recording…</p>
          )}
          {artifact.durationMs ? (
            <p className="muted-note">
              Length {fmtDuration(artifact.durationMs)}
            </p>
          ) : null}
        </div>
      )}

      <div className="artifact-viewer-foot">
        {confirmDelete ? (
          <span className="confirm-inline">
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => onDelete(artifact.id)}
            >
              Confirm delete
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setConfirmDelete(false)}
            >
              Cancel
            </button>
          </span>
        ) : (
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => setConfirmDelete(true)}
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
