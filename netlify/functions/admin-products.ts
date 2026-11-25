import type { Handler, HandlerEvent, HandlerResponse } from "@netlify/functions";
import {
  clearSessionCookie,
  isAllowedMutation,
  json,
  logSafeFailure,
  parseJsonBody,
  withSessionCookie,
} from "./_shared/http";
import {
  getAssuranceLevel,
  hasAdminRole,
  restoreSession,
} from "./_shared/supabase";
import type { ClothingType, PerfumeAudience } from "../../src/types/admin";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const perfumeAudiences: readonly PerfumeAudience[] = [
  "Masculino",
  "Feminino",
  "Unissex",
];
const clothingTypes: readonly ClothingType[] = [
  "Blusas",
  "Calças",
  "Vestidos",
  "Casacos",
  "Saias",
  "Acessórios",
  "Outros",
];

function isPerfumeAudience(value: unknown): value is PerfumeAudience {
  return perfumeAudiences.some((audience) => audience === value);
}

function isClothingType(value: unknown): value is ClothingType {
  return clothingTypes.some((type) => type === value);
}

type VariantInput = {
  label: string;
  sku: string | null;
  price: number;
  compare_at_price: number | null;
  stock: number;
};

type ProductInput = {
  productId: string | null;
  category: "perfume" | "clothing";
  audience: PerfumeAudience | null;
  clothingType: ClothingType | null;
  name: string;
  slug: string;
  brand: string | null;
  description: string;
  family: string | null;
  volumeMl: number | null;
  status: "draft" | "published";
  isNew: boolean;
  isFeatured: boolean;
  variants: VariantInput[];
};

function makeSlug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100)
    .replace(/-+$/g, "");
}

function validateProduct(
  body: Record<string, unknown>,
  productId: string | null,
): ProductInput | null {
  const category = body.category;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const brand = typeof body.brand === "string" ? body.brand.trim() : "";
  const description =
    typeof body.description === "string" ? body.description.trim() : "";
  const audience = body.audience;
  const clothingType = body.clothingType;
  const audienceValue = isPerfumeAudience(audience) ? audience : null;
  const clothingTypeValue = isClothingType(clothingType) ? clothingType : null;
  const family = typeof body.family === "string" ? body.family.trim() : "";
  const volumeMl =
    body.volumeMl === "" || body.volumeMl === null || body.volumeMl === undefined
      ? null
      : Number(body.volumeMl);

  if (
    (category !== "perfume" && category !== "clothing") ||
    (category === "perfume" &&
      (audienceValue === null ||
        (clothingType !== null && clothingType !== undefined))) ||
    (category === "clothing" &&
      (audience !== null ||
        clothingTypeValue === null)) ||
    name.length < 1 ||
    name.length > 120 ||
    brand.length > 120 ||
    description.length > 3000 ||
    family.length > 120 ||
    (category === "clothing" && (family.length > 0 || volumeMl !== null)) ||
    (category === "perfume" &&
      volumeMl !== null &&
      (!Number.isInteger(volumeMl) || volumeMl < 1 || volumeMl > 5000)) ||
    (body.status !== "draft" && body.status !== "published") ||
    typeof body.isNew !== "boolean" ||
    typeof body.isFeatured !== "boolean" ||
    !Array.isArray(body.variants) ||
    body.variants.length < 1 ||
    body.variants.length > 20 ||
    (productId !== null && !UUID_PATTERN.test(productId))
  ) {
    return null;
  }

  const variants: VariantInput[] = [];
  for (const rawVariant of body.variants) {
    if (typeof rawVariant !== "object" || rawVariant === null) return null;
    const variant = rawVariant as Record<string, unknown>;
    const label = typeof variant.label === "string" ? variant.label.trim() : "";
    const sku = typeof variant.sku === "string" ? variant.sku.trim() : "";
    const price = Number(variant.price);
    const compareAtPrice =
      variant.compareAtPrice === "" ||
      variant.compareAtPrice === null ||
      variant.compareAtPrice === undefined
        ? null
        : Number(variant.compareAtPrice);
    const stock = Number(variant.stock);

    if (
      label.length < 1 ||
      label.length > 60 ||
      sku.length > 80 ||
      !Number.isFinite(price) ||
      price <= 0 ||
      (compareAtPrice !== null &&
        (!Number.isFinite(compareAtPrice) || compareAtPrice < price)) ||
      !Number.isInteger(stock) ||
      stock < 0 ||
      stock > 10_000_000
    ) {
      return null;
    }

    variants.push({
      label,
      sku: sku || null,
      price,
      compare_at_price: compareAtPrice,
      stock,
    });
  }

  if (new Set(variants.map((variant) => variant.label.toLocaleLowerCase())).size !== variants.length) {
    return null;
  }

  const slugSource =
    typeof body.slug === "string" && body.slug.trim()
      ? body.slug.trim()
      : name;
  const slug = makeSlug(slugSource);
  if (!slug) return null;

  return {
    productId,
    category,
    audience: category === "perfume" ? audienceValue : null,
    clothingType:
      category === "clothing" ? clothingTypeValue : null,
    name,
    slug,
    brand: brand || null,
    description,
    family: family || null,
    volumeMl,
    status: body.status,
    isNew: body.isNew,
    isFeatured: body.isFeatured,
    variants,
  };
}

