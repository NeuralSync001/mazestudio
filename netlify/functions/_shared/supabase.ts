import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";
import type { HandlerEvent } from "@netlify/functions";
import {
  getSessionIssuedAt,
  hasSessionSigningSecret,
  isSecureOrigin,
  isSessionExpired,
  readStoredSession,
  type AdminContext,
} from "./http";

type ServiceConfig = {
  url: string;
  anonKey: string;
  allowedOrigin: string;
};

export function getServiceConfig(): ServiceConfig | null {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const allowedOrigin = process.env.ADMIN_ALLOWED_ORIGIN;
  if (!url || !anonKey || !allowedOrigin || !hasSessionSigningSecret()) {
    return null;
  }

  try {
    const parsedUrl = new URL(url);
    const parsedOrigin = new URL(allowedOrigin);
    if (
      parsedUrl.protocol !== "https:" &&
      parsedUrl.hostname !== "localhost" &&
      parsedUrl.hostname !== "127.0.0.1"
    ) {
      return null;
    }
    if (parsedOrigin.origin !== allowedOrigin) return null;
  } catch {
    return null;
  }

  return { url, anonKey, allowedOrigin };
}

export function createSupabaseClient(config = getServiceConfig()) {
  if (!config) return null;
  return createClient(config.url, config.anonKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

export async function restoreSession(
  event: HandlerEvent,
): Promise<
  | { context: AdminContext; client: SupabaseClient; session: Session }
  | { kind: "missing" | "expired" | "invalid"; secureCookie: boolean }
  | { kind: "unavailable"; secureCookie: boolean }
> {
  const config = getServiceConfig();
  const secureCookie = isSecureOrigin(
    process.env.ADMIN_ALLOWED_ORIGIN ?? "",
  );
  if (!config) return { kind: "unavailable", secureCookie };

  const stored = readStoredSession(event);
  if (!stored) return { kind: "missing", secureCookie };
  const issuedAt = getSessionIssuedAt(stored);
  if (isSessionExpired(issuedAt)) return { kind: "expired", secureCookie };

  const client = createSupabaseClient(config);
  if (!client) return { kind: "unavailable", secureCookie };

  const { data, error } = await client.auth.setSession({
    access_token: stored.accessToken,
    refresh_token: stored.refreshToken,
  });
  if (error || !data.session) {
    return { kind: "invalid", secureCookie };
  }

  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData.user) {
    return { kind: "invalid", secureCookie };
  }

  return {
    context: {
      session: data.session,
      userId: userData.user.id,
      email: userData.user.email ?? "",
      issuedAt,
      secureCookie,
    },
    client,
    session: data.session,
  };
}

export async function hasAdminRole(
  client: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const { data, error } = await client
    .from("admin_users")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

export async function getAssuranceLevel(
  client: SupabaseClient,
): Promise<"aal1" | "aal2" | null> {
  const { data, error } = await client.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error) throw error;
  return data.currentLevel === "aal2" ? "aal2" : data.currentLevel === "aal1" ? "aal1" : null;
}

export async function getFactors(client: SupabaseClient) {
  const { data, error } = await client.auth.mfa.listFactors();
  if (error) throw error;
  return data;
}
