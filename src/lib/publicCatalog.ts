import type { ClothingType, PerfumeAudience } from "../types/admin";
import type { CatalogCategory } from "../types/admin";

export type PublicCatalogProduct = {
  id: string;
  category: CatalogCategory;
  name: string;
  slug: string;
  brand: string | null;
  description: string;
  audience: PerfumeAudience | null;
  clothingType: ClothingType | null;
  family: string | null;
  volumeMl: number | null;
  isNew: boolean;
  isFeatured: boolean;
  variants: Array<{
    id: string;
    label: string;
    price: number;
    compare_at_price: number | null;
    stock: number;
  }>;
  images: Array<{
    id: string;
    alt_text: string;
    url: string | null;
  }>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nullableString(value: unknown): string | null {
  if (value === null || typeof value === "string") return value;
  throw new Error("O catálogo recebeu um campo de texto inválido.");
}

function optionalNumber(value: unknown): number | null {
  if (value === null) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error("O catálogo recebeu um valor numérico inválido.");
  }
  return parsed;
}

function isPerfumeAudience(value: string | null): value is PerfumeAudience {
  return value === "Masculino" || value === "Feminino" || value === "Unissex";
}

function isClothingType(value: string | null): value is ClothingType {
  return (
    value === "Blusas" ||
    value === "Calças" ||
    value === "Vestidos" ||
    value === "Casacos" ||
    value === "Saias" ||
    value === "Acessórios" ||
    value === "Outros"
  );
}

function parseProduct(value: unknown): PublicCatalogProduct {
  if (
    !isRecord(value) ||
    !Array.isArray(value.variants) ||
    value.variants.length === 0 ||
    !Array.isArray(value.images)
  ) {
    throw new Error("Não foi possível interpretar um produto do catálogo.");
  }

  if (
    typeof value.id !== "string" ||
    (value.category !== "perfume" && value.category !== "clothing") ||
    typeof value.name !== "string" ||
    typeof value.slug !== "string" ||
    typeof value.description !== "string" ||
    typeof value.isNew !== "boolean" ||
    typeof value.isFeatured !== "boolean"
  ) {
    throw new Error("O catálogo recebeu informações incompletas de um produto.");
  }

  const variants = value.variants.map((rawVariant) => {
    if (
      !isRecord(rawVariant) ||
      typeof rawVariant.id !== "string" ||
      typeof rawVariant.label !== "string"
    ) {
      throw new Error("O catálogo recebeu uma variação inválida.");
    }
    const price = optionalNumber(rawVariant.price);
    const compareAtPrice = optionalNumber(rawVariant.compare_at_price);
    const stock = optionalNumber(rawVariant.stock);
    if (
      price === null ||
      price <= 0 ||
      stock === null ||
      !Number.isInteger(stock) ||
      stock < 0
    ) {
      throw new Error("O catálogo recebeu preço ou estoque inválido.");
    }
    return {
      id: rawVariant.id,
      label: rawVariant.label,
      price,
      compare_at_price: compareAtPrice,
      stock,
    };
  });

  const images = value.images.map((rawImage) => {
    if (
      !isRecord(rawImage) ||
      typeof rawImage.id !== "string" ||
      typeof rawImage.alt_text !== "string"
    ) {
      throw new Error("O catálogo recebeu uma imagem inválida.");
    }
    return {
      id: rawImage.id,
      alt_text: rawImage.alt_text,
      url: nullableString(rawImage.url),
    };
  });
  const audienceValue = nullableString(value.audience);
  const clothingTypeValue = nullableString(value.clothingType);
  let audience: PerfumeAudience | null = null;
  let clothingType: ClothingType | null = null;
  if (value.category === "perfume") {
    if (!isPerfumeAudience(audienceValue) || clothingTypeValue !== null) {
      throw new Error("O catálogo recebeu uma categoria de produto inválida.");
    }
    audience = audienceValue;
  } else {
    if (audienceValue !== null || !isClothingType(clothingTypeValue)) {
      throw new Error("O catálogo recebeu uma categoria de produto inválida.");
    }
    clothingType = clothingTypeValue;
  }

  return {
    id: value.id,
    category: value.category,
    name: value.name,
    slug: value.slug,
    brand: nullableString(value.brand),
    description: value.description,
    audience,
    clothingType,
    family: nullableString(value.family),
    volumeMl: optionalNumber(value.volumeMl),
    isNew: value.isNew,
    isFeatured: value.isFeatured,
    variants,
    images,
  };
}

export async function fetchPublicCatalog(
  category: "perfumes" | "roupas",
): Promise<{ configured: boolean; products: PublicCatalogProduct[] }> {
  const response = await fetch(
    `/.netlify/functions/catalog?category=${category}`,
    { cache: "no-store" },
  );
  if (!response.ok) {
    throw new Error("Não foi possível carregar os produtos. Tente novamente.");
  }
  if (!response.headers.get("content-type")?.includes("application/json")) {
    if (import.meta.env.DEV) {
      return { configured: false, products: [] };
    }
    throw new Error("O serviço do catálogo retornou uma resposta inválida.");
  }

  const body: unknown = await response.json();
  if (
    !isRecord(body) ||
    typeof body.configured !== "boolean" ||
    !Array.isArray(body.products)
  ) {
    throw new Error("O catálogo recebeu uma resposta inválida.");
  }

  return {
    configured: body.configured,
    products: body.products.map(parseProduct),
  };
}
