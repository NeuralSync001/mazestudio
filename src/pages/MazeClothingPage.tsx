import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { fetchPublicCatalog, type PublicCatalogProduct } from "../lib/publicCatalog";
import "./MazeClothingPage.css";

const MODELS =
  "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20261102_042056_1a704ff7-b0e5-4a9f-bbda-62392b819fb6.png&w=3840&q=85";
const PIECES =
  "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20261102_042057_080e85b0-b4aa-4072-8eb9-2304c7baf42b.png&w=2400&q=85";

const LOOKS = [
  [12, 176],
  [178, 330],
  [331, 470],
  [476, 633],
  [634, 767],
  [767, 956],
] as const;
const ITEMS = [
  [26, 224, 28, 214, "Jaqueta de plumas", "Consulte valores"],
  [304, 412, 22, 236, "Calça pantalona acetinada", "Consulte valores"],
  [530, 666, 12, 242, "Vestido plissado", "Consulte valores"],
  [752, 922, 100, 146, "Cinto dourado", "Consulte valores"],
  [70, 176, 246, 466, "Vestido trench acetinado", "Consulte valores"],
  [294, 422, 294, 432, "Bolsa estruturada", "Consulte valores"],
  [508, 688, 240, 452, "Blusa de mangas bufantes", "Consulte valores"],
  [780, 890, 252, 466, "Calça com amarração", "Consulte valores"],
  [64, 178, 484, 698, "Casaco azul-claro", "Consulte valores"],
  [316, 396, 482, 698, "Calça reta marfim", "Consulte valores"],
  [530, 672, 508, 682, "Blusa com babados", "Consulte valores"],
  [754, 916, 484, 700, "Saia longa plissada", "Consulte valores"],
] as const;
const STOCK_CATEGORIES = [
  "Todas",
  "Blusas",
  "Calças",
  "Vestidos",
  "Casacos",
  "Saias",
  "Acessórios",
  "Outros",
] as const;
type StockCategory = (typeof STOCK_CATEGORIES)[number];
const STOCK_PRODUCTS = [
  { itemIndex: 0, category: "Casacos" },
  { itemIndex: 1, category: "Calças" },
  { itemIndex: 2, category: "Vestidos" },
  { itemIndex: 4, category: "Vestidos" },
  { itemIndex: 6, category: "Blusas" },
  { itemIndex: 7, category: "Calças" },
  { itemIndex: 8, category: "Casacos" },
  { itemIndex: 9, category: "Calças" },
  { itemIndex: 10, category: "Blusas" },
  { itemIndex: 11, category: "Saias" },
] as const;
const KX = [1.2, 0.744, 0.496, 0.346, 0.235, 0.15, 0.085];
const KF = [1.14, 0.89, 0.777, 0.704, 0.651, 0.616, 0.59];
const KH = [1.18, 0.832, 0.574, 0.436, 0.334, 0.258, 0.19];
const KB = [0, 0, 1.5, 4, 8, 12, 17];
const KO = [1, 1, 1, 1, 0.86, 0.5, 0];
const FIRST_LOOK = 15;
const MODEL_Y = 48;
const MODEL_HEIGHT = 496 - MODEL_Y;

const wrap = (value: number, length: number) =>
  ((value % length) + length) % length;
const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

function ProductCrop({
  item,
}: {
  item: (typeof ITEMS)[number];
}) {
  const [x0, x1, y0, y1] = item;
  const width = x1 - x0;
  const height = y1 - y0;

  return (
    <svg
      aria-hidden="true"
      className="mv-crop"
      viewBox={`${x0} ${y0} ${width} ${height}`}
    >
      <svg
        x={x0}
        y={y0}
        width={width}
        height={height}
        viewBox={`${x0} ${y0} ${width} ${height}`}
      >
        <image href={PIECES} width="960" height="720" />
      </svg>
    </svg>
  );
}

function ModelCrop({ index }: { index: number }) {
  const [x0, x1] = LOOKS[index];
  const width = x1 - x0;
  return (
    <svg
      aria-hidden="true"
      className="mv-crop"
      viewBox={`${x0} ${MODEL_Y} ${width} ${MODEL_HEIGHT}`}
    >
      <svg
        x={x0}
        y={MODEL_Y}
        width={width}
        height={MODEL_HEIGHT}
        viewBox={`${x0} ${MODEL_Y} ${width} ${MODEL_HEIGHT}`}
      >
        <image href={MODELS} width="960" height="540" />
      </svg>
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 20S3.5 15 3.5 9A4.6 4.6 0 0 1 12 6.6 4.6 4.6 0 0 1 20.5 9C20.5 15 12 20 12 20Z" />
    </svg>
  );
}

