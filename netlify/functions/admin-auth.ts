import type { Handler } from "@netlify/functions";
import {
  clearSessionCookie,
  isAllowedMutation,
  isSecureOrigin,
  json,
  logSafeFailure,
  parseJsonBody,
  withSessionCookie,
} from "./_shared/http";
import {
  createSupabaseClient,
  getAssuranceLevel,
  getFactors,
  getServiceConfig,
  hasAdminRole,
  restoreSession,
} from "./_shared/supabase";

type AuthState = {
  state: "mfa_setup" | "mfa_challenge";
  factorId?: string;
};

function cookieIsSecure(): boolean {
  return isSecureOrigin(process.env.ADMIN_ALLOWED_ORIGIN ?? "");
}

function unavailable() {
  return json(503, {
    error:
      "O painel ainda não foi conectado ao serviço de autenticação. Peça ajuda a quem administra o site.",
  });
}

async function getAuthState(
  client: NonNullable<ReturnType<typeof createSupabaseClient>>,
): Promise<AuthState> {
  const factors = await getFactors(client);
  const verifiedFactor = factors.totp.find(
    (factor) => factor.status === "verified",
  );
  return verifiedFactor
    ? { state: "mfa_challenge", factorId: verifiedFactor.id }
    : { state: "mfa_setup" };
}

