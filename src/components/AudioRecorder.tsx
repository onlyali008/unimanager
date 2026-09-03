"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useIsClient } from "@/hooks/useIsClient";

interface AudioRecorderProps {
  onSave: (blob: Blob, durationMs: number, mimeType: string) => void;
}

function fmt(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function AudioRecorder({ onSave }: AudioRecorderProps) {
  const isClient = useIsClient();
  const supported =
    isClient &&
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== "undefined";

  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const startedRef = useRef(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const start = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "";
      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined,
      );
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const type = recorder.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        const duration = Date.now() - startedRef.current;
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        if (tickRef.current) clearInterval(tickRef.current);
        setRecording(false);
        setElapsed(0);
        if (blob.size > 0) onSave(blob, duration, type);
      };

      recorderRef.current = recorder;
      startedRef.current = Date.now();
      recorder.start();
      setRecording(true);
      tickRef.current = setInterval(() => {
        setElapsed(Date.now() - startedRef.current);
      }, 250);
    } catch {
      setError("Microphone access was blocked. Check your browser permissions.");
    }
  }, [onSave]);

  const stop = useCallback(() => {
    recorderRef.current?.stop();
  }, []);

  if (!supported) {
    return (
      <span className="muted-note">
        Recording isn&apos;t supported in this browser.
      </span>
    );
  }

  return (
    <span className="recorder">
      {recording ? (
        <>
          <button type="button" className="btn btn-danger" onClick={stop}>
            <span className="rec-dot" aria-hidden="true" /> Stop ({fmt(elapsed)})
          </button>
        </>
      ) : (
        <button type="button" className="btn btn-ghost" onClick={start}>
          Record audio
        </button>
      )}
      {error && (
        <span role="alert" className="field-error">
          {error}
        </span>
      )}
    </span>
  );
}
