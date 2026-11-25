import type { Handler } from "@netlify/functions";
import { createSupabaseClient, getServiceConfig } from "./_shared/supabase";
import { json, logSafeFailure } from "./_shared/http";

const categoryMap: Record<string, "perfume" | "clothing"> = {
  perfumes: "perfume",
  roupas: "clothing",
};

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return json(405, { error: "Ação não permitida." }, { Allow: "GET" });
  }
  const category = event.queryStringParameters?.category ?? "";
  const databaseCategory = categoryMap[category];
  if (!databaseCategory) {
    return json(400, { error: "Categoria não reconhecida." });
  }

  const config = getServiceConfig();
  const client = createSupabaseClient(config);
  if (!config || !client) {
    return json(
      200,
      { configured: false, products: [] },
      { "Cache-Control": "no-store" },
    );
  }

  try {
    const { data: products, error } = await client
      .from("products")
      .select(
        "id,category,name,slug,brand,description,audience,clothing_type,family,volume_ml,is_new,is_featured,product_variants(id,label,sku,price,compare_at_price,stock),product_images(id,storage_path,alt_text,sort_order)",
      )
      .eq("category", databaseCategory)
      .eq("status", "published")
      .order("is_featured", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) {
      logSafeFailure("public-catalog", error);
      return json(503, { error: "Não foi possível carregar o catálogo." });
    }

    const paths = (products ?? []).flatMap((product) =>
      (product.product_images ?? []).map(
        (image: { storage_path: string }) => image.storage_path,
      ),
    );
    const signedUrls = new Map<string, string>();
    if (paths.length > 0) {
      const { data, error: signingError } = await client.storage
        .from("product-images")
        .createSignedUrls(paths, 900);
      if (signingError) {
        logSafeFailure("public-catalog-images", signingError);
        return json(503, {
          error: "Não foi possível carregar as fotos do catálogo.",
        });
      }
      for (const item of data ?? []) {
        if (item.path && item.signedUrl) {
          signedUrls.set(item.path, item.signedUrl);
        }
      }
    }

    const result = (products ?? []).map((product) => ({
      id: product.id,
      category: product.category,
      name: product.name,
      slug: product.slug,
      brand: product.brand,
      description: product.description,
      audience: product.audience,
      clothingType: product.clothing_type,
      family: product.family,
      volumeMl: product.volume_ml,
      isNew: product.is_new,
      isFeatured: product.is_featured,
      variants: [...(product.product_variants ?? [])].sort((a, b) =>
        a.label.localeCompare(b.label, "pt-BR"),
      ),
      images: [...(product.product_images ?? [])]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map(({ storage_path, ...image }) => ({
          ...image,
          url: signedUrls.get(storage_path) ?? null,
        })),
    }));

    return json(
      200,
      { configured: true, products: result },
      { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" },
    );
  } catch (error) {
    logSafeFailure("public-catalog", error);
    return json(503, { error: "Não foi possível carregar o catálogo." });
  }
};
