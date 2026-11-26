import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, Check, Loader2, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { postAdminPasswordRecovery } from "../lib/adminApi";
import "./AdminPage.css";

type RecoveryView =
  | "checking"
  | "request"
  | "request_sent"
  | "reset"
  | "complete"
  | "invalid";

type RecoveryTokens = {
  accessToken: string;
  refreshToken: string;
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Não foi possível concluir a solicitação. Tente novamente.";
}

function clearRecoveryUrl(): void {
  window.history.replaceState(null, document.title, window.location.pathname);
}

export function AdminPasswordRecoveryPage() {
  const [view, setView] = useState<RecoveryView>("checking");
  const [tokens, setTokens] = useState<RecoveryTokens | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [completionNotice, setCompletionNotice] = useState("");

  useEffect(() => {
    document.title = "Redefinir senha — Espaço da Mazé";
    const handleRecoveryUrl = () => {
      const fragment = new URLSearchParams(window.location.hash.slice(1));
      const query = new URLSearchParams(window.location.search);
      const hasCallback =
        window.location.hash.length > 1 || query.has("code") || query.has("error");

      if (!hasCallback) {
        setTokens(null);
        setView("request");
        return;
      }

      const accessToken = fragment.get("access_token") ?? "";
      const refreshToken = fragment.get("refresh_token") ?? "";
      const isRecovery = fragment.get("type") === "recovery";
      clearRecoveryUrl();

      if (isRecovery && accessToken && refreshToken) {
        setTokens({ accessToken, refreshToken });
        setView("reset");
      } else {
        setTokens(null);
        setView("invalid");
      }
    };

    handleRecoveryUrl();
    window.addEventListener("hashchange", handleRecoveryUrl);

    return () => {
      window.removeEventListener("hashchange", handleRecoveryUrl);
      document.title = "Espaço da Maze — Serviços, Roupas e Perfumes";
    };
  }, []);

  const requestReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await postAdminPasswordRecovery({
        action: "request",
        email: email.trim(),
      });
      setView("request_sent");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };

  const updatePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (!tokens) {
      setView("invalid");
      return;
    }
    if (password !== passwordConfirmation) {
      setError("As senhas não conferem.");
      return;
    }
    if (password.length < 12) {
      setError("Escolha uma senha com pelo menos 12 caracteres.");
      return;
    }

    setBusy(true);
    try {
      const result = await postAdminPasswordRecovery({
        action: "complete",
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        password,
      });
      setTokens(null);
      setPassword("");
      setPasswordConfirmation("");
      setCompletionNotice(
        result.warning ??
          "Sua senha foi alterada e as outras sessões foram encerradas. Entre novamente no painel.",
      );
      setView("complete");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="admin-auth-screen">
      <section className="admin-auth-card" aria-labelledby="admin-recovery-title">
        <span className="admin-brand-mark" aria-hidden="true">M</span>
        <div className="admin-auth-eyebrow">
          <ShieldCheck size={15} /> Proteção da conta
        </div>

        {view === "checking" ? (
          <>
            <h1 id="admin-recovery-title">Verificando o link</h1>
            <p aria-live="polite">Aguarde enquanto confirmamos o link de recuperação.</p>
            <Loader2 className="admin-spin admin-recovery-loader" aria-hidden="true" size={22} />
          </>
        ) : null}

        {view === "request" ? (
          <>
            <h1 id="admin-recovery-title">Redefinir senha</h1>
            <p>
              Informe o e-mail da conta administrativa. Se ela estiver cadastrada,
              enviaremos um link para criar uma nova senha.
            </p>
            <form className="admin-auth-form" onSubmit={(event) => void requestReset(event)}>
              <label>
                <span>E-mail</span>
                <input
                  autoComplete="username"
                  autoCapitalize="none"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  maxLength={254}
                  required
                />
              </label>
              {error && <p className="admin-alert admin-alert--error" role="alert">{error}</p>}
              <button className="admin-button admin-button--primary admin-button--full" disabled={busy} type="submit">
                {busy ? <Loader2 className="admin-spin" size={17} /> : <ShieldCheck size={17} />}
                {busy ? "Enviando…" : "Enviar link de recuperação"}
              </button>
            </form>
          </>
        ) : null}

        {view === "request_sent" ? (
          <>
            <h1 id="admin-recovery-title">Confira seu e-mail</h1>
            <p role="status">
              Se esse endereço corresponder a uma conta, enviaremos um link de
              recuperação. Verifique também a pasta de spam.
            </p>
          </>
        ) : null}

        {view === "reset" ? (
          <>
            <h1 id="admin-recovery-title">Crie uma nova senha</h1>
            <p>Use uma senha longa e exclusiva, com pelo menos 12 caracteres.</p>
            <form className="admin-auth-form" onSubmit={(event) => void updatePassword(event)}>
              <label>
                <span>Nova senha</span>
                <input
                  autoComplete="new-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={12}
                  maxLength={128}
                  required
                />
              </label>
              <label>
                <span>Confirme a nova senha</span>
                <input
                  autoComplete="new-password"
                  type="password"
                  value={passwordConfirmation}
                  onChange={(event) => setPasswordConfirmation(event.target.value)}
                  minLength={12}
                  maxLength={128}
                  required
                />
              </label>
              {error && <p className="admin-alert admin-alert--error" role="alert">{error}</p>}
              <button className="admin-button admin-button--primary admin-button--full" disabled={busy} type="submit">
                {busy ? <Loader2 className="admin-spin" size={17} /> : <Check size={17} />}
                {busy ? "Salvando…" : "Salvar nova senha"}
              </button>
            </form>
          </>
        ) : null}

        {view === "complete" ? (
          <>
            <h1 id="admin-recovery-title">Senha atualizada</h1>
            <p role="status">
              {completionNotice} Agora entre com a nova senha e confirme a
              autenticação em duas etapas.
            </p>
          </>
        ) : null}

        {view === "invalid" ? (
          <>
            <h1 id="admin-recovery-title">Link inválido ou vencido</h1>
            <p>Solicite um novo link de recuperação e use somente o e-mail mais recente.</p>
            <button
              className="admin-button admin-button--primary admin-button--full admin-recovery-action"
              onClick={() => {
                setError("");
                setView("request");
              }}
              type="button"
            >
              Solicitar outro link
            </button>
          </>
        ) : null}

        {view !== "checking" && error && view !== "request" && view !== "reset" ? (
          <p className="admin-alert admin-alert--error" role="alert">{error}</p>
        ) : null}

        <Link className="admin-back-link" to="/admin">
          <ArrowLeft size={15} /> Voltar ao acesso do painel
        </Link>
      </section>
    </main>
  );
}
