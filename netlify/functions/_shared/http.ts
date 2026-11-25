import {
  createHmac,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import type { HandlerEvent, HandlerResponse } from "@netlify/functions";
import type { Session } from "@supabase/supabase-js";

const SESSION_TTL_SECONDS = 12 * 60 * 60;
const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;
const SECURE_COOKIE_NAME = "__Host-mazestudio-admin";
const LOCAL_COOKIE_NAME = "mazestudio-admin";

type StoredSession = {
  accessToken: string;
  refreshToken: string;
  issuedAt: number;
  issuedAtSignature: string;
};

export type AdminContext = {
  session: Session;
  userId: string;
  email: string;
  issuedAt: number;
  secureCookie: boolean;
};

function getSessionSigningKey(): Buffer | null {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || !/^[a-f0-9]{64}$/i.test(secret)) return null;
  return Buffer.from(secret, "hex");
}

export function hasSessionSigningSecret(): boolean {
  return getSessionSigningKey() !== null;
}

function signIssuedAt(issuedAt: number, key: Buffer): string {
  return createHmac("sha256", key).update(String(issuedAt)).digest("base64url");
}

export function json(
  statusCode: number,
  data: unknown,
  headers: Record<string, string> = {},
): HandlerResponse {
  return {
    statusCode,
    headers: {
      "Cache-Control": "no-store",
      "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
      "Content-Type": "application/json; charset=utf-8",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      ...headers,
    },
    body: JSON.stringify(data),
  };
}

export function withSessionCookie(
  response: HandlerResponse,
  session: Session,
  issuedAt: number,
  secureCookie: boolean,
): HandlerResponse {
  const now = Math.floor(Date.now() / 1000);
  const signingKey = getSessionSigningKey();
  if (
    !signingKey ||
    !Number.isSafeInteger(issuedAt) ||
    issuedAt <= 0 ||
    issuedAt > now
  ) {
    throw new Error("Cannot issue an invalid administrative session cookie.");
  }
  const ageLeft = Math.min(
    SESSION_TTL_SECONDS,
    SESSION_MAX_AGE_SECONDS - (now - issuedAt),
  );
  if (ageLeft <= 0) return clearSessionCookie(response, secureCookie);

  const cookieName = secureCookie ? SECURE_COOKIE_NAME : LOCAL_COOKIE_NAME;
  const cookieValue = Buffer.from(
    JSON.stringify({
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      issuedAt,
      issuedAtSignature: signIssuedAt(issuedAt, signingKey),
    } satisfies StoredSession),
  ).toString("base64url");
  return setCookie(
    response,
    `${cookieName}=${cookieValue}; Path=/; Max-Age=${ageLeft}; HttpOnly; SameSite=Strict${secureCookie ? "; Secure" : ""}`,
  );
}

export function clearSessionCookie(
  response: HandlerResponse,
  secureCookie: boolean,
): HandlerResponse {
  const cookieName = secureCookie ? SECURE_COOKIE_NAME : LOCAL_COOKIE_NAME;
  return setCookie(
    response,
    `${cookieName}=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict${secureCookie ? "; Secure" : ""}`,
  );
}

function setCookie(response: HandlerResponse, value: string): HandlerResponse {
  return {
    ...response,
    headers: { ...response.headers, "Set-Cookie": value },
  };
}

export function readStoredSession(event: HandlerEvent): StoredSession | null {
  const cookies = event.headers.cookie ?? event.headers.Cookie ?? "";
  const secureCookie = isSecureOrigin(
    process.env.ADMIN_ALLOWED_ORIGIN ?? "",
  );
  const cookieName = secureCookie ? SECURE_COOKIE_NAME : LOCAL_COOKIE_NAME;
  const encoded = cookies
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${cookieName}=`))
    ?.slice(cookieName.length + 1);
  if (!encoded || encoded.length > 6000) return null;

  try {
    const parsed: unknown = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    );
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("accessToken" in parsed) ||
      !("refreshToken" in parsed) ||
      !("issuedAt" in parsed) ||
      !("issuedAtSignature" in parsed) ||
      typeof parsed.accessToken !== "string" ||
      typeof parsed.refreshToken !== "string" ||
      typeof parsed.issuedAt !== "number" ||
      !Number.isSafeInteger(parsed.issuedAt) ||
      parsed.issuedAt <= 0 ||
      typeof parsed.issuedAtSignature !== "string" ||
      !/^[A-Za-z0-9_-]{43}$/.test(parsed.issuedAtSignature)
    ) {
      return null;
    }

    const signingKey = getSessionSigningKey();
    if (!signingKey) return null;
    const expectedSignature = signIssuedAt(parsed.issuedAt, signingKey);
    const provided = Buffer.from(parsed.issuedAtSignature);
    const expected = Buffer.from(expectedSignature);
    if (!timingSafeEqual(provided, expected)) return null;

    return {
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken,
      issuedAt: parsed.issuedAt,
      issuedAtSignature: parsed.issuedAtSignature,
    };
  } catch {
    return null;
  }
}

export function getSessionIssuedAt(stored: StoredSession): number {
  return stored.issuedAt;
}

export function isSessionExpired(issuedAt: number): boolean {
  const now = Math.floor(Date.now() / 1000);
  return (
    !Number.isSafeInteger(issuedAt) ||
    issuedAt <= 0 ||
    issuedAt > now ||
    now - issuedAt >= SESSION_MAX_AGE_SECONDS
  );
}

export function isSecureOrigin(origin: string): boolean {
  try {
    return new URL(origin).protocol === "https:";
  } catch {
    return false;
  }
}

export function isAllowedMutation(event: HandlerEvent): boolean {
  const configuredOrigin = process.env.ADMIN_ALLOWED_ORIGIN;
  const requestOrigin = event.headers.origin ?? event.headers.Origin;
  if (!configuredOrigin || !requestOrigin) return false;

  try {
    return (
      new URL(configuredOrigin).origin === requestOrigin &&
      new URL(requestOrigin).origin === requestOrigin
    );
  } catch {
    return false;
  }
}

export async function parseJsonBody(
  event: HandlerEvent,
  maxBytes = 16_384,
): Promise<Record<string, unknown> | null> {
  if (!event.body) return null;
  const rawBody = event.isBase64Encoded
    ? Buffer.from(event.body, "base64").toString("utf8")
    : event.body;
  if (Buffer.byteLength(rawBody, "utf8") > maxBytes) return null;

  try {
    const body: unknown = JSON.parse(rawBody);
    return typeof body === "object" && body !== null && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

export function logSafeFailure(area: string, error: unknown): void {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String(error.code)
      : "unknown";
  console.error(JSON.stringify({ event: "admin_request_failed", area, code, id: randomUUID() }));
}
