/**
 * Generates the auth env values for .env.local:
 *   node scripts/set-password.mjs "your-password-here"
 *
 * Prints AUTH_PASSWORD_HASH and (if you don't have one yet) AUTH_SECRET.
 * Keep the same "scrypt:<salt>:<hash>" format as src/lib/auth/password.ts.
 */
import { randomBytes, scryptSync } from "node:crypto";

const password = process.argv[2];
if (!password || password.length < 8) {
  console.error(
    'Usage: node scripts/set-password.mjs "<password, 8+ characters>"',
  );
  process.exit(1);
}

const salt = randomBytes(16).toString("hex");
const hash = scryptSync(password, salt, 64).toString("hex");

console.log("Add these to .env.local (plus AUTH_EMAIL=you@example.com):\n");
console.log(`AUTH_PASSWORD_HASH="scrypt:${salt}:${hash}"`);
console.log(`AUTH_SECRET="${randomBytes(32).toString("hex")}"`);
console.log("\nRestart the server afterwards. Login is enforced only when");
console.log("AUTH_EMAIL, AUTH_PASSWORD_HASH, and AUTH_SECRET are all set.");
