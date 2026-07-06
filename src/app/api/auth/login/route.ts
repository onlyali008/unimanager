import { NextRequest, NextResponse } from "next/server";

import {
  authEmail,
  authEnabled,
  authSecret,
  passwordHash,
  smtpConfigured,
} from "@/lib/auth/config";
import { sendVerificationCode } from "@/lib/auth/mailer";
import { verifyPassword } from "@/lib/auth/password";
import {
  createPendingLogin,
  loginLocked,
  recordLoginFailure,
} from "@/lib/auth/pending";
import {
  createSessionToken,
  SESSION_COOKIE,
  SESSION_TTL_MS,
} from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  if (!authEnabled()) {
    return NextResponse.json(
      { error: "Login isn't configured on this server." },
      { status: 503 },
    );
  }
  if (loginLocked()) {
    return NextResponse.json(
      { error: "Too many attempts — wait a minute and try again." },
      { status: 429 },
    );
  }

  let email = "";
  let password = "";
  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
    };
    email = (body.email ?? "").trim().toLowerCase();
    password = body.password ?? "";
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const emailOk = email === authEmail();
  const passwordOk = verifyPassword(password, passwordHash());
  if (!emailOk || !passwordOk) {
    recordLoginFailure();
    return NextResponse.json(
      { error: "Wrong email or password." },
      { status: 401 },
    );
  }

  // Step 2: emailed verification code, when mail is available.
  if (smtpConfigured()) {
    const { pendingId, code } = createPendingLogin(email);
    try {
      await sendVerificationCode(email, code);
    } catch (error) {
      return NextResponse.json(
        {
          error: `Couldn't send the verification email: ${
            error instanceof Error ? error.message : "unknown error"
          }`,
        },
        { status: 502 },
      );
    }
    return NextResponse.json({ pendingId });
  }

  // No SMTP — password-only session.
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, createSessionToken(email, authSecret()), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
  return response;
}
