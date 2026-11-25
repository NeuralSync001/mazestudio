import {
  Component,
  Suspense,
  lazy,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ErrorInfo, ReactNode } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  Heart,
  Menu,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  demoBrands,
  demoCatalogNotice,
  perfumeCatalog,
} from "../data/perfumeCatalog";
import type {
  PerfumeCategory,
  PerfumeProduct,
} from "../data/perfumeCatalog";
import {
  fetchPublicCatalog,
  type PublicCatalogProduct,
} from "../lib/publicCatalog";
import "./PerfumeStorePage.css";

const PerfumeCanvas = lazy(() => import("../components/perfume/PerfumeCanvas"));

type CatalogFilter =
  | "Todos"
  | PerfumeCategory
  | "Lançamentos"
  | "Ofertas";
type StorePanel = "cart" | "favorites" | null;
type CartState = Record<string, number>;
type PerfumeVariant = NonNullable<PerfumeProduct["variants"]>[number];

const getCartKey = (product: PerfumeProduct, variant?: PerfumeVariant) =>
  variant ? `${product.id}::${variant.id}` : product.id;

function mapCatalogProduct(product: PublicCatalogProduct): PerfumeProduct {
  const variants = product.variants.map((variant) => ({
    id: variant.id,
    label: variant.label,
    price: variant.price,
    previousPrice: variant.compare_at_price,
    stock: variant.stock,
  }));
  const firstVariant = [...variants].sort((a, b) => a.price - b.price)[0];
  if (!firstVariant) {
    throw new Error(`O produto ${product.name} não possui variações publicadas.`);
  }
  if (!product.audience) {
    throw new Error(`O produto ${product.name} não possui categoria definida.`);
  }

  return {
    id: product.id,
    name: product.name,
    brand: product.brand ?? "",
    category: product.audience,
    price: firstVariant.price,
    previousPrice: firstVariant.previousPrice ?? undefined,
    family: product.family,
    volumeMl: product.volumeMl,
    description: product.description,
    isNew: product.isNew,
    isFeatured: product.isFeatured,
    artwork: 0,
    isDemo: false,
    photoUrl: product.images[0]?.url ?? null,
    photoAlt: product.images[0]?.alt_text,
    variants,
  };
}

const filters: CatalogFilter[] = [
  "Todos",
  "Masculino",
  "Feminino",
  "Unissex",
  "Lançamentos",
  "Ofertas",
];

const formatPrice = (price: number) =>
  new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency",
  }).format(price);

class SceneErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("A visualização 3D do perfume não pôde ser carregada.", error, info);
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

function DemoBottleArtwork({
  index,
  className = "",
}: {
  index: number;
  className?: string;
}) {
  const safeIndex = ((index % 6) + 6) % 6;
  const id = `bottle-${safeIndex}`;
  const silhouettes = [
    "M103 112h74a10 10 0 0 1 10 10v150a19 19 0 0 1-19 19h-56a19 19 0 0 1-19-19V122a10 10 0 0 1 10-10Z",
    "M140 107c-29 0-48 18-48 45v108c0 21 18 37 40 37h16c22 0 40-16 40-37V152c0-27-19-45-48-45Z",
    "M116 112h48a15 15 0 0 1 15 15v143a20 20 0 0 1-20 20h-38a20 20 0 0 1-20-20V127a15 15 0 0 1 15-15Z",
    "M140 105c-34 0-54 15-54 43v108c0 24 22 39 54 39s54-15 54-39V148c0-28-20-43-54-43Z",
    "M108 119h64a20 20 0 0 1 20 20v132a21 21 0 0 1-21 21h-62a21 21 0 0 1-21-21V139a20 20 0 0 1 20-20Z",
    "M140 108c-26 0-43 16-43 41v113c0 20 18 34 43 34s43-14 43-34V149c0-25-17-41-43-41Z",
  ];
  const accentColors = [
    "#EC78B8",
    "#C94E91",
    "#F5A7D1",
    "#A83B76",
    "#D96AA8",
    "#9D4A77",
  ];

  return (
    <svg
      aria-hidden="true"
      className={`perfume-demo-art ${className}`}
      fill="none"
      viewBox="0 0 280 360"
    >
      <defs>
        <linearGradient id={`${id}-glass`} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#383039" />
          <stop offset=".34" stopColor="#0E0C10" />
          <stop offset=".72" stopColor="#181118" />
          <stop offset="1" stopColor="#050506" />
        </linearGradient>
        <linearGradient id={`${id}-edge`} x1="0" x2="1" y1="0" y2="0">
          <stop stopColor={accentColors[safeIndex]} stopOpacity=".08" />
          <stop offset=".16" stopColor={accentColors[safeIndex]} stopOpacity=".82" />
          <stop offset=".3" stopColor="#fff" stopOpacity=".18" />
          <stop offset=".68" stopColor="#fff" stopOpacity=".03" />
          <stop offset=".96" stopColor={accentColors[safeIndex]} stopOpacity=".42" />
          <stop offset="1" stopColor={accentColors[safeIndex]} stopOpacity=".05" />
        </linearGradient>
        <linearGradient id={`${id}-cap`} x1="0" x2="1" y1="0" y2="1">
          <stop stopColor="#55505A" />
          <stop offset=".46" stopColor="#17141A" />
          <stop offset="1" stopColor="#050506" />
        </linearGradient>
        <radialGradient id={`${id}-halo`} cx="50%" cy="48%" r="52%">
          <stop stopColor={accentColors[safeIndex]} stopOpacity=".24" />
          <stop offset="1" stopColor={accentColors[safeIndex]} stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="140" cy="320" fill="#000" opacity=".8" rx="73" ry="15" />
      <ellipse cx="140" cy="193" fill={`url(#${id}-halo)`} rx="115" ry="150" />
      <rect
        fill={`url(#${id}-cap)`}
        height={safeIndex % 2 === 0 ? 37 : 45}
        rx={safeIndex === 3 ? 9 : 5}
        stroke="#FFFFFF"
        strokeOpacity=".12"
        width={safeIndex === 0 ? 47 : 54}
        x={safeIndex === 0 ? 116.5 : 113}
        y="49"
      />
      <path
        d="M119 88h42v24h-42z"
        fill={`url(#${id}-glass)`}
        stroke={`url(#${id}-edge)`}
        strokeWidth="2"
      />
      <path
        d={silhouettes[safeIndex]}
        fill={`url(#${id}-glass)`}
        stroke={`url(#${id}-edge)`}
        strokeWidth="2.2"
      />
      <path
        d={safeIndex % 2 === 0 ? "M111 128v128" : "M108 153v98"}
        stroke="#FFFFFF"
        strokeLinecap="round"
        strokeOpacity=".2"
        strokeWidth="2"
      />
      <path
        d="M179 129v120"
        stroke={accentColors[safeIndex]}
        strokeLinecap="round"
        strokeOpacity=".43"
        strokeWidth="1.5"
      />
      <rect
        fill="#0B090D"
        fillOpacity=".75"
        height="59"
        rx="2"
        stroke={accentColors[safeIndex]}
        strokeOpacity=".38"
        width="65"
        x="107.5"
        y="170"
      />
      <text
        fill="#F5F1F5"
        fontFamily="Kanit, sans-serif"
        fontSize="12"
        letterSpacing="2"
        textAnchor="middle"
        x="140"
        y="194"
      >
        MAZÉ
      </text>
      <text
        fill={accentColors[safeIndex]}
        fontFamily="Kanit, sans-serif"
        fontSize="7"
        letterSpacing="2"
        textAnchor="middle"
        x="140"
        y="211"
      >
        DEMO
      </text>
    </svg>
  );
}

