import { cookies } from "next/headers";
import {
  ADMIN_COOKIE,
  SESSION_TTL_SECONDS,
  createSessionToken,
  isAdminConfigured,
  isSecureRequest,
  verifyPassword,
} from "@/lib/server/auth";
import { clientIp, jsonError, rateLimit, readJson } from "@/lib/server/http";

export async function POST(request: Request) {
  if (!isAdminConfigured()) {
    return jsonError("The admin password has not been set on the server (ADMIN_PASSWORD).", 503);
  }

  const ip = clientIp(request);
  if (!rateLimit(`login:${ip}`, 8, 15 * 60_000)) {
    return jsonError("Too many attempts. Please wait 15 minutes and try again.", 429);
  }

  const body = (await readJson(request)) as { password?: unknown } | null;
  const password = typeof body?.password === "string" ? body.password : "";
  if (!password || !verifyPassword(password)) {
    await new Promise((resolve) => setTimeout(resolve, 350));
    return jsonError("Incorrect password. Please try again.", 401);
  }

  const store = await cookies();
  store.set(ADMIN_COOKIE, createSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureRequest(request),
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  return Response.json({ ok: true });
}