export const handler: Handler = async (event) => {
  const method = event.httpMethod.toUpperCase();
  const secureCookie = cookieIsSecure();
  const config = getServiceConfig();
  if (!config) return unavailable();

  if (method === "GET") {
    const restored = await restoreSession(event);
    if ("kind" in restored) {
      if (restored.kind === "unavailable") return unavailable();
      const response = json(200, { state: "signed_out" });
      return restored.kind === "expired" || restored.kind === "invalid"
        ? clearSessionCookie(response, secureCookie)
        : response;
    }

    try {
      if (!(await hasAdminRole(restored.client, restored.context.userId))) {
        await restored.client.auth.signOut({ scope: "local" });
        return clearSessionCookie(
          json(200, { state: "signed_out" }),
          secureCookie,
        );
      }

      const level = await getAssuranceLevel(restored.client);
      const mfaState =
        level === "aal2" ? null : await getAuthState(restored.client);
      return withSessionCookie(
        json(200, {
          state: mfaState?.state ?? "ready",
          factorId: mfaState?.factorId,
          email: restored.context.email,
        }),
        restored.session,
        restored.context.issuedAt,
        secureCookie,
      );
    } catch (error) {
      logSafeFailure("auth-session", error);
      return json(503, {
        error: "Não foi possível verificar seu acesso agora. Tente novamente.",
      });
    }
  }

  if (method !== "POST") {
    return json(405, { error: "Ação não permitida." }, { Allow: "GET, POST" });
  }
  if (!isAllowedMutation(event)) {
    return json(403, { error: "Origem da solicitação não autorizada." });
  }

  const body = await parseJsonBody(event, 8192);
  if (!body || typeof body.action !== "string") {
    return json(400, { error: "Não foi possível entender a solicitação." });
  }

  if (body.action === "login") {
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (
      email.length < 3 ||
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      password.length < 1 ||
      password.length > 1024
    ) {
      return json(400, {
        error: "Informe um e-mail e uma senha válidos.",
      });
    }

    const client = createSupabaseClient(config);
    if (!client) return unavailable();
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password,
    });
    if (error || !data.session || !data.user) {
      return json(401, {
        error:
          "Não foi possível entrar. Confira seus dados ou peça acesso ao administrador do site.",
      });
    }

    try {
      if (!(await hasAdminRole(client, data.user.id))) {
        await client.auth.signOut({ scope: "local" });
        return json(401, {
          error:
            "Não foi possível entrar. Confira seus dados ou peça acesso ao administrador do site.",
        });
      }

      const mfaState = await getAuthState(client);
      const response = withSessionCookie(
        json(200, {
          ...mfaState,
          email: data.user.email ?? "",
        }),
        data.session,
        Math.floor(Date.now() / 1000),
        secureCookie,
      );
      return response;
    } catch (error) {
      logSafeFailure("auth-login", error);
      await client.auth.signOut({ scope: "local" });
      return json(503, {
        error: "Não foi possível verificar a autorização. Tente novamente.",
      });
    }
  }

  const restored = await restoreSession(event);
  if ("kind" in restored) {
    if (restored.kind === "unavailable") return unavailable();
    const response = json(401, {
      error: "Sua sessão expirou. Entre novamente.",
    });
    return clearSessionCookie(response, secureCookie);
  }

  try {
    if (!(await hasAdminRole(restored.client, restored.context.userId))) {
      await restored.client.auth.signOut({ scope: "local" });
      return clearSessionCookie(
        json(401, { error: "Esta conta não tem acesso ao painel." }),
        secureCookie,
      );
    }

    if (body.action === "enroll") {
      if ((await getAssuranceLevel(restored.client)) === "aal2") {
        return withSessionCookie(
          json(200, { state: "ready", email: restored.context.email }),
          restored.session,
          restored.context.issuedAt,
          secureCookie,
        );
      }
      const factors = await getFactors(restored.client);
      if (factors.totp.some((factor) => factor.status === "verified")) {
        return withSessionCookie(
          json(200, {
            state: "mfa_challenge",
            factorId: factors.totp.find((factor) => factor.status === "verified")?.id,
          }),
          restored.session,
          restored.context.issuedAt,
          secureCookie,
        );
      }

      const { data, error } = await restored.client.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Acesso administrativo Mazé",
      });
      if (error || !data.totp) {
        logSafeFailure("auth-enroll", error);
        return json(503, {
          error:
            "Não foi possível iniciar a configuração do autenticador. Tente novamente.",
        });
      }

      return withSessionCookie(
        json(200, {
          state: "mfa_setup",
          factorId: data.id,
          qrCode: data.totp.qr_code,
          secret: data.totp.secret,
          uri: data.totp.uri,
        }),
        restored.session,
        restored.context.issuedAt,
        secureCookie,
      );
    }

    if (body.action === "verify") {
      const factorId = typeof body.factorId === "string" ? body.factorId : "";
      const code = typeof body.code === "string" ? body.code.trim() : "";
      if (!/^[\w-]{8,100}$/.test(factorId) || !/^\d{6,8}$/.test(code)) {
        return json(400, { error: "Confira o código do autenticador." });
      }

      const factors = await getFactors(restored.client);
      const factor = factors.totp.find((item) => item.id === factorId);
      const pendingFactor = factors.all.find(
        (item) => item.id === factorId && item.status === "unverified",
      );
      if (!factor && !pendingFactor) {
        return json(400, {
          error:
            "Este autenticador não está mais ativo. Inicie a configuração novamente.",
        });
      }

      const { error } = await restored.client.auth.mfa.challengeAndVerify({
        factorId,
        code,
      });
      if (error) {
        return json(401, {
          error: "Código incorreto ou vencido. Confira o autenticador e tente novamente.",
        });
      }

      const { data: sessionData, error: sessionError } =
        await restored.client.auth.getSession();
      if (sessionError || !sessionData.session) {
        return json(401, {
          error: "Não foi possível confirmar a sessão. Entre novamente.",
        });
      }
      if ((await getAssuranceLevel(restored.client)) !== "aal2") {
        return json(401, {
          error: "A confirmação em duas etapas não foi concluída.",
        });
      }

      return withSessionCookie(
        json(200, { state: "ready", email: restored.context.email }),
        sessionData.session,
        restored.context.issuedAt,
        secureCookie,
      );
    }

    if (body.action === "logout") {
      const { error } = await restored.client.auth.signOut({ scope: "local" });
      if (error) logSafeFailure("auth-logout", error);
      return clearSessionCookie(
        json(200, { state: "signed_out" }),
        secureCookie,
      );
    }

    return json(400, { error: "Ação não reconhecida." });
  } catch (error) {
    logSafeFailure("auth-action", error);
    return json(503, {
      error: "Não foi possível concluir a verificação agora. Tente novamente.",
    });
  }
};
