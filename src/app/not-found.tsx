import Link from "next/link";

export default function NotFound() {
  return (
    <div className="page" style={{ textAlign: "center", gap: "1rem" }}>
      <p className="eyebrow">Semestra</p>
      <h1 className="page-title">Page not found</h1>
      <p className="muted-note">
        That page doesn&apos;t exist. Head back to your dashboard.
      </p>
      <div>
        <Link className="btn btn-primary" href="/">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
