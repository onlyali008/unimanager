/**
 * Single-account auth, configured entirely from .env.local:
 *   AUTH_EMAIL          the one allowed login email
 *   AUTH_PASSWORD_HASH  scrypt hash from `node scripts/set-password.mjs`
 *   AUTH_SECRET         random secret signing session cookies (same script)
 * All three present → the whole app requires login. Any missing → auth is
 * off and Semestra behaves like the local-only app it was before Phase 6.
 */

export function authEnabled(): boolean {
  return Boolean(
    process.env.AUTH_EMAIL &&
      process.env.AUTH_PASSWORD_HASH &&
      process.env.AUTH_SECRET,
  );
}

export function authEmail(): string {
  return (process.env.AUTH_EMAIL ?? "").trim().toLowerCase();
}

export function authSecret(): string {
  return process.env.AUTH_SECRET ?? "";
}

export function passwordHash(): string {
  return process.env.AUTH_PASSWORD_HASH ?? "";
}

/** Verification codes are emailed only when SMTP is configured. */
export function smtpConfigured(): boolean {
  return Boolean(
    (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) ||
      process.env.SMTP_DEBUG === "1",
  );
}
