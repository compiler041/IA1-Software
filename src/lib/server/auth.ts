import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getEnv } from "./env";

export const ADMIN_COOKIE = "sa_admin_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 12;

const FALLBACK_SECRET = randomBytes(32).toString("hex");

/** Key for HMAC signatures. Changing ADMIN_PASSWORD or SESSION_SECRET invalidates every session. */
function signingKey(purpose: string): Buffer {
  const { adminPassword, sessionSecret } = getEnv();
  const secret = sessionSecret || (adminPassword ? "student-activity-portal" : FALLBACK_SECRET);
  return createHmac("sha256", secret).update(`${purpose}:${adminPassword}`).digest();
}

export function sign(purpose: string, value: string): string {
  return createHmac("sha256", signingKey(purpose)).update(value).digest("base64url");
}

export function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function isAdminConfigured(): boolean {
  return getEnv().adminPassword.length > 0;
}

export function verifyPassword(input: string): boolean {
  const expected = getEnv().adminPassword;
  if (!expected) return false;
  return safeEqual(input, expected);
}

export function createSessionToken(): string {
  const payload = Buffer.from(
    JSON.stringify({ exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS, n: randomBytes(8).toString("hex") }),
  ).toString("base64url");
  return `${payload}.${sign("session", payload)}`;
}

export function verifySessionToken(token: string | undefined | null): boolean {
  if (!token || !isAdminConfigured()) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  if (!safeEqual(signature, sign("session", payload))) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { exp?: number };
    return typeof data.exp === "number" && data.exp > Date.now() / 1000;
  } catch {
    return false;
  }
}

export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  return verifySessionToken(store.get(ADMIN_COOKIE)?.value);
}

/** Use at the top of admin route handlers: `const denied = await requireAdmin(); if (denied) return denied;` */
export async function requireAdmin(): Promise<Response | null> {
  if (await isAdmin()) return null;
  return Response.json({ error: "Your admin session has expired. Please sign in again." }, { status: 401 });
}

export function isSecureRequest(request: Request): boolean {
  const forwarded = request.headers.get("x-forwarded-proto");
  if (forwarded) return forwarded.split(",")[0].trim() === "https";
  return new URL(request.url).protocol === "https:";
}