function ProductArtwork({
  product,
  className = "",
}: {
  product: PerfumeProduct;
  className?: string;
}) {
  if (!product.photoUrl) {
    return <DemoBottleArtwork className={className} index={product.artwork} />;
  }
  return (
    <img
      alt={product.photoAlt || `Foto de ${product.name}`}
      className={`perfume-product-photo ${className}`}
      loading="lazy"
      src={product.photoUrl}
    />
  );
}

function PerfumeHeader({
  activeFilter,
  cartCount,
  favoritesCount,
  isScrolled,
  mobileMenuOpen,
  onFilter,
  onOpenPanel,
  onSearchToggle,
  onToggleMobileMenu,
  onScrollTo,
  searchOpen,
  searchQuery,
  onSearchQuery,
}: {
  activeFilter: CatalogFilter;
  cartCount: number;
  favoritesCount: number;
  isScrolled: boolean;
  mobileMenuOpen: boolean;
  onFilter: (filter: CatalogFilter) => void;
  onOpenPanel: (panel: Exclude<StorePanel, null>) => void;
  onSearchToggle: () => void;
  onToggleMobileMenu: () => void;
  onScrollTo: (id: string) => void;
  searchOpen: boolean;
  searchQuery: string;
  onSearchQuery: (query: string) => void;
}) {
  const selectCategory = (filter: CatalogFilter) => {
    onFilter(filter);
    onScrollTo("colecao");
  };

  return (
    <header className={`perfume-header ${isScrolled ? "is-scrolled" : ""}`}>
      <div className="perfume-header__main">
        <Link
          aria-label="Mazé Parfums — voltar ao Espaço da Mazé"
          className="perfume-brand"
          to="/"
        >
          <span className="perfume-brand__mark">M</span>
          <span className="perfume-brand__text">
            <span>MAZÉ</span>
            <span>PARFUMS</span>
          </span>
        </Link>

        <nav aria-label="Categorias de perfumes" className="perfume-nav">
          <button onClick={() => onScrollTo("inicio")} type="button">
            Início
          </button>
          {(["Masculino", "Feminino", "Unissex"] as const).map((category) => (
            <button
              aria-pressed={activeFilter === category}
              key={category}
              onClick={() => selectCategory(category)}
              type="button"
            >
              {category === "Masculino"
                ? "Masculinos"
                : category === "Feminino"
                  ? "Femininos"
                  : category}
            </button>
          ))}
          <button onClick={() => onScrollTo("marcas")} type="button">
            Marcas
          </button>
          <button
            aria-pressed={activeFilter === "Ofertas"}
            onClick={() => selectCategory("Ofertas")}
            type="button"
          >
            Ofertas
          </button>
        </nav>

        <div className="perfume-header__actions">
          <button
            aria-expanded={searchOpen}
            aria-label={searchOpen ? "Fechar busca" : "Buscar perfumes"}
            className="perfume-icon-button"
            onClick={onSearchToggle}
            type="button"
          >
            {searchOpen ? <X size={18} /> : <Search size={18} />}
          </button>
          <button
            aria-label={`Favoritos, ${favoritesCount} itens`}
            className="perfume-icon-button perfume-icon-button--desktop"
            onClick={() => onOpenPanel("favorites")}
            type="button"
          >
            <Heart size={18} />
            {favoritesCount > 0 && (
              <span className="perfume-count">{favoritesCount}</span>
            )}
          </button>
          <button
            aria-label={`Sacola de compras, ${cartCount} itens`}
            className="perfume-icon-button perfume-icon-button--bag"
            onClick={() => onOpenPanel("cart")}
            type="button"
          >
            <ShoppingBag size={18} />
            <span className="perfume-count">{cartCount}</span>
          </button>
          <button
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? "Fechar menu" : "Abrir menu"}
            className="perfume-icon-button perfume-menu-toggle"
            onClick={onToggleMobileMenu}
            type="button"
          >
            {mobileMenuOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {searchOpen && (
          <motion.form
            animate={{ opacity: 1, y: 0 }}
            className="perfume-search"
            exit={{ opacity: 0, y: -8 }}
            initial={{ opacity: 0, y: -8 }}
            onSubmit={(event) => {
              event.preventDefault();
              onScrollTo("colecao");
            }}
          >
            <Search aria-hidden="true" size={16} />
            <input
              aria-label="Buscar por perfume ou marca"
              autoFocus
              onChange={(event) => onSearchQuery(event.target.value)}
              placeholder="Buscar por perfume ou marca"
              value={searchQuery}
            />
            <button type="submit">Buscar</button>
          </motion.form>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {mobileMenuOpen && (
          <motion.nav
            animate={{ opacity: 1, height: "auto" }}
            aria-label="Menu de perfumes"
            className="perfume-mobile-menu"
            exit={{ opacity: 0, height: 0 }}
            initial={{ opacity: 0, height: 0 }}
          >
            <button onClick={() => onScrollTo("inicio")} type="button">
              Início
            </button>
            {filters.slice(1).map((filter) => (
              <button
                aria-pressed={activeFilter === filter}
                key={filter}
                onClick={() => selectCategory(filter)}
                type="button"
              >
                {filter}
              </button>
            ))}
            <button onClick={() => onScrollTo("marcas")} type="button">
              Marcas
            </button>
            <button
              onClick={() => {
                onOpenPanel("favorites");
                onToggleMobileMenu();
              }}
              type="button"
            >
              Favoritos ({favoritesCount})
            </button>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}

function ProductCard({
  added,
  index,
  onAdd,
  onFavorite,
  onOpen,
  product,
  reducedMotion,
  isFavorite,
}: {
  added: boolean;
  index: number;
  onAdd: () => void;
  onFavorite: () => void;
  onOpen: () => void;
  product: PerfumeProduct;
  reducedMotion: boolean;
  isFavorite: boolean;
}) {
  const discount = product.previousPrice
    ? Math.round((1 - product.price / product.previousPrice) * 100)
    : null;

  return (
    <motion.article
      className="perfume-product-card"
      initial={reducedMotion ? false : { opacity: 0, y: 22 }}
      transition={{
        delay: Math.min(index * 0.06, 0.24),
        duration: 0.68,
        ease: [0.22, 1, 0.36, 1],
      }}
      viewport={{ once: true, amount: 0.12 }}
      whileInView={{ opacity: 1, y: 0 }}
    >
      <div className="perfume-product-card__media">
        <button
          aria-label={`Ver detalhes de ${product.name}`}
          className="perfume-product-card__image-button"
          onClick={onOpen}
          type="button"
        >
          <ProductArtwork product={product} />
        </button>
        <div className="perfume-product-card__badges">
          {discount && <span>{product.isDemo ? "OFERTA DEMO" : "OFERTA"} · {discount}%</span>}
          {product.isNew && <span>{product.isDemo ? "NOVO · DEMO" : "NOVO"}</span>}
          {product.variants?.every((variant) => variant.stock === 0) && (
            <span>ESGOTADO</span>
          )}
        </div>
        <button
          aria-label={
            isFavorite
              ? `Remover ${product.name} dos favoritos`
              : `Adicionar ${product.name} aos favoritos`
          }
          aria-pressed={isFavorite}
          className={`perfume-favorite-button ${isFavorite ? "is-active" : ""}`}
          onClick={(event) => {
            event.stopPropagation();
            onFavorite();
          }}
          type="button"
        >
          <Heart fill={isFavorite ? "currentColor" : "none"} size={17} />
        </button>
        <span className="perfume-product-card__art-note">
          {product.isDemo
            ? "IMAGEM DEMO"
            : product.photoUrl
              ? "FOTO DO PRODUTO"
              : "FOTO NÃO CADASTRADA"}
        </span>
      </div>
      <div className="perfume-product-card__info">
        <div className="perfume-product-card__eyebrow">
          <span>{product.category}</span>
          <span>{product.brand || "Marca não informada"}</span>
        </div>
        <button
          className="perfume-product-card__name"
          onClick={onOpen}
          type="button"
        >
          {product.name}
          <ArrowUpRight aria-hidden="true" size={15} />
        </button>
        <div className="perfume-product-card__price">
          <strong>
            {product.variants?.length ? "A partir de " : ""}
            {formatPrice(product.price)}
          </strong>
          {product.previousPrice && (
            <del>{formatPrice(product.previousPrice)}</del>
          )}
          <span>{product.isDemo ? "VALORES DEMONSTRATIVOS" : "PREÇO CADASTRADO"}</span>
        </div>
        <button
          className={`perfume-add-button ${added ? "is-added" : ""}`}
          disabled={
            Boolean(
              product.variants?.length &&
                product.variants.every((variant) => variant.stock === 0),
            )
          }
          onClick={(event) => {
            event.stopPropagation();
            onAdd();
          }}
          type="button"
        >
          {added ? <Check size={16} /> : <ShoppingBag size={16} />}
          {added ? "Adicionado" : product.variants && product.variants.length > 1
            ? "Escolher variação"
            : "Adicionar à sacola"}
        </button>
      </div>
    </motion.article>
  );
}

type CartLine = {
  key: string;
  product: PerfumeProduct;
  variant?: PerfumeVariant;
  quantity: number;
  price: number;
};

function CartPanel({
  cart,
  checkoutStarted,
  favoriteProducts,
  mode,
  products,
  onAdd,
  onCheckout,
  onClose,
  onOpenProduct,
  onRemove,
  onSetMode,
  onUpdateQuantity,
}: {
  cart: CartState;
  checkoutStarted: boolean;
  favoriteProducts: PerfumeProduct[];
  mode: Exclude<StorePanel, null>;
  products: PerfumeProduct[];
  onAdd: (product: PerfumeProduct, amount?: number, variant?: PerfumeVariant) => void;
  onCheckout: () => void;
  onClose: () => void;
  onOpenProduct: (product: PerfumeProduct) => void;
  onRemove: (id: string) => void;
  onSetMode: (mode: Exclude<StorePanel, null>) => void;
  onUpdateQuantity: (id: string, delta: number) => void;
}) {
  const cartItems: CartLine[] = products.flatMap((product) => {
    if (product.variants?.length) {
      return product.variants.flatMap((variant) => {
        const key = getCartKey(product, variant);
        const quantity = cart[key] ?? 0;
        return quantity > 0
          ? [{ key, product, variant, quantity, price: variant.price }]
          : [];
      });
    }
    const quantity = cart[product.id] ?? 0;
    return quantity > 0
      ? [{ key: product.id, product, quantity, price: product.price }]
      : [];
  });
  const subtotal = cartItems.reduce(
    (total, item) => total + item.price * item.quantity,
    0,
  );
  const isCart = mode === "cart";

  return (
    <motion.div
      animate={{ opacity: 1 }}
      className="perfume-overlay"
      exit={{ opacity: 0 }}
      initial={{ opacity: 0 }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <motion.aside
        animate={{ x: 0 }}
        aria-labelledby={isCart ? "perfume-cart-title" : "perfume-favorites-title"}
        aria-modal="true"
        className="perfume-drawer"
        exit={{ x: "100%" }}
        initial={{ x: "100%" }}
        role="dialog"
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="perfume-drawer__head">
          <div>
            <p className="perfume-kicker">MAZÉ / PARFUMS</p>
            <h2 id={isCart ? "perfume-cart-title" : "perfume-favorites-title"}>
              {isCart ? "Sua sacola" : "Seus favoritos"}
            </h2>
          </div>
          <button
            aria-label="Fechar painel"
            className="perfume-icon-button"
            onClick={onClose}
            type="button"
          >
            <X size={19} />
          </button>
        </div>

        <div className="perfume-drawer__tabs">
          <button
            aria-pressed={isCart}
            onClick={() => onSetMode("cart")}
            type="button"
          >
            Sacola ({Object.values(cart).reduce((sum, qty) => sum + qty, 0)})
          </button>
          <button
            aria-pressed={!isCart}
            onClick={() => onSetMode("favorites")}
            type="button"
          >
            Favoritos ({favoriteProducts.length})
          </button>
        </div>

        {!isCart && (
          <div className="perfume-drawer__items">
            {favoriteProducts.length === 0 ? (
              <div className="perfume-empty-state">
                <Heart size={24} />
                <p>Seus favoritos aparecem aqui.</p>
                <span>Guarde os itens que deseja rever.</span>
              </div>
            ) : (
              favoriteProducts.map((product) => (
                <div className="perfume-drawer-item" key={product.id}>
                  <button
                    className="perfume-drawer-item__art"
                    onClick={() => onOpenProduct(product)}
                    type="button"
                  >
                    <ProductArtwork product={product} />
                  </button>
                  <div className="perfume-drawer-item__copy">
                    <span>{product.brand || "Marca não informada"}</span>
                    <button
                      className="perfume-drawer-item__name"
                      onClick={() => onOpenProduct(product)}
                      type="button"
                    >
                      {product.name}
                    </button>
                    <strong>{formatPrice(product.price)}</strong>
                    {!product.variants?.every((variant) => variant.stock === 0) && (
                      <button
                        className="perfume-text-link"
                        onClick={() => onAdd(product)}
                        type="button"
                      >
                        Adicionar à sacola <ArrowRight size={13} />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {isCart && (
          <>
            <div className="perfume-drawer__items">
              {cartItems.length === 0 ? (
                <div className="perfume-empty-state">
                  <ShoppingBag size={24} />
                  <p>Sua sacola está vazia.</p>
                  <span>Explore a coleção para adicionar itens.</span>
                  <button className="perfume-text-link" onClick={onClose} type="button">
                    Continuar explorando <ArrowRight size={13} />
                  </button>
                </div>
              ) : (
                cartItems.map(({ key, product, variant, quantity, price }) => (
                    <div className="perfume-drawer-item" key={key}>
                    <button
                      className="perfume-drawer-item__art"
                      onClick={() => onOpenProduct(product)}
                      type="button"
                    >
                      <ProductArtwork product={product} />
                    </button>
                    <div className="perfume-drawer-item__copy">
                      <span>{product.brand || "Marca não informada"}</span>
                      <button
                        className="perfume-drawer-item__name"
                        onClick={() => onOpenProduct(product)}
                        type="button"
                      >
                        {product.name}
                      </button>
                      {variant && <span>{variant.label}</span>}
                      <strong>{formatPrice(price)}</strong>
                      <div className="perfume-quantity-control">
                        <button
                          aria-label={`Diminuir quantidade de ${product.name}`}
                          onClick={() => onUpdateQuantity(key, -1)}
                          type="button"
                        >
                          <Minus size={13} />
                        </button>
                        <span>{quantity}</span>
                        <button
                          aria-label={`Aumentar quantidade de ${product.name}`}
                          disabled={variant ? quantity >= variant.stock : false}
                          onClick={() => onUpdateQuantity(key, 1)}
                          type="button"
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                    </div>
                    <button
                      aria-label={`Remover ${product.name} da sacola`}
                      className="perfume-remove-button"
                      onClick={() => onRemove(key)}
                      type="button"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {cartItems.length > 0 && (
              <div className="perfume-cart-summary">
                {checkoutStarted ? (
                  <div className="perfume-checkout-note" role="status">
                    <Check size={18} />
                    <strong>Etapa de finalização preparada</strong>
                    <p>
                      O checkout e o provedor de pagamento ainda precisam ser
                      integrados. Nenhuma transação será processada.
                    </p>
                    <button onClick={onCheckout} type="button">
                      Voltar à sacola
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="perfume-cart-summary__line">
                      <span>Subtotal</span>
                      <strong>{formatPrice(subtotal)}</strong>
                    </div>
                    <div className="perfume-cart-summary__line">
                      <span>Entrega</span>
                      <span>A definir</span>
                    </div>
                    <div className="perfume-cart-summary__line is-total">
                      <span>Total estimado</span>
                      <strong>{formatPrice(subtotal)}</strong>
                    </div>
                    <p className="perfume-cart-disclaimer">
                      Valores sem frete. O checkout e o pagamento ainda não estão integrados.
                    </p>
                    <button
                      className="perfume-primary-button perfume-checkout-button"
                      onClick={onCheckout}
                      type="button"
                    >
                      Prosseguir para finalização
                      <ArrowRight size={16} />
                    </button>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </motion.aside>
    </motion.div>
  );
}

function ProductDetail({
  onAdd,
  onClose,
  onOpenRelated,
  product,
  products,
  reducedMotion,
}: {
  onAdd: (product: PerfumeProduct, amount: number, variant?: PerfumeVariant) => void;
  onClose: () => void;
  onOpenRelated: (product: PerfumeProduct) => void;
  product: PerfumeProduct;
  products: PerfumeProduct[];
  reducedMotion: boolean;
}) {
  const [quantity, setQuantity] = useState(1);
  const [selectedVariantId, setSelectedVariantId] = useState(
    product.variants?.[0]?.id ?? "",
  );
  const related = products.filter((item) => item.id !== product.id).slice(0, 3);
  const selectedVariant = product.variants?.find(
    (variant) => variant.id === selectedVariantId,
  );
  const displayPrice = selectedVariant?.price ?? product.price;
  const previousPrice =
    selectedVariant?.previousPrice ?? product.previousPrice ?? null;

  useEffect(() => {
    setQuantity(1);
    setSelectedVariantId(product.variants?.[0]?.id ?? "");
  }, [product]);
  useEffect(() => {
    if (selectedVariant && quantity > selectedVariant.stock) {
      setQuantity(Math.max(1, selectedVariant.stock));
    }
  }, [quantity, selectedVariant]);

  return (
    <motion.div
      animate={{ opacity: 1 }}
      className="perfume-overlay perfume-overlay--center"
      exit={{ opacity: 0 }}
      initial={{ opacity: 0 }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <motion.section
        aria-labelledby="perfume-detail-title"
        aria-modal="true"
        className="perfume-detail-dialog"
        animate={{ opacity: 1, y: 0, scale: 1 }}
        initial={reducedMotion ? false : { opacity: 0, y: 18, scale: 0.98 }}
        role="dialog"
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <button
          aria-label="Fechar detalhes"
          className="perfume-detail-close perfume-icon-button"
          onClick={onClose}
          type="button"
        >
          <X size={19} />
        </button>
        <div className="perfume-detail-grid">
          <div className="perfume-detail-art">
            <span>
              {product.isDemo
                ? "ILUSTRAÇÃO DE DEMONSTRAÇÃO"
                : product.photoUrl
                  ? "FOTO DO PRODUTO"
                  : "FOTO NÃO CADASTRADA"}
            </span>
            <ProductArtwork
              className="perfume-detail-art__bottle"
              product={product}
            />
          </div>
          <div className="perfume-detail-copy">
            <p className="perfume-kicker">{product.brand || "Marca não informada"}</p>
            <p className="perfume-detail-category">
              {product.category}
              {product.isDemo ? " · CATÁLOGO DEMONSTRATIVO" : ""}
            </p>
            <h2 id="perfume-detail-title">{product.name}</h2>
            <p className="perfume-detail-price">
              {formatPrice(displayPrice)}
              {previousPrice !== null && <del>{formatPrice(previousPrice)}</del>}
            </p>
            <span className="perfume-demo-price-label">
              {product.isDemo ? "VALOR FICTÍCIO PARA DEMONSTRAÇÃO" : "PREÇO CADASTRADO"}
            </span>
            {product.variants && product.variants.length > 1 && (
              <label className="perfume-variant-select">
                <span>Tamanho ou volume</span>
                <select
                  onChange={(event) => setSelectedVariantId(event.target.value)}
                  value={selectedVariantId}
                >
                  {product.variants.map((variant) => (
                    <option key={variant.id} value={variant.id}>
                      {variant.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <p className="perfume-detail-description">
              {product.description || "Descrição não cadastrada."}
            </p>
            <dl className="perfume-detail-data">
              <div>
                <dt>Família olfativa</dt>
                <dd>{product.family ?? "Não informada"}</dd>
              </div>
              <div>
                <dt>Volume</dt>
                <dd>
                  {selectedVariant?.label ??
                    (product.volumeMl ? `${product.volumeMl} ml` : "Não informado")}
                </dd>
              </div>
              <div>
                <dt>Entrega</dt>
                <dd>Informações a cadastrar</dd>
              </div>
              {selectedVariant && (
                <div>
                  <dt>Disponibilidade</dt>
                  <dd>
                    {selectedVariant.stock > 0
                      ? `${selectedVariant.stock} unidade${selectedVariant.stock === 1 ? "" : "s"}`
                      : "Indisponível"}
                  </dd>
                </div>
              )}
            </dl>
            <div className="perfume-detail-buy-row">
              <div className="perfume-quantity-control">
                <button
                  aria-label="Diminuir quantidade"
                  disabled={quantity <= 1}
                  onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                  type="button"
                >
                  <Minus size={14} />
                </button>
                <span>{quantity}</span>
                <button
                  aria-label="Aumentar quantidade"
                  disabled={
                    selectedVariant
                      ? quantity >= selectedVariant.stock
                      : false
                  }
                  onClick={() => setQuantity((value) => value + 1)}
                  type="button"
                >
                  <Plus size={14} />
                </button>
              </div>
              <button
                className="perfume-primary-button"
                disabled={selectedVariant?.stock === 0}
                onClick={() => onAdd(product, quantity, selectedVariant)}
                type="button"
              >
                <ShoppingBag size={16} />
                Adicionar à sacola
              </button>
            </div>
            <p className="perfume-detail-note">
              {product.isDemo
                ? "Item demonstrativo. Cadastro, disponibilidade e pagamento reais ainda não foram conectados."
                : "A sacola é demonstrativa; disponibilidade, checkout e pagamento ainda precisam ser confirmados."}
            </p>
          </div>
        </div>
        <div className="perfume-related">
          <p>Continue explorando</p>
          <div>
            {related.map((item) => (
              <button
                key={item.id}
                onClick={() => onOpenRelated(item)}
                type="button"
              >
                {item.name} <ArrowUpRight size={13} />
              </button>
            ))}
          </div>
        </div>
      </motion.section>
    </motion.div>
  );
}

export function PerfumeStorePage() {
  const reducedMotion = useReducedMotion() ?? false;
  const heroRef = useRef<HTMLElement>(null);
  const feedbackTimer = useRef<number | null>(null);
  const [filter, setFilter] = useState<CatalogFilter>("Todos");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [panel, setPanel] = useState<StorePanel>(null);
  const [activeProduct, setActiveProduct] = useState<PerfumeProduct | null>(null);
  const [cart, setCart] = useState<CartState>({});
  const [favorites, setFavorites] = useState<string[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [checkoutStarted, setCheckoutStarted] = useState(false);
  const [addedProductId, setAddedProductId] = useState<string | null>(null);
  const [loadModel, setLoadModel] = useState(false);
  const [catalogProducts, setCatalogProducts] = useState<PerfumeProduct[] | null>(
    null,
  );
  const [catalogSource, setCatalogSource] = useState<
    "loading" | "demo" | "live" | "error"
  >("loading");
  const [catalogError, setCatalogError] = useState("");

  const products = useMemo(
    () =>
      catalogSource === "demo"
        ? perfumeCatalog
        : catalogProducts ?? [],
    [catalogSource, catalogProducts],
  );

  useEffect(() => {
    const previousTitle = document.title;
    const themeColor = document.querySelector<HTMLMetaElement>(
      'meta[name="theme-color"]',
    );

    document.title = "Mazé Parfums — Fragrâncias";
    themeColor?.setAttribute("content", "#030304");

    return () => {
      document.title = previousTitle;
      themeColor?.setAttribute("content", "#FEFEFE");
    };
  }, []);

  useEffect(() => {
    let active = true;
    fetchPublicCatalog("perfumes")
      .then((result) => {
        if (!active) return;
        if (result.configured) {
          setCatalogProducts(result.products.map(mapCatalogProduct));
          setCatalogSource("live");
        } else {
          setCatalogSource("demo");
        }
      })
      .catch((error: unknown) => {
        console.error("Não foi possível carregar o catálogo de perfumes.", error);
        if (active) {
          setCatalogError(
            "Não foi possível carregar os perfumes. Atualize a página para tentar novamente.",
          );
          setCatalogSource("error");
        }
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;

    if (!("IntersectionObserver" in window)) {
      setLoadModel(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setLoadModel(true);
          observer.disconnect();
        }
      },
      { rootMargin: "160px 0px" },
    );
    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!panel && !activeProduct) return;

    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPanel(null);
        setActiveProduct(null);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [panel, activeProduct]);

  useEffect(
    () => () => {
      if (feedbackTimer.current !== null) {
        window.clearTimeout(feedbackTimer.current);
      }
    },
    [],
  );

  const cartCount = Object.values(cart).reduce((sum, quantity) => sum + quantity, 0);
  const favoriteProducts = products.filter((product) =>
    favorites.includes(product.id),
  );
  const brandNames = useMemo(
    () =>
      catalogSource === "demo"
        ? demoBrands
        : Array.from(
            new Set(products.map((product) => product.brand).filter(Boolean)),
          ),
    [catalogSource, products],
  );

  const visibleProducts = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase("pt-BR");

    return products.filter((product) => {
      const matchesFilter =
        filter === "Todos" ||
        (filter === "Ofertas" && Boolean(product.previousPrice)) ||
        (filter === "Lançamentos" && product.isNew) ||
        product.category === filter;
      const matchesQuery =
        query.length === 0 ||
        `${product.name} ${product.brand} ${product.category}`
          .toLocaleLowerCase("pt-BR")
          .includes(query);

      return matchesFilter && matchesQuery;
    });
  }, [filter, products, searchQuery]);

  const scrollTo = (id: string) => {
    const target = document.getElementById(id);
    target?.scrollIntoView({
      behavior: reducedMotion ? "auto" : "smooth",
      block: "start",
    });
    setMobileMenuOpen(false);
  };

  const chooseFilter = (nextFilter: CatalogFilter) => {
    setFilter(nextFilter);
    scrollTo("colecao");
  };

  const addToCart = (
    product: PerfumeProduct,
    amount = 1,
    variant?: PerfumeVariant,
  ) => {
    const selectedVariant =
      variant ??
      product.variants?.find((item) => item.stock > 0) ??
      product.variants?.[0];
    const cartKey = getCartKey(product, selectedVariant);
    if (
      selectedVariant &&
      (selectedVariant.stock === 0 ||
        (cart[cartKey] ?? 0) + amount > selectedVariant.stock)
    ) {
      return;
    }
    setCart((current) => ({
      ...current,
      [cartKey]: (current[cartKey] ?? 0) + amount,
    }));
    setCheckoutStarted(false);
    setAddedProductId(product.id);
    if (feedbackTimer.current !== null) {
      window.clearTimeout(feedbackTimer.current);
    }
    feedbackTimer.current = window.setTimeout(
      () => setAddedProductId(null),
      1100,
    );
    setActiveProduct(null);
    setPanel("cart");
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart((current) => {
      const quantity = (current[id] ?? 0) + delta;
      if (quantity <= 0) {
        const next = { ...current };
        delete next[id];
        return next;
      }
      return { ...current, [id]: quantity };
    });
    setCheckoutStarted(false);
  };

  const removeFromCart = (id: string) => {
    setCart((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    setCheckoutStarted(false);
  };

  const toggleFavorite = (id: string) => {
    setFavorites((current) =>
      current.includes(id)
        ? current.filter((favorite) => favorite !== id)
        : [...current, id],
    );
  };

  const toggleSearch = () => {
    if (searchOpen) {
      setSearchQuery("");
      setSearchOpen(false);
    } else {
      setSearchOpen(true);
    }
  };

  return (
    <div className="perfume-store">
      {catalogSource === "demo" ? (
        <div className="perfume-demo-notice" role="note">
          <Sparkles aria-hidden="true" size={13} />
          <span>{demoCatalogNotice}</span>
        </div>
      ) : catalogSource === "loading" ? (
        <div className="perfume-demo-notice" role="status">
          <Sparkles aria-hidden="true" size={13} />
          <span>Carregando o catálogo...</span>
        </div>
      ) : catalogSource === "error" ? (
        <div className="perfume-demo-notice" role="alert">
          <Sparkles aria-hidden="true" size={13} />
          <span>{catalogError}</span>
        </div>
      ) : null}

      <PerfumeHeader
        activeFilter={filter}
        cartCount={cartCount}
        favoritesCount={favorites.length}
        isScrolled={isScrolled}
        mobileMenuOpen={mobileMenuOpen}
        onFilter={setFilter}
        onOpenPanel={(nextPanel) => {
          setCheckoutStarted(false);
          setPanel(nextPanel);
        }}
        onScrollTo={scrollTo}
        onSearchQuery={setSearchQuery}
        onSearchToggle={toggleSearch}
        onToggleMobileMenu={() => setMobileMenuOpen((open) => !open)}
        searchOpen={searchOpen}
        searchQuery={searchQuery}
      />

      <main>
        <section
          aria-labelledby="perfume-hero-title"
          className="perfume-hero"
          id="inicio"
          ref={heroRef}
        >
          <div aria-hidden="true" className="perfume-hero__grain" />
          <div aria-hidden="true" className="perfume-hero__light" />
          <div className="perfume-hero__copy">
            <motion.p
              animate={{ opacity: 1, y: 0 }}
              className="perfume-kicker perfume-hero__eyebrow"
              initial={reducedMotion ? false : { opacity: 0, y: 14 }}
              transition={{ delay: 0.18, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            >
              ESPAÇO DA MAZÉ <span>·</span> PERFUMARIA
            </motion.p>
            <motion.h1
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              id="perfume-hero-title"
              initial={
                reducedMotion
                  ? false
                  : { opacity: 0, y: 28, filter: "blur(10px)" }
              }
              transition={{ delay: 0.34, duration: 1.15, ease: [0.22, 1, 0.36, 1] }}
            >
              <span>MAIS DO QUE</span>
              <span>UMA FRAGRÂNCIA.</span>
              <em>UMA ASSINATURA.</em>
            </motion.h1>
            <motion.p
              animate={{ opacity: 1, y: 0 }}
              className="perfume-hero__description"
              initial={reducedMotion ? false : { opacity: 0, y: 18 }}
              transition={{ delay: 0.58, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            >
              Descubra fragrâncias que traduzem personalidade, presença e
              exclusividade.
            </motion.p>
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className="perfume-hero__actions"
              initial={reducedMotion ? false : { opacity: 0, y: 18 }}
              transition={{ delay: 0.75, duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
            >
              <button
                className="perfume-primary-button"
                onClick={() => chooseFilter("Todos")}
                type="button"
              >
                Explorar coleção <ArrowRight size={16} />
              </button>
              <Link className="perfume-back-link" to="/">
                Voltar ao Espaço <ArrowUpRight size={14} />
              </Link>
            </motion.div>
            <div className="perfume-hero__footnote">
              <span className="perfume-live-dot" />
              FRASCO INTERATIVO · ARRASTE PARA GIRAR
            </div>
          </div>

          <div className="perfume-hero__stage">
            <div aria-hidden="true" className="perfume-stage__halo" />
            <div aria-hidden="true" className="perfume-stage__floor" />
            {loadModel ? (
              <SceneErrorBoundary
                fallback={
                  <DemoBottleArtwork
                    className="perfume-stage__fallback-bottle"
                    index={0}
                  />
                }
              >
                <Suspense
                  fallback={
                    <div className="perfume-stage__loading" role="status">
                      <span />
                      CARREGANDO FRASCO 3D
                    </div>
                  }
                >
                  <PerfumeCanvas reducedMotion={reducedMotion} />
                </Suspense>
              </SceneErrorBoundary>
            ) : (
              <DemoBottleArtwork
                className="perfume-stage__fallback-bottle"
                index={0}
              />
            )}
            <div className="perfume-stage__caption">
              <span>01</span>
              <span>VISTA 360°</span>
              <span>ARTE DEMONSTRATIVA</span>
            </div>
          </div>
          <button
            aria-label="Descer para a coleção"
            className="perfume-hero__scroll"
            onClick={() => scrollTo("colecao")}
            type="button"
          >
            <span>DESCUBRA A COLEÇÃO</span>
            <ArrowDown size={14} />
          </button>
          <span aria-hidden="true" className="perfume-hero__index">
            01 — 06
          </span>
        </section>

        <section aria-label="Status do catálogo" className="perfume-status-strip">
          <span>
            {catalogSource === "live"
              ? "CATÁLOGO CONECTADO"
              : catalogSource === "demo"
                ? "CATÁLOGO DE DEMONSTRAÇÃO"
                : catalogSource === "loading"
                  ? "CARREGANDO CATÁLOGO"
                  : "CATÁLOGO INDISPONÍVEL"}
          </span>
          <span>·</span>
          <span>SEM PAGAMENTO REAL</span>
          <span>·</span>
          <span>
            {catalogSource === "live"
              ? "DISPONIBILIDADE A CONFIRMAR"
              : catalogSource === "demo"
                ? "DADOS A SUBSTITUIR"
                : catalogSource === "loading"
                  ? "AGUARDE"
                  : "TENTE NOVAMENTE MAIS TARDE"}
          </span>
        </section>

        <motion.section
          className="perfume-catalog-section perfume-shell"
          id="colecao"
          initial={reducedMotion ? false : { opacity: 0, y: 22 }}
          transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
          viewport={{ once: true, amount: 0.1 }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          <div className="perfume-section-heading">
            <div>
              <p className="perfume-kicker">FRAGRÂNCIAS EM DESTAQUE</p>
              <h2>
                Presença que
                <br />
                <em>permanece.</em>
              </h2>
            </div>
            <p className="perfume-section-intro">
              {catalogSource === "live"
                ? "Fragrâncias publicadas no painel, com informações e valores cadastrados."
                : "Uma curadoria visual demonstrativa. Os produtos reais, suas imagens e informações serão cadastrados depois."}
            </p>
          </div>

          <div aria-label="Filtrar perfumes" className="perfume-filter-row">
            <div className="perfume-filter-list">
              {filters.map((item) => (
                <button
                  aria-pressed={filter === item}
                  className={filter === item ? "is-active" : ""}
                  key={item}
                  onClick={() => setFilter(item)}
                  type="button"
                >
                  {item}
                </button>
              ))}
            </div>
            <span className="perfume-results-count">
              {visibleProducts.length.toString().padStart(2, "0")}{" "}
              {catalogSource === "live" ? "ITENS" : "ITENS DEMO"}
            </span>
          </div>

          {catalogSource === "loading" ? (
            <div className="perfume-no-results" role="status">
              <Sparkles size={22} />
              <p>Carregando perfumes...</p>
            </div>
          ) : catalogSource === "error" ? (
            <div className="perfume-no-results" role="alert">
              <Search size={22} />
              <p>{catalogError}</p>
            </div>
          ) : visibleProducts.length > 0 ? (
            <div className="perfume-product-grid">
              {visibleProducts.map((product, index) => (
                <ProductCard
                  added={addedProductId === product.id}
                  index={index}
                  isFavorite={favorites.includes(product.id)}
                  key={product.id}
                  onAdd={() => {
                    if (product.variants && product.variants.length > 1) {
                      setActiveProduct(product);
                    } else {
                      addToCart(product, 1, product.variants?.[0]);
                    }
                  }}
                  onFavorite={() => toggleFavorite(product.id)}
                  onOpen={() => setActiveProduct(product)}
                  product={product}
                  reducedMotion={reducedMotion}
                />
              ))}
            </div>
          ) : (
            <div className="perfume-no-results">
              <Search size={22} />
              <p>
                {catalogSource === "live" &&
                searchQuery.length === 0 &&
                filter === "Todos"
                  ? "Ainda não há perfumes publicados no catálogo."
                  : "Nenhuma fragrância encontrada."}
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setFilter("Todos");
                }}
                type="button"
              >
                Limpar filtros
              </button>
            </div>
          )}
        </motion.section>

        {catalogSource !== "live" && (
        <section aria-labelledby="perfume-offer-title" className="perfume-offer-section" id="ofertas">
          <div aria-hidden="true" className="perfume-offer-section__glow" />
          <div className="perfume-offer-copy">
            <p className="perfume-kicker">CONDIÇÕES DE DEMONSTRAÇÃO</p>
            <h2 id="perfume-offer-title">
              Um detalhe
              <br />
              <em>que fica.</em>
            </h2>
            <p>
              Algumas peças do catálogo visual exibem valores ilustrativos.
              Nenhuma oferta representa uma condição comercial real.
            </p>
            <button
              className="perfume-outline-button"
              onClick={() => chooseFilter("Ofertas")}
              type="button"
            >
              Ver ofertas demonstrativas <ArrowRight size={15} />
            </button>
          </div>
          <div className="perfume-offer-art">
            <DemoBottleArtwork index={2} />
            <span>SELEÇÃO DEMONSTRATIVA · Nº 03</span>
          </div>
          <span aria-hidden="true" className="perfume-offer-index">
            MAZÉ / 03
          </span>
        </section>
        )}

        <section
          aria-labelledby="perfume-brands-title"
          className="perfume-brands-section perfume-shell"
          id="marcas"
        >
          <div className="perfume-brands-heading">
            <p className="perfume-kicker">UM UNIVERSO DE FRAGRÂNCIAS</p>
            <h2 id="perfume-brands-title">
              Marcas em
              <em> destaque.</em>
            </h2>
            <p>
              {catalogSource === "live"
                ? "Marcas dos perfumes publicados no catálogo."
                : "Espaço reservado para as marcas confirmadas no catálogo."}
            </p>
          </div>
          <div className="perfume-brand-list">
            {brandNames.length ? brandNames.map((brand, index) => (
              <div className="perfume-brand-tile" key={brand}>
                <span>0{index + 1}</span>
                <p>{brand}</p>
                <small>{catalogSource === "live" ? "NO CATÁLOGO" : "DEMONSTRAÇÃO"}</small>
              </div>
            )) : (
              <p className="perfume-brand-empty">
                As marcas dos produtos publicados aparecerão aqui.
              </p>
            )}
          </div>
        </section>
      </main>

      <footer className="perfume-footer">
        <div className="perfume-footer__top">
          <div className="perfume-footer__brand">
            <Link aria-label="Mazé Parfums — Espaço da Mazé" className="perfume-brand" to="/">
              <span className="perfume-brand__mark">M</span>
              <span className="perfume-brand__text">
                <span>MAZÉ</span>
                <span>PARFUMS</span>
              </span>
            </Link>
            <p>Uma assinatura em construção.</p>
          </div>
          <div className="perfume-footer__column">
            <span>ATENDIMENTO</span>
            <p>Informações a cadastrar</p>
            <p>Horários a cadastrar</p>
          </div>
          <div className="perfume-footer__column">
            <span>INFORMAÇÕES</span>
            <p>Entrega — política a cadastrar</p>
            <p>Trocas — política a cadastrar</p>
          </div>
          <div className="perfume-footer__column">
            <span>LEGAL & SOCIAL</span>
            <p>Privacidade — documento a cadastrar</p>
            <p>Redes sociais a conectar</p>
          </div>
        </div>
        <div className="perfume-footer__bottom">
          <span>© {new Date().getFullYear()} ESPAÇO DA MAZÉ</span>
          <span>
            {catalogSource === "live"
              ? "CATÁLOGO ATUALIZADO PELO PAINEL · PAGAMENTO NÃO INTEGRADO"
              : "CATÁLOGO VISUAL DEMONSTRATIVO · NENHUMA VENDA REAL"}
          </span>
          <Link to="/">VOLTAR AO ESPAÇO <ArrowUpRight size={13} /></Link>
        </div>
      </footer>

      <AnimatePresence>
        {panel && (
          <CartPanel
            cart={cart}
            checkoutStarted={checkoutStarted}
            favoriteProducts={favoriteProducts}
            key={panel}
            mode={panel}
            products={products}
            onAdd={addToCart}
            onCheckout={() => setCheckoutStarted((started) => !started)}
            onClose={() => setPanel(null)}
            onOpenProduct={(product) => {
              setPanel(null);
              setActiveProduct(product);
            }}
            onRemove={removeFromCart}
            onSetMode={setPanel}
            onUpdateQuantity={updateQuantity}
          />
        )}
        {activeProduct && (
          <ProductDetail
            key={activeProduct.id}
            onAdd={addToCart}
            onClose={() => setActiveProduct(null)}
            onOpenRelated={setActiveProduct}
            product={activeProduct}
            products={products}
            reducedMotion={reducedMotion}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