function authFailure(response: HandlerResponse, secureCookie: boolean) {
  return clearSessionCookie(response, secureCookie);
}

export const handler: Handler = async (event: HandlerEvent) => {
  const method = event.httpMethod.toUpperCase();
  if (method !== "GET" && !isAllowedMutation(event)) {
    return json(403, { error: "Origem da solicitação não autorizada." });
  }

  const restored = await restoreSession(event);
  if ("kind" in restored) {
    if (restored.kind === "unavailable") {
      return json(503, {
        error: "O painel ainda não foi conectado ao serviço de autenticação.",
      });
    }
    return json(401, { error: "Sua sessão expirou. Entre novamente." });
  }

  const responseWithSession = (response: HandlerResponse) =>
    withSessionCookie(
      response,
      restored.session,
      restored.context.issuedAt,
      restored.context.secureCookie,
    );

  try {
    if (!(await hasAdminRole(restored.client, restored.context.userId))) {
      return authFailure(
        json(403, { error: "Esta conta não tem acesso ao painel." }),
        restored.context.secureCookie,
      );
    }
    if ((await getAssuranceLevel(restored.client)) !== "aal2") {
      return responseWithSession(
        json(403, {
          error: "Confirme sua identidade em duas etapas para continuar.",
        }),
      );
    }

    if (method === "GET") {
      const { data: products, error } = await restored.client
        .from("products")
        .select(
          "id,category,name,slug,brand,description,audience,clothing_type,family,volume_ml,status,is_new,is_featured,created_at,updated_at,product_variants(id,label,sku,price,compare_at_price,stock),product_images(id,storage_path,alt_text,sort_order,created_at)",
        )
        .order("updated_at", { ascending: false });
      if (error) {
        logSafeFailure("products-list", error);
        return responseWithSession(
          json(503, { error: "Não foi possível carregar os produtos." }),
        );
      }

      const paths = (products ?? []).flatMap((product) =>
        (product.product_images ?? []).map(
          (image: { storage_path: string }) => image.storage_path,
        ),
      );
      const signedUrls = new Map<string, string>();
      if (paths.length > 0) {
        const { data, error: signingError } = await restored.client.storage
          .from("product-images")
          .createSignedUrls(paths, 900);
        if (signingError) {
          logSafeFailure("products-images", signingError);
          return responseWithSession(
            json(503, { error: "Não foi possível carregar as fotos dos produtos." }),
          );
        }
        for (const item of data ?? []) {
          if (item.path && item.signedUrl) {
            signedUrls.set(item.path, item.signedUrl);
          }
        }
      }

      const result = (products ?? []).map((product) => ({
        ...product,
        product_variants: [...(product.product_variants ?? [])].sort(
          (a, b) => a.label.localeCompare(b.label, "pt-BR"),
        ),
        product_images: [...(product.product_images ?? [])]
          .sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at))
          .map(({ storage_path, ...image }) => ({
            ...image,
            url: signedUrls.get(storage_path) ?? null,
          })),
      }));

      const { data: activity, error: activityError } = await restored.client
        .from("admin_audit_log")
        .select("id,action,product_name,created_at")
        .order("created_at", { ascending: false })
        .limit(8);
      if (activityError) logSafeFailure("products-activity", activityError);

      return responseWithSession(
        json(200, {
          products: result,
          activity: activityError ? [] : activity,
        }),
      );
    }

    const productId = event.queryStringParameters?.id ?? null;
    if (method === "DELETE") {
      if (!productId || !UUID_PATTERN.test(productId)) {
        return responseWithSession(
          json(400, { error: "Produto não identificado. Atualize a página e tente novamente." }),
        );
      }
      const { data: images, error: imageError } = await restored.client
        .from("product_images")
        .select("storage_path")
        .eq("product_id", productId);
      if (imageError) {
        logSafeFailure("product-delete-images", imageError);
        return responseWithSession(
          json(503, { error: "Não foi possível preparar a exclusão do produto." }),
        );
      }

      const { error } = await restored.client
        .from("products")
        .delete()
        .eq("id", productId);
      if (error) {
        logSafeFailure("product-delete", error);
        return responseWithSession(
          json(503, { error: "Não foi possível excluir o produto." }),
        );
      }

      const paths = (images ?? []).map((image) => image.storage_path);
      if (paths.length > 0) {
        const { error: storageError } = await restored.client.storage
          .from("product-images")
          .remove(paths);
        if (storageError) {
          logSafeFailure("product-delete-storage", storageError);
          return responseWithSession(
            json(200, {
              deleted: true,
              warning:
                "O produto foi excluído, mas uma foto ficou no armazenamento. Peça ajuda para removê-la.",
            }),
          );
        }
      }

      return responseWithSession(json(200, { deleted: true }));
    }

    if (method !== "POST" && method !== "PATCH") {
      return responseWithSession(
        json(405, { error: "Ação não permitida." }, { Allow: "GET, POST, PATCH, DELETE" }),
      );
    }

    if (method === "PATCH" && (!productId || !UUID_PATTERN.test(productId))) {
      return responseWithSession(
        json(400, { error: "Produto não identificado. Atualize a página e tente novamente." }),
      );
    }
    if (method === "POST" && productId) {
      return responseWithSession(
        json(400, { error: "Não foi possível entender a solicitação." }),
      );
    }

    const body = await parseJsonBody(event, 32_768);
    if (!body) {
      return responseWithSession(
        json(400, { error: "Confira os campos do produto e tente novamente." }),
      );
    }
    const product = validateProduct(body, productId);
    if (!product) {
      return responseWithSession(
        json(400, {
          error:
            "Confira nome, categoria, preço, estoque e variações. Os campos destacados precisam ser corrigidos.",
        }),
      );
    }

    const { data: savedId, error } = await restored.client.rpc(
      "save_admin_product",
      {
        p_product_id: product.productId,
        p_category: product.category,
        p_audience: product.audience,
        p_clothing_type: product.clothingType,
        p_name: product.name,
        p_slug: product.slug,
        p_brand: product.brand,
        p_description: product.description,
        p_family: product.family,
        p_volume_ml: product.volumeMl,
        p_status: product.status,
        p_is_new: product.isNew,
        p_is_featured: product.isFeatured,
        p_variants: product.variants,
      },
    );
    if (error) {
      logSafeFailure("product-save", error);
      if (error.code === "23505") {
        return responseWithSession(
          json(409, {
            error: "Já existe um produto com este nome ou código. Confira os dados.",
          }),
        );
      }
      if (error.code === "22023" || error.code === "23514") {
        return responseWithSession(
          json(400, { error: "Confira os campos e as variações do produto." }),
        );
      }
      return responseWithSession(
        json(503, { error: "Não foi possível salvar o produto. Tente novamente." }),
      );
    }

    return responseWithSession(json(200, { id: savedId }));
  } catch (error) {
    logSafeFailure("products-api", error);
    return responseWithSession(
      json(503, { error: "Não foi possível concluir a operação. Tente novamente." }),
    );
  }
};
