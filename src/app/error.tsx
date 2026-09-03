"use client";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="page" style={{ textAlign: "center", gap: "1rem" }}>
      <p className="eyebrow">Semestra</p>
      <h1 className="page-title">Something went wrong</h1>
      <p className="muted-note">
        The dashboard hit an unexpected error. Your saved data is untouched.
      </p>
      <div>
        <button type="button" className="btn btn-primary" onClick={reset}>
          Try again
        </button>
      </div>
    </div>
  );
}
