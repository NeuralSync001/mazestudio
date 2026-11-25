import type {
  AdminActivity,
  AdminAuthState,
  AdminProduct,
  ProductDraft,
} from "../types/admin";

export class AdminApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "AdminApiError";
  }
}

type ApiResult = {
  state?: "signed_out" | "mfa_setup" | "mfa_challenge" | "ready";
  email?: string;
  factorId?: string;
  qrCode?: string;
  secret?: string;
  uri?: string;
  error?: string;
};

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      cache: "no-store",
      credentials: "same-origin",
      headers: {
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
      },
    });
  } catch {
    throw new AdminApiError(
      "Não foi possível conectar ao painel. Confira sua conexão e tente novamente.",
      0,
    );
  }

  if (!response.headers.get("content-type")?.includes("application/json")) {
    throw new AdminApiError(
      "As funções seguras do painel não estão disponíveis neste ambiente. Inicie o Netlify Dev para testar o painel localmente.",
      503,
    );
  }

  let body: Record<string, unknown> = {};
  try {
    const parsed: unknown = await response.json();
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      body = parsed as Record<string, unknown>;
    }
  } catch {
    if (!response.ok) {
      throw new AdminApiError(
        "O painel não conseguiu concluir a solicitação. Tente novamente.",
        response.status,
      );
    }
  }

  if (!response.ok) {
    throw new AdminApiError(
      typeof body.error === "string"
        ? body.error
        : "O painel não conseguiu concluir a solicitação. Tente novamente.",
      response.status,
    );
  }
  return body as T;
}

export async function getAdminSession(): Promise<AdminAuthState> {
  const result = await request<ApiResult>("/.netlify/functions/admin-auth");
  if (result.state === "ready" && typeof result.email === "string") {
    return { state: "ready", email: result.email };
  }
  if (
    result.state === "mfa_setup" ||
    result.state === "mfa_challenge" ||
    result.state === "signed_out"
  ) {
    return {
      state: result.state,
      email: result.email,
      factorId: result.factorId,
    };
  }
  throw new AdminApiError(
    "O painel recebeu uma resposta inesperada. Tente novamente.",
    502,
  );
}

export async function postAdminAuth(
  body: Record<string, string>,
): Promise<ApiResult> {
  return request<ApiResult>("/.netlify/functions/admin-auth", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function getAdminProducts(): Promise<{
  products: AdminProduct[];
  activity: AdminActivity[];
}> {
  return request("/.netlify/functions/admin-products");
}

export async function saveAdminProduct(
  product: ProductDraft,
  id?: string,
): Promise<string> {
  const response = await request<{ id?: string }>(
    id
      ? `/.netlify/functions/admin-products?id=${encodeURIComponent(id)}`
      : "/.netlify/functions/admin-products",
    {
      method: id ? "PATCH" : "POST",
      body: JSON.stringify(product),
    },
  );
  if (!response.id) {
    throw new AdminApiError("O produto não foi salvo. Tente novamente.", 502);
  }
  return response.id;
}

export async function uploadAdminProductImage(
  productId: string,
  altText: string,
  dataUrl: string,
): Promise<{ imageUrl?: string; warning?: string }> {
  return request("/.netlify/functions/admin-images", {
    method: "POST",
    body: JSON.stringify({ productId, altText, dataUrl }),
  });
}

export async function deleteAdminProduct(
  id: string,
): Promise<{ deleted: boolean; warning?: string }> {
  return request(
    `/.netlify/functions/admin-products?id=${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
}
