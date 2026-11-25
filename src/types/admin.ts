export type CatalogCategory = "perfume" | "clothing";
export type PerfumeAudience = "Masculino" | "Feminino" | "Unissex";
export type ClothingType =
  | "Blusas"
  | "Calças"
  | "Vestidos"
  | "Casacos"
  | "Saias"
  | "Acessórios"
  | "Outros";
export type ProductStatus = "draft" | "published";

export type ProductVariant = {
  id: string;
  label: string;
  sku: string | null;
  price: number;
  compare_at_price: number | null;
  stock: number;
};

export type ProductImage = {
  id: string;
  alt_text: string;
  url: string | null;
};

export type AdminProduct = {
  id: string;
  category: CatalogCategory;
  name: string;
  slug: string;
  brand: string | null;
  description: string;
  audience: PerfumeAudience | null;
  clothing_type: ClothingType | null;
  family: string | null;
  volume_ml: number | null;
  status: ProductStatus;
  is_new: boolean;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
  product_variants: ProductVariant[];
  product_images: ProductImage[];
};

export type ProductDraft = {
  category: CatalogCategory;
  name: string;
  brand: string;
  description: string;
  audience: PerfumeAudience | null;
  clothingType: ClothingType | null;
  family: string;
  volumeMl: number | null;
  status: ProductStatus;
  isNew: boolean;
  isFeatured: boolean;
  variants: Array<{
    label: string;
    sku: string | null;
    price: number;
    compareAtPrice: number | null;
    stock: number;
  }>;
};

export type AdminActivity = {
  id: number;
  action: "created" | "updated" | "deleted";
  product_name: string;
  created_at: string;
};

export type AdminAuthState = {
  state: "signed_out" | "mfa_setup" | "mfa_challenge" | "ready";
  email?: string;
  factorId?: string;
};
