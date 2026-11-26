import type { Handler } from "@netlify/functions";
import {
  isAllowedMutation,
  json,
  logSafeFailure,
  parseJsonBody,
} from "./_shared/http";
import {
  createSupabaseClient,
  getServiceConfig,
  hasAdminRole,
} from "./_shared/supabase";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RECOVERY_PATH = "/admin/redefinir-senha";

function isBoundedToken(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 4096;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod.toUpperCase() !== "POST") {
    return json(405, { error: "Ação não permitida." }, { Allow: "POST" });
  }
  if (!isAllowedMutation(event)) {
    return json(403, { error: "Origem da solicitação não autorizada." });
  }

  const body = await parseJsonBody(event, 8192);
  if (!body || typeof body.action !== "string") {
    return json(400, { error: "Não foi possível entender a solicitação." });
  }

  const config = getServiceConfig();
  const client = createSupabaseClient(config);
  if (!config || !client) {
    return json(503, {
      error: "A recuperação de senha ainda não está disponível. Tente novamente mais tarde.",
    });
  }

  if (body.action === "request") {
    const email = typeof body.email === "string" ? body.email.trim() : "";
    if (email.length < 3 || email.length > 254 || !EMAIL_PATTERN.test(email)) {
      return json(400, { error: "Informe um endereço de e-mail válido." });
    }

    const redirectTo = new URL(RECOVERY_PATH, config.allowedOrigin).toString();
    try {
      const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo,
      });
      if (error) {
        logSafeFailure("password-recovery-request", error);
        return json(error.status === 429 ? 429 : 503, {
          error:
            error.status === 429
              ? "Muitas solicitações. Aguarde antes de pedir outro link."
              : "Não foi possível solicitar a recuperação agora. Tente novamente mais tarde.",
        });
      }
    } catch (error) {
      logSafeFailure("password-recovery-request", error);
      return json(503, {
        error: "Não foi possível solicitar a recuperação agora. Tente novamente mais tarde.",
      });
    }
    return json(200, { sent: true });
  }

  if (body.action === "complete") {
    const accessToken = body.accessToken;
    const refreshToken = body.refreshToken;
    const password = typeof body.password === "string" ? body.password : "";
    if (
      !isBoundedToken(accessToken) ||
      !isBoundedToken(refreshToken)
    ) {
      return json(400, {
        error: "O link de recuperação não contém uma sessão válida. Solicite um novo link.",
      });
    }
    if (password.length < 12 || password.length > 128) {
      return json(400, {
        error: "A senha precisa ter entre 12 e 128 caracteres.",
      });
    }

    try {
      const { data: sessionData, error: sessionError } =
        await client.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
      if (sessionError || !sessionData.session) {
        return json(400, {
          error: "O link de recuperação é inválido ou venceu. Solicite outro.",
        });
      }

      const { data: userData, error: userError } = await client.auth.getUser();
      if (userError || !userData.user) {
        return json(400, {
          error: "O link de recuperação é inválido ou venceu. Solicite outro.",
        });
      }
      if (!(await hasAdminRole(client, userData.user.id))) {
        await client.auth.signOut({ scope: "local" });
        return json(403, {
          error: "Esta conta não está autorizada a redefinir acesso ao painel.",
        });
      }

      const { error } = await client.auth.updateUser({ password });
      if (error) {
        logSafeFailure("password-recovery-complete", error);
        return json(error.status === 429 ? 429 : 400, {
          error:
            error.status === 429
              ? "Muitas tentativas. Aguarde e solicite um novo link."
              : "Não foi possível atualizar a senha. Escolha outra senha ou solicite um novo link.",
        });
      }

      const { error: signOutError } = await client.auth.signOut({
        scope: "global",
      });
      if (signOutError) {
        logSafeFailure("password-recovery-revoke-sessions", signOutError);
        return json(200, {
          updated: true,
          warning:
            "A senha foi alterada, mas não conseguimos encerrar todas as outras sessões. Peça ajuda para revisar os acessos ativos.",
        });
      }
      return json(200, { updated: true });
    } catch (error) {
      logSafeFailure("password-recovery-complete", error);
      return json(503, {
        error: "Não foi possível concluir a redefinição agora. Solicite um novo link mais tarde.",
      });
    }
  }

  return json(400, { error: "Ação não reconhecida." });
};
