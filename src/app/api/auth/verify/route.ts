import { NextRequest, NextResponse } from "next/server";

import { authEnabled, authSecret } from "@/lib/auth/config";
import { verifyPendingLogin } from "@/lib/auth/pending";
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

  let pendingId = "";
  let code = "";
  try {
    const body = (await request.json()) as {
      pendingId?: string;
      code?: string;
    };
    pendingId = body.pendingId ?? "";
    code = body.code ?? "";
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const result = verifyPendingLogin(pendingId, code);
  if (!result.ok) {
    const message =
      result.reason === "invalid"
        ? "Wrong code — check the email and try again."
        : result.reason === "locked"
          ? "Too many wrong codes — log in again."
          : "That code expired — log in again.";
    return NextResponse.json(
      { error: message, restart: result.reason !== "invalid" },
      { status: 401 },
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(
    SESSION_COOKIE,
    createSessionToken(result.email, authSecret()),
    {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_TTL_MS / 1000,
    },
  );
  return response;
}
