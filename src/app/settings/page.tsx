"use client";

import { useRef, useState } from "react";
import type { Density, ThemePref } from "@/lib/types";
import { useStore } from "@/hooks/useStore";
import * as storeApi from "@/lib/store";
import { exportJSON, importJSON } from "@/lib/storage";

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
  const fileRef = useRef<HTMLInputElement>(null);

  function announce(text: string) {
    setMessage(text);
  }

  function handleExport() {
    const data = exportJSON(storeApi.getSnapshot());
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "semestra-data.json";
    a.click();
    URL.revokeObjectURL(url);
    announce("Exported your data.");
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const state = importJSON(String(reader.result));
        replaceAll(state);
        announce(
          `Imported ${state.tasks.length} tasks and ${state.courses.length} courses.`,
        );
      } catch {
        announce("That file could not be imported. Expected Semestra JSON.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
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
            <h2 className="group-title">Your data</h2>
            <p className="muted-note">
              Everything lives in this browser&apos;s local storage. Nothing is
              uploaded. Export makes a JSON backup you control; import replaces
              your current data with a validated file.
            </p>
            <div className="data-buttons">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={handleExport}
              >
                Export JSON
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => fileRef.current?.click()}
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
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  resetDemo();
                  announce("Demo data restored.");
                }}
              >
                Restore demo data
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => {
                  clear();
                  announce("All tasks cleared.");
                }}
              >
                Clear all tasks
              </button>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
