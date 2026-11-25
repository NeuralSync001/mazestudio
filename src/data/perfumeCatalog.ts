export type PerfumeCategory = "Masculino" | "Feminino" | "Unissex";

export type PerfumeProduct = {
  id: string;
  name: string;
  brand: string;
  category: PerfumeCategory;
  price: number;
  previousPrice?: number;
  family: string | null;
  volumeMl: number | null;
  description: string;
  isNew: boolean;
  isFeatured: boolean;
  artwork: number;
  isDemo: boolean;
  photoUrl?: string | null;
  photoAlt?: string;
  variants?: Array<{
    id: string;
    label: string;
    price: number;
    previousPrice: number | null;
    stock: number;
  }>;
};

const demoDescription =
  "Texto de demonstração. Substitua pela descrição oficial do produto.";

export const perfumeCatalog: PerfumeProduct[] = [
  {
    id: "noir-01",
    name: "NOIR Nº 01",
    brand: "ATELIER DEMONSTRATIVO",
    category: "Masculino",
    price: 389,
    previousPrice: 459,
    family: null,
    volumeMl: null,
    description: demoDescription,
    isNew: false,
    isFeatured: true,
    artwork: 0,
    isDemo: true,
  },
  {
    id: "velvet-02",
    name: "VELVET Nº 02",
    brand: "MAISON DEMONSTRATIVA",
    category: "Feminino",
    price: 329,
    family: null,
    volumeMl: null,
    description: demoDescription,
    isNew: true,
    isFeatured: true,
    artwork: 1,
    isDemo: true,
  },
  {
    id: "after-03",
    name: "AFTER Nº 03",
    brand: "ATELIER DEMONSTRATIVO",
    category: "Unissex",
    price: 419,
    previousPrice: 489,
    family: null,
    volumeMl: null,
    description: demoDescription,
    isNew: false,
    isFeatured: true,
    artwork: 2,
    isDemo: true,
  },
  {
    id: "rose-04",
    name: "ROSE Nº 04",
    brand: "MAISON DEMONSTRATIVA",
    category: "Feminino",
    price: 359,
    family: null,
    volumeMl: null,
    description: demoDescription,
    isNew: true,
    isFeatured: false,
    artwork: 3,
    isDemo: true,
  },
  {
    id: "ombre-05",
    name: "OMBRE Nº 05",
    brand: "CASA DEMONSTRATIVA",
    category: "Masculino",
    price: 379,
    family: null,
    volumeMl: null,
    description: demoDescription,
    isNew: false,
    isFeatured: false,
    artwork: 4,
    isDemo: true,
  },
  {
    id: "silk-06",
    name: "SILK Nº 06",
    brand: "CASA DEMONSTRATIVA",
    category: "Unissex",
    price: 299,
    previousPrice: 349,
    family: null,
    volumeMl: null,
    description: demoDescription,
    isNew: true,
    isFeatured: false,
    artwork: 5,
    isDemo: true,
  },
];

export const demoBrands = [
  "ATELIER DEMONSTRATIVO",
  "MAISON DEMONSTRATIVA",
  "CASA DEMONSTRATIVA",
];

export const demoCatalogNotice =
  "Catálogo demonstrativo: nomes, marcas, ilustrações e valores são fictícios.";
