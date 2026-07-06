import { createHmac, randomInt, randomUUID, timingSafeEqual } from "node:crypto";

import { authSecret } from "./config";

/**
 * In-memory state for the two-step login. Losing it on restart is fine —
 * a pending login just starts over. Codes are stored hashed.
 */

const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_CODE_ATTEMPTS = 5;

interface PendingLogin {
  email: string;
  codeHash: string;
  exp: number;
  attempts: number;
}

const pending = new Map<string, PendingLogin>();

function hashCode(code: string): string {
  return createHmac("sha256", authSecret()).update(code).digest("hex");
}

export function createPendingLogin(email: string): {
  pendingId: string;
  code: string;
} {
  // Prune expired entries opportunistically.
  for (const [id, p] of pending) {
    if (p.exp < Date.now()) pending.delete(id);
  }
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const pendingId = randomUUID();
  pending.set(pendingId, {
    email,
    codeHash: hashCode(code),
    exp: Date.now() + CODE_TTL_MS,
    attempts: 0,
  });
  return { pendingId, code };
}

export type VerifyResult =
  | { ok: true; email: string }
  | { ok: false; reason: "expired" | "invalid" | "locked" };

export function verifyPendingLogin(
  pendingId: string,
  code: string,
): VerifyResult {
  const entry = pending.get(pendingId);
  if (!entry || entry.exp < Date.now()) {
    pending.delete(pendingId);
    return { ok: false, reason: "expired" };
  }
  if (entry.attempts >= MAX_CODE_ATTEMPTS) {
    pending.delete(pendingId);
    return { ok: false, reason: "locked" };
  }
  entry.attempts += 1;

  const expected = Buffer.from(entry.codeHash);
  const actual = Buffer.from(hashCode(code.trim()));
  if (expected.length === actual.length && timingSafeEqual(expected, actual)) {
    pending.delete(pendingId);
    return { ok: true, email: entry.email };
  }
  return { ok: false, reason: "invalid" };
}

/* ------------------------- login rate limiting ------------------------- */

const WINDOW_MS = 60 * 1000;
const MAX_FAILURES = 5;

let failures: number[] = [];

/** True while too many failed password attempts happened in the last minute. */
export function loginLocked(): boolean {
  const cutoff = Date.now() - WINDOW_MS;
  failures = failures.filter((t) => t > cutoff);
  return failures.length >= MAX_FAILURES;
}

export function recordLoginFailure(): void {
  failures.push(Date.now());
}