type MazeClothingPageProps = {
  onAddToCart: () => void;
};

function formatPrice(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency",
  }).format(value);
}

export function MazeClothingPage({ onAddToCart }: MazeClothingPageProps) {
  const stageRef = useRef<HTMLElement>(null);
  const railRef = useRef<HTMLElement>(null);
  const modelRefs = useRef<Array<HTMLDivElement | null>>([]);
  const cardRefs = useRef<Array<HTMLElement | null>>([]);
  const rollRef = useRef<HTMLSpanElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef({ x: 0, y: 0 });
  const positionRef = useRef(0);
  const targetRef = useRef(0);
  const dirtyRef = useRef(true);
  const wheelTimerRef = useRef<number | undefined>(undefined);
  const [savedItems, setSavedItems] = useState<Set<string>>(() => new Set());
  const [stockCategory, setStockCategory] = useState<StockCategory>("Todas");
  const [stockSearch, setStockSearch] = useState("");
  const [catalogProducts, setCatalogProducts] = useState<PublicCatalogProduct[]>([]);
  const [catalogSource, setCatalogSource] = useState<
    "loading" | "demo" | "live" | "error"
  >("loading");
  const [catalogError, setCatalogError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [showRing, setShowRing] = useState(false);
  const [assetsReady, setAssetsReady] = useState(false);
  const [assetError, setAssetError] = useState("");
  const [reducedMotion, setReducedMotion] = useState(false);
  const normalizedSearch = stockSearch.trim().toLocaleLowerCase("pt-BR");
  const visibleStock = STOCK_PRODUCTS.filter(({ itemIndex, category }) => {
    const matchesCategory =
      stockCategory === "Todas" || category === stockCategory;
    const matchesSearch = ITEMS[itemIndex][4]
      .toLocaleLowerCase("pt-BR")
      .includes(normalizedSearch);
    return matchesCategory && matchesSearch;
  });
  const visibleCatalogProducts = catalogProducts.filter((product) => {
    const matchesCategory =
      stockCategory === "Todas" || product.clothingType === stockCategory;
    const matchesSearch = `${product.name} ${product.brand ?? ""}`
      .toLocaleLowerCase("pt-BR")
      .includes(normalizedSearch);
    return matchesCategory && matchesSearch;
  });

  useEffect(() => {
    const previousTitle = document.title;
    const description = document.querySelector<HTMLMetaElement>(
      'meta[name="description"]',
    );
    const previousDescription = description?.content;
    document.title = "Roupas — Espaço da Maze";
    if (description) {
      description.content =
        "Explore a coleção de roupas do Espaço da Maze e descubra peças para expressar o seu estilo.";
    }

    return () => {
      document.title = previousTitle;
      if (description && previousDescription !== undefined) {
        description.content = previousDescription;
      }
    };
  }, []);

  useEffect(() => {
    let active = true;
    fetchPublicCatalog("roupas")
      .then((result) => {
        if (!active) return;
        if (result.configured) {
          setCatalogProducts(result.products);
          setCatalogSource("live");
        } else {
          setCatalogSource("demo");
        }
      })
      .catch((error: unknown) => {
        console.error("Não foi possível carregar o estoque de roupas.", error);
        if (active) {
          setCatalogError(
            "Não foi possível carregar o estoque. Atualize a página para tentar novamente.",
          );
          setCatalogSource("error");
        }
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    let active = true;
    const loadImage = (src: string) =>
      new Promise<void>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve();
        image.onerror = () => reject(new Error(`Unable to load image: ${src}`));
        image.src = src;
        if (image.complete && image.naturalWidth > 0) resolve();
      });

    Promise.all([loadImage(MODELS), loadImage(PIECES)])
      .then(() =>
        Promise.all([
          document.fonts.load('400 14px "Kanit"'),
          document.fonts.ready,
        ]),
      )
      .then(() => {
        if (active) setAssetsReady(true);
      })
      .catch((error: unknown) => {
        console.error("Espaço da Maze could not load its required assets.", error);
        if (active) {
          setAssetError(
            "Não foi possível carregar as imagens do lookbook. Verifique sua conexão e atualize a página.",
          );
          setAssetsReady(true);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    const rail = railRef.current;
    const roll = rollRef.current;
    const ring = ringRef.current;
    if (!stage || !rail || !roll || !ring) return;

    let stageWidth = 0;
    let stageHeight = 0;
    let baseHeight = 0;
    let cardSize = 0;
    let isSideRail = false;
    let lastFrame = 0;
    let cursorX = 0;
    let cursorY = 0;
    let animationFrame = 0;
    const rendered = LOOKS.map(() => ({ filter: "", opacity: "" }));

    const size = () => {
      stageWidth = stage.clientWidth;
      stageHeight = stage.clientHeight;
      baseHeight = stageHeight * 1.2;
      isSideRail = window.innerWidth <= 820;
      modelRefs.current.forEach((model, index) => {
        if (!model) return;
        const ratio =
          (LOOKS[index][1] - LOOKS[index][0]) / MODEL_HEIGHT;
        model.style.width = `${baseHeight * ratio}px`;
        model.style.height = `${baseHeight}px`;
      });
      cardSize = isSideRail ? 160 : rail.clientHeight / 3;
      cardRefs.current.forEach((card) => {
        if (card) card.style.height = isSideRail ? "100%" : `${cardSize}px`;
      });
      dirtyRef.current = true;
      paint();
      dirtyRef.current = false;
    };

    const paint = () => {
      const position = positionRef.current;
      modelRefs.current.forEach((model, index) => {
        if (!model) return;
        let depth = wrap(index - position, LOOKS.length);
        if (depth > LOOKS.length - 1) depth -= LOOKS.length;
        const stop = clamp(depth + 1, 0, 6);
        const lower = Math.floor(stop);
        const upper = Math.min(6, lower + 1);
        const amount = stop - lower;
        const interpolate = (values: number[]) =>
          values[lower] + (values[upper] - values[lower]) * amount;
        const height = interpolate(KH) * stageHeight;
        const scale = height / baseHeight;
        const width = height * (LOOKS[index][1] - LOOKS[index][0]) / MODEL_HEIGHT;
        const x = interpolate(KX) * stageWidth - width / 2;
        const y = interpolate(KF) * stageHeight - height;
        model.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) scale(${scale.toFixed(4)})`;

        const blur = interpolate(KB) / scale;
        const filter = blur < 0.2 ? "none" : `blur(${blur.toFixed(1)}px)`;
        const opacity = interpolate(KO).toFixed(3);
        if (filter !== rendered[index].filter) {
          rendered[index].filter = filter;
          model.style.filter = filter;
        }
        if (opacity !== rendered[index].opacity) {
          rendered[index].opacity = opacity;
          model.style.opacity = opacity;
        }
        model.style.zIndex = String(100 - Math.round(depth * 10));
      });

      const trackSize = cardSize * ITEMS.length;
      cardRefs.current.forEach((card, index) => {
        if (!card) return;
        let y = wrap(index * cardSize - position * 2 * cardSize, trackSize);
        if (y > trackSize - cardSize) y -= trackSize;
        card.style.transform = isSideRail
          ? `translate3d(${y.toFixed(1)}px,0,0)`
          : `translate3d(0,${y.toFixed(1)}px,0)`;
      });

      const lineHeight = roll.firstElementChild
        ? (roll.firstElementChild as HTMLElement).offsetHeight
        : 0;
      roll.style.transform = `translate3d(0,${(
        -wrap(position, LOOKS.length) * lineHeight
      ).toFixed(1)}px,0)`;
    };

    const handleWheel = (event: globalThis.WheelEvent) => {
      const delta = event.deltaX + (event.shiftKey ? event.deltaY : 0);
      if (!delta) return;
      event.preventDefault();
      targetRef.current += clamp(delta, -120, 120) / 420;
      window.clearTimeout(wheelTimerRef.current);
      wheelTimerRef.current = window.setTimeout(() => {
        targetRef.current = Math.round(targetRef.current);
      }, 150);
    };

    const frame = (now: number) => {
      const delta = Math.min(50, now - lastFrame) || 16;
      lastFrame = now;
      const previous = positionRef.current;
      if (reducedMotion) {
        positionRef.current = targetRef.current;
      } else {
        positionRef.current +=
          (targetRef.current - positionRef.current) *
          (1 - Math.exp(-delta * 0.0072));
      }
      if (Math.abs(targetRef.current - positionRef.current) < 0.0004) {
        positionRef.current = targetRef.current;
      }
      if (positionRef.current !== previous || dirtyRef.current) {
        dirtyRef.current = false;
        paint();
      }

      cursorX += (pointerRef.current.x - cursorX) * 0.32;
      cursorY += (pointerRef.current.y - cursorY) * 0.32;
      ring.style.transform = `translate3d(${cursorX.toFixed(1)}px,${cursorY.toFixed(1)}px,0)`;
      animationFrame = requestAnimationFrame(frame);
    };

    size();
    animationFrame = requestAnimationFrame(frame);
    window.addEventListener("resize", size);
    stage.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", size);
      stage.removeEventListener("wheel", handleWheel);
      window.clearTimeout(wheelTimerRef.current);
    };
  }, [reducedMotion]);

  const handlePointerDown = (event: PointerEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest("a, button")) return;
    const stage = stageRef.current;
    if (!stage) return;
    stage.focus({ preventScroll: true });
    stage.setPointerCapture(event.pointerId);
    stage.dataset.dragging = "true";
    stage.dataset.startX = String(event.clientX);
    stage.dataset.startTarget = String(targetRef.current);
    stage.dataset.moved = "0";
    setIsDragging(true);
  };

  const handlePointerMove = (event: PointerEvent<HTMLElement>) => {
    const stage = stageRef.current;
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    const ring = ringRef.current;
    if (ring) {
      ring.dataset.x = String(mouseX);
      ring.dataset.y = String(mouseY);
    }

    if (stage.dataset.dragging !== "true") return;
    const deltaX = event.clientX - Number(stage.dataset.startX);
    stage.dataset.moved = String(
      Math.max(Number(stage.dataset.moved), Math.abs(deltaX)),
    );
    targetRef.current =
      Number(stage.dataset.startTarget) +
      deltaX / Math.max(150, rect.width * 0.2);
  };

  const handlePointerUp = (event: PointerEvent<HTMLElement>) => {
    const stage = stageRef.current;
    if (!stage || stage.dataset.dragging !== "true") return;
    stage.dataset.dragging = "false";
    setIsDragging(false);

    if (Number(stage.dataset.moved) < 6) {
      const hit = document
        .elementsFromPoint(event.clientX, event.clientY)
        .map((element) =>
          element instanceof HTMLElement
            ? element.closest<HTMLElement>(".mv-model")
            : null,
        )
        .find((element): element is HTMLElement => element !== null);
      if (hit) {
        let distance = wrap(
          Number(hit.dataset.index) - targetRef.current,
          LOOKS.length,
        );
        distance = Math.round(distance);
        if (distance > 0 && distance < LOOKS.length) {
          targetRef.current = Math.round(targetRef.current) + distance;
        }
        return;
      }
    }
    targetRef.current = Math.round(targetRef.current);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      targetRef.current = Math.round(targetRef.current) + 1;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      targetRef.current = Math.round(targetRef.current) - 1;
    }
  };

  const toggleSaved = (index: number) => {
    setSavedItems((previous) => {
      const next = new Set(previous);
      if (next.has(String(index))) next.delete(String(index));
      else next.add(String(index));
      return next;
    });
  };

  const toggleCatalogSaved = (id: string) => {
    setSavedItems((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const updateCursor = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType === "mouse") setShowRing(true);
  };

  const updateRingPosition = (event: PointerEvent<HTMLElement>) => {
    const stage = stageRef.current;
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    pointerRef.current = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  return (
    <div className="mv-page">
      <main className="mv-main">
        <section
          aria-label="Destaques de moda. Arraste, use a rolagem horizontal ou as setas do teclado para trocar de look; role a página para ver o estoque."
          className="mv-stage"
          id="runway"
          onKeyDown={handleKeyDown}
          onPointerDown={handlePointerDown}
          onPointerEnter={updateCursor}
          onPointerLeave={() => setShowRing(false)}
          onPointerMove={(event) => {
            handlePointerMove(event);
            updateRingPosition(event);
          }}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          ref={stageRef}
          tabIndex={0}
        >
          <div className="mv-line">
            {LOOKS.map((_, index) => (
              <div
                className="mv-model"
                data-index={index}
                key={index}
                ref={(element) => {
                  modelRefs.current[index] = element;
                }}
              >
                <ModelCrop index={index} />
              </div>
            ))}
          </div>
          <div className="mv-intro">
            <p className="mv-eyebrow mv-wide">Destaques / Espaço da Maze</p>
            <h1 className="mv-wide hero-heading">Moda com a sua personalidade</h1>
            <p>
              Peças escolhidas com carinho para expressar seu estilo e
              acompanhar cada momento.
            </p>
          </div>
          <div className="mv-tag">
            <div className="mv-look mv-wide" aria-live="polite">
              <span>Look</span>
              <span className="mv-window">
                <span className="mv-roll" ref={rollRef}>
                  {Array.from({ length: LOOKS.length + 1 }, (_, index) => (
                    <b key={index}>{FIRST_LOOK + (index % LOOKS.length)}</b>
                  ))}
                </span>
              </span>
            </div>
            <a className="mv-shop mv-wide" href="#estoque">
              Ver as peças
            </a>
          </div>
          <div
            aria-hidden="true"
            className={`mv-ring${showRing ? " mv-show" : ""}${isDragging ? " mv-drag" : ""}`}
            ref={ringRef}
          />
        </section>

        <aside
          aria-label="Peças deste look"
          className="mv-rail"
          id="rail"
          ref={railRef}
        >
          {ITEMS.map((item, index) => (
            <article
              className={`mv-card${index % 2 ? " mv-alt" : ""}`}
              key={item[4]}
              ref={(element) => {
                cardRefs.current[index] = element;
              }}
            >
              <button
                aria-label={`Salvar ${item[4]}`}
                aria-pressed={savedItems.has(String(index))}
                className="mv-fav"
                onClick={() => toggleSaved(index)}
                type="button"
              >
                <HeartIcon />
              </button>
              <span className="mv-shot">
                <ProductCrop item={item} />
              </span>
              <div className="mv-meta">
                <h2 className="mv-wide">{item[4]}</h2>
                <span>{item[5]}</span>
                <button
                  aria-label={`Adicionar ${item[4]} à sacola`}
                  className="mv-add"
                  onClick={onAddToCart}
                  type="button"
                />
              </div>
            </article>
          ))}
        </aside>
      </main>

      <section
        aria-labelledby="mv-stock-title"
        className="mv-stock"
        id="estoque"
      >
        <div className="mv-stock-inner">
          <div className="mv-stock-heading">
            <div>
              <p className="mv-stock-eyebrow">Espaço da Maze / Moda</p>
              <h2 id="mv-stock-title">Estoque de roupas</h2>
              <p>
                {catalogSource === "live"
                  ? "Peças publicadas no painel, com preços e disponibilidade cadastrados. A sacola não finaliza pedidos."
                  : "Explore as peças da seleção e consulte tamanhos, valores e disponibilidade com a equipe da Maze."}
              </p>
            </div>
          </div>

          <div className="mv-stock-controls">
            <div
              aria-label="Filtrar estoque por categoria"
              className="mv-stock-filters"
              role="group"
            >
              {STOCK_CATEGORIES.map((category) => (
                <button
                  aria-pressed={stockCategory === category}
                  className="mv-stock-filter"
                  key={category}
                  onClick={() => setStockCategory(category)}
                  type="button"
                >
                  {category}
                </button>
              ))}
            </div>
            <label>
              <span className="sr-only">Buscar peças no estoque</span>
              <input
                className="mv-stock-search"
                onChange={(event) => setStockSearch(event.target.value)}
                placeholder="Buscar uma peça"
                type="search"
                value={stockSearch}
              />
            </label>
          </div>

          <p aria-live="polite" className="sr-only">
            {catalogSource === "live"
              ? visibleCatalogProducts.length
              : visibleStock.length}{" "}
            peças encontradas.
          </p>
          {catalogSource === "demo" && (
            <p className="mv-stock-notice" role="note">
              Catálogo demonstrativo: peças, valores e disponibilidade são exemplos.
            </p>
          )}
          {catalogSource === "error" && (
            <p className="mv-stock-notice mv-stock-notice--error" role="alert">
              {catalogError}
            </p>
          )}
          <div className="mv-stock-grid">
            {catalogSource === "loading" ? (
              <p className="mv-stock-empty" role="status">Carregando estoque...</p>
            ) : catalogSource === "error" ? (
              <p className="mv-stock-empty">{catalogError}</p>
            ) : catalogSource === "live" ? (
              visibleCatalogProducts.length ? (
                visibleCatalogProducts.map((product) => {
                  const availableStock = product.variants.reduce(
                    (total, variant) => total + variant.stock,
                    0,
                  );
                  const lowestPrice = Math.min(
                    ...product.variants.map((variant) => variant.price),
                  );
                  return (
                    <article className="mv-stock-card" key={product.id}>
                      <div className="mv-stock-image">
                        {product.images[0]?.url ? (
                          <img
                            alt={product.images[0].alt_text}
                            className="mv-stock-photo"
                            loading="lazy"
                            src={product.images[0].url}
                          />
                        ) : (
                          <span className="mv-stock-no-image">Foto não cadastrada</span>
                        )}
                        <button
                          aria-label={`Salvar ${product.name}`}
                          aria-pressed={savedItems.has(product.id)}
                          className="mv-stock-fav"
                          onClick={() => toggleCatalogSaved(product.id)}
                          type="button"
                        >
                          <HeartIcon />
                        </button>
                      </div>
                      <div className="mv-stock-info">
                        <p className="mv-stock-category">{product.clothingType}</p>
                        <h3>{product.name}</h3>
                        {product.brand && (
                          <p className="mv-stock-brand">{product.brand}</p>
                        )}
                        <p className="mv-stock-availability">
                          {availableStock > 0
                            ? `${availableStock} unidade${availableStock === 1 ? "" : "s"} ${availableStock === 1 ? "disponível" : "disponíveis"}`
                            : "Indisponível no momento"}
                        </p>
                        <strong className="mv-stock-price">
                          A partir de {formatPrice(lowestPrice)}
                        </strong>
                        <button
                          aria-label={`Adicionar ${product.name} à sacola`}
                          className="mv-stock-add"
                          disabled={availableStock === 0}
                          onClick={onAddToCart}
                          type="button"
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M12 5v14M5 12h14" />
                          </svg>
                          Adicionar à sacola
                        </button>
                      </div>
                    </article>
                  );
                })
              ) : (
                <p className="mv-stock-empty">
                  {stockSearch || stockCategory !== "Todas"
                    ? "Nenhuma peça encontrada. Tente outra busca ou categoria."
                    : "Ainda não há roupas publicadas no estoque."}
                </p>
              )
            ) : visibleStock.length ? (
              visibleStock.map(({ itemIndex, category }) => {
                const item = ITEMS[itemIndex];
                return (
                  <article className="mv-stock-card" key={itemIndex}>
                    <div className="mv-stock-image">
                      <ProductCrop item={item} />
                      <button
                        aria-label={`Salvar ${item[4]}`}
                        aria-pressed={savedItems.has(String(itemIndex))}
                        className="mv-stock-fav"
                        onClick={() => toggleSaved(itemIndex)}
                        type="button"
                      >
                        <HeartIcon />
                      </button>
                    </div>
                    <div className="mv-stock-info">
                      <p className="mv-stock-category">{category}</p>
                      <h3>{item[4]}</h3>
                      <p className="mv-stock-availability">
                        Valores e tamanhos sob consulta
                      </p>
                      <button
                        aria-label={`Adicionar ${item[4]} à sacola`}
                        className="mv-stock-add"
                        onClick={onAddToCart}
                        type="button"
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M12 5v14M5 12h14" />
                        </svg>
                        Adicionar à sacola
                      </button>
                    </div>
                  </article>
                );
              })
            ) : (
              <p className="mv-stock-empty">
                Nenhuma peça encontrada. Tente outra busca ou categoria.
              </p>
            )}
          </div>
        </div>
      </section>

      <div
        aria-hidden="true"
        className={`mv-wait${assetsReady ? " mv-gone" : ""}`}
      />
      {assetError && (
        <p className="mv-error" role="alert">
          {assetError}
        </p>
      )}
    </div>
  );
}
