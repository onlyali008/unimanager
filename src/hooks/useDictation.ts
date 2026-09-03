"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useIsClient } from "./useIsClient";

// Minimal typings for the Web Speech API (not in the standard DOM lib, and
// still vendor-prefixed in some browsers).
interface SpeechResultItem {
  0: { transcript: string };
  isFinal: boolean;
}
interface SpeechEvent {
  resultIndex: number;
  results: ArrayLike<SpeechResultItem>;
}
interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: SpeechEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}
type RecognitionCtor = new () => Recognition;

function getCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export interface Dictation {
  supported: boolean;
  listening: boolean;
  interim: string;
  start: () => void;
  stop: () => void;
}

/**
 * Live speech-to-text. Final phrases are handed to `onFinal`; the current
 * in-progress phrase is exposed as `interim` for a live preview.
 *
 * Note: in Chrome this uses Google's servers for recognition, so it is not a
 * fully-offline/private feature. It degrades to `supported: false` elsewhere.
 */
export function useDictation(onFinal: (text: string) => void): Dictation {
  const isClient = useIsClient();
  const supported = isClient && getCtor() !== null;
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const recognitionRef = useRef<Recognition | null>(null);
  const onFinalRef = useRef(onFinal);

  // Keep the latest callback without touching the ref during render.
  useEffect(() => {
    onFinalRef.current = onFinal;
  });

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  const start = useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor || recognitionRef.current) return;
    const recognition = new Ctor();
    recognition.lang =
      typeof navigator !== "undefined" ? navigator.language : "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (e: SpeechEvent) => {
      let live = "";
      for (let i = e.resultIndex; i < e.results.length; i += 1) {
        const item = e.results[i];
        const text = item[0].transcript;
        if (item.isFinal) {
          onFinalRef.current(text.trim());
        } else {
          live += text;
        }
      }
      setInterim(live);
    };
    recognition.onerror = () => {
      setInterim("");
    };
    recognition.onend = () => {
      setListening(false);
      setInterim("");
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  return { supported, listening, interim, start, stop };
}
