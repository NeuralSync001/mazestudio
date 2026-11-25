import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Boxes,
  Check,
  ChevronDown,
  Clock3,
  Eye,
  EyeOff,
  FileImage,
  HelpCircle,
  LayoutDashboard,
  Loader2,
  LogOut,
  Package,
  Plus,
  Search,
  ShieldCheck,
  Store,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  AdminApiError,
  deleteAdminProduct,
  getAdminProducts,
  getAdminSession,
  postAdminAuth,
  saveAdminProduct,
  uploadAdminProductImage,
} from "../lib/adminApi";
import type {
  AdminActivity,
  AdminAuthState,
  AdminProduct,
  CatalogCategory,
  ClothingType,
  PerfumeAudience,
  ProductDraft,
  ProductStatus,
} from "../types/admin";
import "./AdminPage.css";

type AuthScreen =
  | "loading"
  | "unavailable"
  | "signed_out"
  | "mfa_setup"
  | "mfa_challenge"
  | "ready";
type PanelSection = "overview" | "products";
type Notice = { tone: "success" | "error" | "info"; message: string };
type VariantForm = {
  label: string;
  sku: string;
  price: string;
  compareAtPrice: string;
  stock: string;
};

const categoryLabels: Record<CatalogCategory, string> = {
  perfume: "Perfume",
  clothing: "Roupa",
};

const statusLabels: Record<ProductStatus, string> = {
  draft: "Rascunho",
  published: "Publicado",
};
const perfumeAudiences: PerfumeAudience[] = [
  "Masculino",
  "Feminino",
  "Unissex",
];
const clothingTypes: ClothingType[] = [
  "Blusas",
  "Calças",
  "Vestidos",
  "Casacos",
  "Saias",
  "Acessórios",
  "Outros",
];

function formatPrice(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency",
  }).format(value);
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Data indisponível"
    : new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(date);
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Não foi possível concluir a operação. Tente novamente.";
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Não foi possível ler a imagem selecionada."));
    };
    reader.onerror = () =>
      reject(new Error("Não foi possível ler a imagem selecionada."));
    reader.readAsDataURL(file);
  });
}

function AdminSignIn({
  screen,
  email,
  factorId,
  error,
  onLogin,
  onLogout,
  onVerify,
  onRetry,
}: {
  screen: AuthScreen;
  email: string;
  factorId: string;
  error: string;
  onLogin: (email: string, password: string) => Promise<void>;
  onLogout: () => void;
  onVerify: (factorId: string, code: string) => Promise<void>;
  onRetry: () => void;
}) {
  const [loginEmail, setLoginEmail] = useState(email);
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [enrollmentFactor, setEnrollmentFactor] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    setLoginEmail(email);
  }, [email]);

  const perform = async (operation: () => Promise<void>) => {
    setBusy(true);
    setFormError("");
    try {
      await operation();
    } catch (requestError) {
      setFormError(getErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };

  const startEnrollment = () =>
    perform(async () => {
      const result = await postAdminAuth({ action: "enroll" });
      if (result.state === "ready") {
        onRetry();
        return;
      }
      if (result.state === "mfa_challenge" && result.factorId) {
        onRetry();
        return;
      }
      if (
        result.state !== "mfa_setup" ||
        typeof result.factorId !== "string" ||
        typeof result.qrCode !== "string" ||
        typeof result.secret !== "string"
      ) {
        throw new Error("Não foi possível iniciar a configuração do autenticador.");
      }
      setEnrollmentFactor(result.factorId);
      setQrCode(result.qrCode);
      setSecret(result.secret);
    });

  if (screen === "loading") {
    return (
      <main className="admin-auth-screen" aria-busy="true">
        <div className="admin-auth-card">
          <Loader2 className="admin-spin" aria-hidden="true" size={28} />
          <p>Verificando o acesso ao painel…</p>
        </div>
      </main>
    );
  }

  if (screen === "unavailable") {
    const unavailableTitle =
      error.includes("conectado") ||
      error.includes("funções seguras") ||
      !error
        ? "O painel ainda não está conectado"
        : "Não foi possível acessar o painel";
    return (
      <main className="admin-auth-screen">
        <section className="admin-auth-card" aria-labelledby="admin-setup-title">
          <span className="admin-brand-mark" aria-hidden="true">M</span>
          <div className="admin-auth-eyebrow"><ShieldCheck size={15} /> Acesso administrativo</div>
          <h1 id="admin-setup-title">{unavailableTitle}</h1>
          <p>
            {error ||
              "A configuração segura do banco e do acesso ainda precisa ser concluída. Nenhum cadastro foi salvo ou simulado."}
          </p>
          <div className="admin-setup-help">
            <strong>Próximo passo</strong>
            <span>Peça a quem administra o site para seguir o guia de configuração do painel.</span>
            <a href="https://github.com/NeuralSync001/mazestudio/blob/main/docs/admin-setup.md" target="_blank" rel="noreferrer">
              Abrir guia de configuração <ArrowRight size={15} />
            </a>
          </div>
          {error && <p className="admin-alert admin-alert--error" role="alert">{error}</p>}
          <button className="admin-button admin-button--secondary admin-button--full" onClick={onRetry} type="button">
            Tentar novamente
          </button>
          <Link className="admin-back-link" to="/">Voltar à loja</Link>
        </section>
      </main>
    );
  }

  if (screen === "signed_out") {
    return (
      <main className="admin-auth-screen">
        <section className="admin-auth-card" aria-labelledby="admin-login-title">
          <span className="admin-brand-mark" aria-hidden="true">M</span>
          <div className="admin-auth-eyebrow"><ShieldCheck size={15} /> Espaço da Mazé</div>
          <h1 id="admin-login-title">Entre no painel</h1>
          <p>Use a conta de administrador que recebeu acesso. Não há cadastro público.</p>
          <form
            className="admin-auth-form"
            onSubmit={(event) => {
              event.preventDefault();
              void perform(() => onLogin(loginEmail.trim(), password));
            }}
          >
            <label>
              <span>E-mail</span>
              <input
                autoComplete="username"
                autoCapitalize="none"
                type="email"
                value={loginEmail}
                onChange={(event) => setLoginEmail(event.target.value)}
                required
              />
            </label>
            <label>
              <span>Senha</span>
              <span className="admin-password-field">
                <input
                  autoComplete="current-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <button
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  onClick={() => setShowPassword((value) => !value)}
                  type="button"
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </span>
            </label>
            {(error || formError) && (
              <p className="admin-alert admin-alert--error" role="alert">{formError || error}</p>
            )}
            <button className="admin-button admin-button--primary admin-button--full" disabled={busy} type="submit">
              {busy ? <Loader2 className="admin-spin" size={17} /> : <ShieldCheck size={17} />}
              {busy ? "Verificando…" : "Entrar com segurança"}
            </button>
          </form>
          <p className="admin-auth-security">
            <ShieldCheck size={14} /> A entrada exige uma conta autorizada e confirmação em duas etapas.
          </p>
          <Link className="admin-back-link" to="/">Voltar à loja</Link>
        </section>
      </main>
    );
  }

  if (screen === "mfa_setup") {
    return (
      <main className="admin-auth-screen">
        <section className="admin-auth-card" aria-labelledby="admin-mfa-title">
          <span className="admin-brand-mark" aria-hidden="true">M</span>
          <div className="admin-auth-eyebrow"><ShieldCheck size={15} /> Proteção da conta</div>
          <h1 id="admin-mfa-title">Ative a confirmação em duas etapas</h1>
          <p>
            Conecte um aplicativo autenticador à sua conta. Essa confirmação é
            necessária para proteger os produtos e o estoque.
          </p>
          {qrCode && enrollmentFactor ? (
            <div className="admin-mfa-setup">
              <img src={qrCode} alt="Código QR de configuração do autenticador" />
              <p>Leia o código com seu aplicativo autenticador e informe o número gerado.</p>
              <div className="admin-mfa-secret">
                <span>Chave de configuração</span>
                <code>{secret}</code>
              </div>
              <form
                className="admin-auth-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  void perform(() => onVerify(enrollmentFactor, code));
                }}
              >
                <label>
                  <span>Código do aplicativo</span>
                  <input
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    maxLength={8}
                    value={code}
                    onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 8))}
                    required
                  />
                </label>
                {formError && <p className="admin-alert admin-alert--error" role="alert">{formError}</p>}
                <button className="admin-button admin-button--primary admin-button--full" disabled={busy} type="submit">
                  {busy ? <Loader2 className="admin-spin" size={17} /> : <Check size={17} />}
                  Confirmar e continuar
                </button>
              </form>
              <p className="admin-mfa-warning">
                Guarde a chave em local privado. Não a envie por mensagem.
              </p>
            </div>
          ) : (
            <>
              {(error || formError) && <p className="admin-alert admin-alert--error" role="alert">{formError || error}</p>}
              <button
                className="admin-button admin-button--primary admin-button--full"
                disabled={busy}
                onClick={() => void startEnrollment()}
                type="button"
              >
                {busy ? <Loader2 className="admin-spin" size={17} /> : <ShieldCheck size={17} />}
                Configurar autenticador
              </button>
            </>
          )}
          <button className="admin-back-link admin-link-button" onClick={onLogout} type="button">
            Sair e tentar outra conta
          </button>
        </section>
      </main>
    );
  }

  if (screen === "mfa_challenge") {
    return (
      <main className="admin-auth-screen">
        <section className="admin-auth-card" aria-labelledby="admin-code-title">
          <span className="admin-brand-mark" aria-hidden="true">M</span>
          <div className="admin-auth-eyebrow"><BadgeCheck size={15} /> Segunda etapa</div>
          <h1 id="admin-code-title">Confirme que é você</h1>
          <p>Digite o código atual do seu aplicativo autenticador para abrir o painel.</p>
          <form
            className="admin-auth-form"
            onSubmit={(event) => {
              event.preventDefault();
              void perform(() => onVerify(factorId, code));
            }}
          >
            <label>
              <span>Código de verificação</span>
              <input
                autoComplete="one-time-code"
                inputMode="numeric"
                maxLength={8}
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 8))}
                required
              />
            </label>
            {(error || formError) && <p className="admin-alert admin-alert--error" role="alert">{formError || error}</p>}
            <button className="admin-button admin-button--primary admin-button--full" disabled={busy || !factorId} type="submit">
              {busy ? <Loader2 className="admin-spin" size={17} /> : <Check size={17} />}
              Confirmar acesso
            </button>
          </form>
          <button className="admin-back-link admin-link-button" onClick={onLogout} type="button">
            Sair e tentar outra conta
          </button>
        </section>
      </main>
    );
  }

  return null;
}

function VariantRows({
  variants,
  onChange,
  onRemove,
  onAdd,
}: {
  variants: VariantForm[];
  onChange: (index: number, field: keyof VariantForm, value: string) => void;
  onRemove: (index: number) => void;
  onAdd: () => void;
}) {
  return (
    <div className="admin-variant-list">
      {variants.map((variant, index) => (
        <fieldset className="admin-variant" key={index}>
          <legend>Variação {index + 1}</legend>
          <label>
            <span>Nome da variação</span>
            <input
              maxLength={60}
              placeholder="Ex.: 100 ml, P, M ou G"
              value={variant.label}
              onChange={(event) => onChange(index, "label", event.target.value)}
              required
            />
          </label>
          <label>
            <span>Preço (R$)</span>
            <input
              inputMode="decimal"
              min="0.01"
              placeholder="0,00"
              step="0.01"
              type="number"
              value={variant.price}
              onChange={(event) => onChange(index, "price", event.target.value)}
              required
            />
          </label>
          <label>
            <span>Preço anterior (opcional)</span>
            <input
              inputMode="decimal"
              min={variant.price || "0.01"}
              placeholder="Sem promoção"
              step="0.01"
              type="number"
              value={variant.compareAtPrice}
              onChange={(event) => onChange(index, "compareAtPrice", event.target.value)}
            />
          </label>
          <label>
            <span>Estoque</span>
            <input
              min="0"
              step="1"
              type="number"
              value={variant.stock}
              onChange={(event) => onChange(index, "stock", event.target.value)}
              required
            />
          </label>
          <label>
            <span>Código (opcional)</span>
            <input
              autoCapitalize="characters"
              maxLength={80}
              placeholder="SKU"
              value={variant.sku}
              onChange={(event) => onChange(index, "sku", event.target.value)}
            />
          </label>
          {variants.length > 1 && (
            <button
              className="admin-variant-remove"
              onClick={() => onRemove(index)}
              type="button"
            >
              <X size={15} /> Remover variação
            </button>
          )}
        </fieldset>
      ))}
      {variants.length < 20 && (
        <button className="admin-button admin-button--secondary" onClick={onAdd} type="button">
          <Plus size={16} /> Adicionar tamanho ou volume
        </button>
      )}
    </div>
  );
}

function ProductEditor({
  product,
  busy,
  error,
  onCancel,
  onDelete,
  onSave,
}: {
  product: AdminProduct | null;
  busy: boolean;
  error: string;
  onCancel: () => void;
  onDelete: (product: AdminProduct) => Promise<void>;
  onSave: (draft: ProductDraft, file: File | null, altText: string) => Promise<void>;
}) {
  const [category, setCategory] = useState<CatalogCategory>(product?.category ?? "clothing");
  const [name, setName] = useState(product?.name ?? "");
  const [brand, setBrand] = useState(product?.brand ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [audience, setAudience] = useState<PerfumeAudience>(
    product?.audience ?? "Unissex",
  );
  const [clothingType, setClothingType] = useState<ClothingType>(
    product?.clothing_type ?? "Blusas",
  );
  const [family, setFamily] = useState(product?.family ?? "");
  const [volumeMl, setVolumeMl] = useState(
    product?.volume_ml ? String(product.volume_ml) : "",
  );
  const [status, setStatus] = useState<ProductStatus>(product?.status ?? "draft");
  const [isNew, setIsNew] = useState(product?.is_new ?? false);
  const [isFeatured, setIsFeatured] = useState(product?.is_featured ?? false);
  const [variants, setVariants] = useState<VariantForm[]>(
    product?.product_variants.length
      ? product.product_variants.map((variant) => ({
          label: variant.label,
          sku: variant.sku ?? "",
          price: String(variant.price),
          compareAtPrice:
            variant.compare_at_price === null
              ? ""
              : String(variant.compare_at_price),
          stock: String(variant.stock),
        }))
      : [{ label: "", sku: "", price: "", compareAtPrice: "", stock: "0" }],
  );
  const [file, setFile] = useState<File | null>(null);
  const [altText, setAltText] = useState(product?.product_images[0]?.alt_text ?? "");
  const [localError, setLocalError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [filePreview, setFilePreview] = useState("");
  const preview = filePreview || product?.product_images[0]?.url || null;

  useEffect(() => {
    if (!file) {
      setFilePreview("");
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    setFilePreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [file]);

  const updateVariant = (
    index: number,
    field: keyof VariantForm,
    value: string,
  ) => {
    setVariants((current) =>
      current.map((variant, rowIndex) =>
        rowIndex === index ? { ...variant, [field]: value } : variant,
      ),
    );
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError("");
    const mappedVariants = variants.map((variant) => ({
      label: variant.label.trim(),
      sku: variant.sku.trim() || null,
      price: Number(variant.price),
      compareAtPrice: variant.compareAtPrice
        ? Number(variant.compareAtPrice)
        : null,
      stock: Number(variant.stock),
    }));
    if (
      mappedVariants.some(
        (variant) =>
          !variant.label ||
          !Number.isFinite(variant.price) ||
          variant.price <= 0 ||
          !Number.isInteger(variant.stock) ||
          variant.stock < 0 ||
          (variant.compareAtPrice !== null &&
            (!Number.isFinite(variant.compareAtPrice) ||
              variant.compareAtPrice < variant.price)),
      ) ||
      new Set(mappedVariants.map((variant) => variant.label.toLocaleLowerCase())).size !==
        mappedVariants.length
    ) {
      setLocalError(
        "Revise as variações: cada uma precisa de um nome, preço válido e estoque. Os nomes não podem se repetir.",
      );
      return;
    }
    if (file && !altText.trim()) {
      setLocalError("Escreva uma descrição curta para a foto do produto.");
      return;
    }

    void onSave(
      {
        category,
        name: name.trim(),
        brand: brand.trim(),
        description: description.trim(),
        audience: category === "perfume" ? audience : null,
        clothingType: category === "clothing" ? clothingType : null,
        family: category === "perfume" ? family.trim() : "",
        volumeMl:
          category === "perfume" && volumeMl
            ? Number(volumeMl)
            : null,
        status,
        isNew,
        isFeatured,
        variants: mappedVariants,
      },
      file,
      altText.trim() || name.trim(),
    );
  };

  return (
    <section className="admin-editor" aria-labelledby="admin-editor-title">
      <div className="admin-editor-heading">
        <button className="admin-back-button" onClick={onCancel} type="button">
          <ArrowLeft size={17} /> Voltar aos produtos
        </button>
        <p className="admin-eyebrow">Cadastro de produto</p>
        <h2 id="admin-editor-title">{product ? "Editar produto" : "Adicionar produto"}</h2>
        <p>Preencha as informações que os clientes verão na loja.</p>
      </div>
      <form className="admin-product-form" onSubmit={submit}>
        <fieldset className="admin-form-section">
          <legend>Informações principais</legend>
          <div className="admin-form-grid">
            <label>
              <span>O que você está cadastrando?</span>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value as CatalogCategory)}
              >
                <option value="clothing">Roupa</option>
                <option value="perfume">Perfume</option>
              </select>
            </label>
            <label>
              <span>Nome do produto</span>
              <input
                autoComplete="off"
                maxLength={120}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ex.: Vestido midi"
                required
              />
            </label>
            <label>
              <span>Marca (opcional)</span>
              <input
                maxLength={120}
                value={brand}
                onChange={(event) => setBrand(event.target.value)}
                placeholder="Nome da marca"
              />
            </label>
            {category === "perfume" && (
              <>
                <label>
                  <span>Categoria</span>
                  <select
                    onChange={(event) =>
                      setAudience(event.target.value as PerfumeAudience)
                    }
                    value={audience}
                  >
                    {perfumeAudiences.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Família olfativa (opcional)</span>
                  <input
                    maxLength={120}
                    value={family}
                    onChange={(event) => setFamily(event.target.value)}
                    placeholder="Ex.: Floral"
                  />
                </label>
                <label>
                  <span>Volume em ml (opcional)</span>
                  <input
                    inputMode="numeric"
                    max="5000"
                    min="1"
                    onChange={(event) => setVolumeMl(event.target.value)}
                    placeholder="Ex.: 100"
                    type="number"
                    value={volumeMl}
                  />
                </label>
              </>
            )}
            {category === "clothing" && (
              <label>
                <span>Tipo de roupa</span>
                <select
                  onChange={(event) =>
                    setClothingType(event.target.value as ClothingType)
                  }
                  value={clothingType}
                >
                  {clothingTypes.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
            )}
            <label className="admin-form-span">
              <span>Descrição</span>
              <textarea
                maxLength={3000}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Conte aos clientes sobre este produto."
                rows={4}
                value={description}
              />
            </label>
          </div>
        </fieldset>

        <fieldset className="admin-form-section">
          <legend>Preço e estoque</legend>
          <p className="admin-form-hint">
            Crie uma variação para cada tamanho, cor ou volume que tenha estoque separado.
          </p>
          <VariantRows
            variants={variants}
            onAdd={() =>
              setVariants((current) => [
                ...current,
                { label: "", sku: "", price: "", compareAtPrice: "", stock: "0" },
              ])
            }
            onChange={updateVariant}
            onRemove={(index) =>
              setVariants((current) => current.filter((_, rowIndex) => rowIndex !== index))
            }
          />
        </fieldset>

        <fieldset className="admin-form-section">
          <legend>Foto do produto</legend>
          <p className="admin-form-hint">
            Escolha uma imagem JPG, PNG ou WebP de até 3 MB.
          </p>
          <label className="admin-image-picker">
            <input
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => {
                const nextFile = event.target.files?.[0] ?? null;
                if (nextFile && nextFile.size > 3 * 1024 * 1024) {
                  setLocalError("A imagem precisa ter até 3 MB.");
                  event.target.value = "";
                  return;
                }
                setLocalError("");
                setFile(nextFile);
                if (nextFile && !altText) setAltText(name);
              }}
              type="file"
            />
            {preview ? (
              <img alt="" src={preview} />
            ) : (
              <span className="admin-image-placeholder"><FileImage size={26} /> Nenhuma foto escolhida</span>
            )}
            <span className="admin-button admin-button--secondary">
              <Upload size={16} /> {file ? "Escolher outra foto" : "Escolher foto"}
            </span>
          </label>
          {file && (
            <label className="admin-image-alt">
              <span>Descrição da foto para acessibilidade</span>
              <input
                maxLength={180}
                onChange={(event) => setAltText(event.target.value)}
                value={altText}
                required
              />
            </label>
          )}
        </fieldset>

        <fieldset className="admin-form-section">
          <legend>Exibição na loja</legend>
          <div className="admin-form-grid">
            <label>
              <span>Situação</span>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as ProductStatus)}
              >
                <option value="draft">Rascunho — não aparece na loja</option>
                <option value="published">Publicado — aparece na loja</option>
              </select>
            </label>
            <label className="admin-check-field">
              <input
                checked={isFeatured}
                onChange={(event) => setIsFeatured(event.target.checked)}
                type="checkbox"
              />
              <span>Destacar este produto na loja</span>
            </label>
            <label className="admin-check-field">
              <input
                checked={isNew}
                onChange={(event) => setIsNew(event.target.checked)}
                type="checkbox"
              />
              <span>Marcar como novidade</span>
            </label>
          </div>
        </fieldset>

        {(localError || error) && (
          <p className="admin-alert admin-alert--error" role="alert">
            <AlertCircle size={17} /> {localError || error}
          </p>
        )}
        <div className="admin-form-actions">
          {product && (
            <button
              className="admin-button admin-button--danger-outline"
              onClick={() => setConfirmDelete(true)}
              type="button"
            >
              <Trash2 size={16} /> Excluir produto
            </button>
          )}
          <div className="admin-form-actions__right">
            <button className="admin-button admin-button--secondary" onClick={onCancel} type="button">
              Cancelar
            </button>
            <button className="admin-button admin-button--primary" disabled={busy} type="submit">
              {busy ? <Loader2 className="admin-spin" size={17} /> : <Check size={17} />}
              {busy ? "Salvando…" : "Salvar produto"}
            </button>
          </div>
        </div>
      </form>
      {confirmDelete && product && (
        <div className="admin-confirm-backdrop">
          <section
            aria-labelledby="admin-delete-title"
            aria-modal="true"
            className="admin-confirm-dialog"
            role="alertdialog"
          >
            <span className="admin-confirm-icon"><AlertCircle size={22} /></span>
            <h3 id="admin-delete-title">Excluir “{product.name}”?</h3>
            <p>
              O produto, as variações e a foto serão removidos. Esta ação não pode ser desfeita.
            </p>
            <div>
              <button className="admin-button admin-button--secondary" onClick={() => setConfirmDelete(false)} type="button">
                Manter produto
              </button>
              <button
                className="admin-button admin-button--danger"
                disabled={busy}
                onClick={() => void onDelete(product)}
                type="button"
              >
                {busy ? <Loader2 className="admin-spin" size={17} /> : <Trash2 size={16} />}
                Excluir produto
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}

export function AdminPage() {
  const [screen, setScreen] = useState<AuthScreen>("loading");
  const [auth, setAuth] = useState<AdminAuthState>({ state: "signed_out" });
  const [authError, setAuthError] = useState("");
  const [section, setSection] = useState<PanelSection>("overview");
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [activity, setActivity] = useState<AdminActivity[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productError, setProductError] = useState("");
  const [saving, setSaving] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<AdminProduct | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<"all" | CatalogCategory>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | ProductStatus>("all");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const checkSession = useCallback(async () => {
    setScreen("loading");
    setAuthError("");
    try {
      const result = await getAdminSession();
      setAuth(result);
      setScreen(result.state);
      if (result.state === "mfa_challenge") {
        try {
          const factor = await postAdminAuth({ action: "enroll" });
          if (factor.state === "mfa_setup") {
            setAuth({ state: "mfa_setup", email: result.email });
            setScreen("mfa_setup");
          } else if (factor.state === "mfa_challenge" && factor.factorId) {
            setAuth({ ...result, factorId: factor.factorId });
          } else if (factor.state === "ready") {
            setAuth({ state: "ready", email: result.email ?? "" });
            setScreen("ready");
          }
        } catch (error) {
          setAuthError(getErrorMessage(error));
        }
      }
    } catch (error) {
      if (error instanceof AdminApiError && error.status === 503) {
        setScreen("unavailable");
        setAuthError(error.message);
      } else {
        setScreen("unavailable");
        setAuthError(getErrorMessage(error));
      }
    }
  }, []);

  const loadProducts = useCallback(async () => {
    setProductsLoading(true);
    setProductError("");
    try {
      const response = await getAdminProducts();
      setProducts(response.products);
      setActivity(response.activity);
    } catch (error) {
      setProductError(getErrorMessage(error));
      if (error instanceof AdminApiError && error.status === 401) {
        setAuth({ state: "signed_out" });
        setScreen("signed_out");
      }
    } finally {
      setProductsLoading(false);
    }
  }, []);

  useEffect(() => {
    void checkSession();
  }, [checkSession]);

  useEffect(() => {
    if (screen === "ready") void loadProducts();
  }, [loadProducts, screen]);

  useEffect(() => {
    document.title =
      screen === "ready" ? "Painel administrativo — Espaço da Mazé" : "Acesso administrativo — Espaço da Mazé";
    return () => {
      document.title = "Espaço da Maze — Serviços, Roupas e Perfumes";
    };
  }, [screen]);

  const login = async (email: string, password: string) => {
    setAuthError("");
    const result = await postAdminAuth({ action: "login", email, password });
    if (
      result.state !== "mfa_setup" &&
      result.state !== "mfa_challenge" &&
      result.state !== "ready"
    ) {
      throw new Error("Não foi possível iniciar a confirmação em duas etapas.");
    }
    const nextAuth: AdminAuthState =
      result.state === "ready"
        ? { state: "ready", email: result.email ?? email }
        : {
            state: result.state,
            email: result.email ?? email,
            factorId: result.factorId,
          };
    setAuth(nextAuth);
    setScreen(nextAuth.state);
    if (nextAuth.state === "mfa_challenge" && !nextAuth.factorId) {
      const factor = await postAdminAuth({ action: "enroll" });
      if (factor.state === "mfa_challenge" && factor.factorId) {
        setAuth({ ...nextAuth, factorId: factor.factorId });
      } else if (factor.state === "mfa_setup") {
        setAuth({ state: "mfa_setup", email: nextAuth.email });
        setScreen("mfa_setup");
      }
    }
  };

  const verifyMfa = async (factorId: string, code: string) => {
    if (!factorId) throw new Error("Atualize a página e tente novamente.");
    const result = await postAdminAuth({
      action: "verify",
      factorId,
      code,
    });
    if (result.state !== "ready") {
      throw new Error("A confirmação não foi concluída. Tente novamente.");
    }
    setAuth({ state: "ready", email: auth.email ?? "" });
    setScreen("ready");
    setNotice({ tone: "success", message: "Acesso confirmado. Bem-vinda ao painel." });
  };

  const logout = async () => {
    setSaving(true);
    try {
      await postAdminAuth({ action: "logout" });
    } catch (error) {
      setNotice({ tone: "error", message: getErrorMessage(error) });
      return;
    } finally {
      setSaving(false);
    }
    setProducts([]);
    setAuth({ state: "signed_out" });
    setScreen("signed_out");
    setNotice(null);
  };

  const saveProduct = async (
    draft: ProductDraft,
    file: File | null,
    altText: string,
  ) => {
    setSaving(true);
    setProductError("");
    setNotice(null);
    try {
      const id = await saveAdminProduct(draft, editingProduct?.id);
      if (file) {
        try {
          const dataUrl = await readFileAsDataUrl(file);
          const result = await uploadAdminProductImage(id, altText, dataUrl);
          if (result.warning) {
            setNotice({ tone: "info", message: result.warning });
          }
        } catch (error) {
          const photoError = getErrorMessage(error);
          await loadProducts();
          throw new Error(
            `As informações do produto foram salvas, mas a foto não foi atualizada. ${photoError}`,
          );
        }
      }
      await loadProducts();
      setEditorOpen(false);
      setEditingProduct(null);
      setSection("products");
      setNotice((current) =>
        current?.tone === "info"
          ? current
          : {
              tone: "success",
              message:
                draft.status === "published"
                  ? "Produto salvo e publicado na loja."
                  : "Produto salvo como rascunho.",
            },
      );
    } catch (error) {
      setProductError(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const removeProduct = async (product: AdminProduct) => {
    setSaving(true);
    try {
      const result = await deleteAdminProduct(product.id);
      await loadProducts();
      setEditorOpen(false);
      setEditingProduct(null);
      setSection("products");
      setNotice(
        result.warning
          ? { tone: "info", message: result.warning }
          : { tone: "success", message: `“${product.name}” foi excluído.` },
      );
    } catch (error) {
      setProductError(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("pt-BR");
    return products.filter((product) => {
      const matchesCategory =
        filterCategory === "all" || product.category === filterCategory;
      const matchesStatus =
        filterStatus === "all" || product.status === filterStatus;
      const matchesSearch =
        !query ||
        `${product.name} ${product.brand ?? ""} ${product.slug}`
          .toLocaleLowerCase("pt-BR")
          .includes(query);
      return matchesCategory && matchesStatus && matchesSearch;
    });
  }, [filterCategory, filterStatus, products, search]);

  if (screen !== "ready") {
    return (
      <AdminSignIn
        email={auth.email ?? ""}
        error={authError}
        factorId={auth.factorId ?? ""}
        onLogout={() => {
          void postAdminAuth({ action: "logout" })
            .then(() => {
              setAuth({ state: "signed_out" });
              setScreen("signed_out");
            })
            .catch((error) => setAuthError(getErrorMessage(error)));
        }}
        onLogin={login}
        onRetry={() => void checkSession()}
        onVerify={verifyMfa}
        screen={screen}
      />
    );
  }

  const publishedCount = products.filter((product) => product.status === "published").length;
  const draftCount = products.length - publishedCount;
  const outOfStockCount = products.filter(
    (product) =>
      product.status === "published" &&
      product.product_variants.every((variant) => variant.stock === 0),
  ).length;
  const sectionTitle = editorOpen
    ? editingProduct
      ? "Editar produto"
      : "Adicionar produto"
    : section === "overview"
      ? "Início"
      : "Produtos";
  const pageTitle = editorOpen
    ? sectionTitle
    : section === "overview"
      ? "Olá, Mazé"
      : "Seus produtos";

  return (
    <div className="admin-app">
      <div className="admin-mobile-bar">
        <button
          aria-expanded={mobileNavOpen}
          aria-label={mobileNavOpen ? "Fechar menu do painel" : "Abrir menu do painel"}
          onClick={() => setMobileNavOpen((value) => !value)}
          type="button"
        >
          {mobileNavOpen ? <X size={20} /> : <LayoutDashboard size={20} />}
        </button>
        <span><b>M</b> Espaço da Mazé</span>
        <Link aria-label="Abrir a loja" to="/"><Store size={19} /></Link>
      </div>
      <div className="admin-layout">
        <aside className={`admin-sidebar${mobileNavOpen ? " is-open" : ""}`}>
          <Link className="admin-sidebar-brand" to="/">
            <span>M</span>
            <span><strong>ESPAÇO DA MAZÉ</strong><small>PAINEL ADMINISTRATIVO</small></span>
          </Link>
          <p className="admin-nav-label">MENU</p>
          <nav aria-label="Navegação do painel">
            <button
              className={section === "overview" && !editorOpen ? "is-active" : ""}
              onClick={() => {
                setSection("overview");
                setEditorOpen(false);
                setMobileNavOpen(false);
              }}
              type="button"
            >
              <LayoutDashboard size={18} /> Início
            </button>
            <button
              className={section === "products" || editorOpen ? "is-active" : ""}
              onClick={() => {
                setSection("products");
                setEditorOpen(false);
                setMobileNavOpen(false);
              }}
              type="button"
            >
              <Package size={18} /> Produtos
              <span className="admin-nav-count">{products.length}</span>
            </button>
          </nav>
          <div className="admin-sidebar-spacer" />
          <Link className="admin-sidebar-store" to="/">
            <Store size={17} /> Abrir loja <ArrowRight size={15} />
          </Link>
          <div className="admin-account">
            <span className="admin-account-avatar">{auth.email?.slice(0, 1).toUpperCase() ?? "A"}</span>
            <span className="admin-account-info">
              <strong>Administradora</strong>
              <small>{auth.email}</small>
            </span>
            <button
              aria-label="Sair do painel"
              disabled={saving}
              onClick={() => void logout()}
              title="Sair do painel"
              type="button"
            >
              <LogOut size={17} />
            </button>
          </div>
        </aside>

        <main className="admin-main">
          <header className="admin-topbar">
            <div>
              <p className="admin-breadcrumb">Painel <span>/</span> {sectionTitle}</p>
              <h1>{pageTitle}</h1>
            </div>
            <div className="admin-topbar-actions">
              <span className="admin-secure-pill"><ShieldCheck size={15} /> Acesso protegido</span>
              <Link className="admin-button admin-button--secondary" to="/">
                <Store size={16} /> Ver loja
              </Link>
            </div>
          </header>

          <div className="admin-content">
            {notice && (
              <div className={`admin-notice admin-notice--${notice.tone}`} role="status">
                {notice.tone === "success" ? <Check size={17} /> : <AlertCircle size={17} />}
                <span>{notice.message}</span>
                <button aria-label="Fechar aviso" onClick={() => setNotice(null)} type="button"><X size={16} /></button>
              </div>
            )}

            {editorOpen ? (
              <ProductEditor
                busy={saving}
                error={productError}
                key={editingProduct?.id ?? "new-product"}
                onCancel={() => {
                  setEditorOpen(false);
                  setEditingProduct(null);
                  setProductError("");
                }}
                onDelete={removeProduct}
                onSave={saveProduct}
                product={editingProduct}
              />
            ) : section === "overview" ? (
              <section className="admin-overview" aria-labelledby="admin-overview-title">
                <div className="admin-page-heading">
                  <div>
                    <p className="admin-eyebrow">VISÃO GERAL</p>
                    <h2 id="admin-overview-title">Sua loja em um só lugar</h2>
                    <p>Acompanhe os produtos e faça atualizações quando precisar.</p>
                  </div>
                  <button
                    className="admin-button admin-button--primary"
                    onClick={() => {
                      setEditingProduct(null);
                      setEditorOpen(true);
                      setSection("products");
                    }}
                    type="button"
                  >
                    <Plus size={17} /> Adicionar produto
                  </button>
                </div>

                {productError && (
                  <div className="admin-alert admin-alert--error" role="alert">
                    <AlertCircle size={18} />
                    <span>{productError}</span>
                    <button className="admin-text-button" onClick={() => void loadProducts()} type="button">Tentar novamente</button>
                  </div>
                )}

                <div className="admin-stat-grid" aria-busy={productsLoading}>
                  <article className="admin-stat-card">
                    <span className="admin-stat-icon"><Boxes size={19} /></span>
                    <span className="admin-stat-label">Produtos cadastrados</span>
                    <strong>{productsLoading ? "—" : products.length}</strong>
                    <small>Roupas e perfumes</small>
                  </article>
                  <article className="admin-stat-card">
                    <span className="admin-stat-icon admin-stat-icon--green"><Eye size={19} /></span>
                    <span className="admin-stat-label">Na loja</span>
                    <strong>{productsLoading ? "—" : publishedCount}</strong>
                    <small>Visíveis para os clientes</small>
                  </article>
                  <article className="admin-stat-card">
                    <span className="admin-stat-icon admin-stat-icon--amber"><FileImage size={19} /></span>
                    <span className="admin-stat-label">Rascunhos</span>
                    <strong>{productsLoading ? "—" : draftCount}</strong>
                    <small>Ainda não aparecem na loja</small>
                  </article>
                  <article className="admin-stat-card">
                    <span className="admin-stat-icon admin-stat-icon--red"><AlertCircle size={19} /></span>
                    <span className="admin-stat-label">Sem estoque</span>
                    <strong>{productsLoading ? "—" : outOfStockCount}</strong>
                    <small>Produtos publicados sem unidades</small>
                  </article>
                </div>

                <div className="admin-overview-grid">
                  <section className="admin-panel-card">
                    <div className="admin-panel-card-heading">
                      <div><h3>Atividade recente</h3><p>Últimas alterações nos produtos</p></div>
                      <Clock3 size={18} />
                    </div>
                    {activity.length ? (
                      <ol className="admin-activity-list">
                        {activity.map((item) => (
                          <li key={item.id}>
                            <span className={`admin-activity-dot admin-activity-dot--${item.action}`} />
                            <span><strong>{item.product_name}</strong><small>
                              {item.action === "created" ? "Produto cadastrado" : item.action === "updated" ? "Produto atualizado" : "Produto excluído"}
                            </small></span>
                            <time dateTime={item.created_at}>{formatDate(item.created_at)}</time>
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <div className="admin-empty-small">
                        <Clock3 size={22} />
                        <p>{productsLoading ? "Carregando atividades…" : "As alterações nos produtos aparecerão aqui."}</p>
                      </div>
                    )}
                  </section>
                  <section className="admin-panel-card admin-shortcuts">
                    <div className="admin-panel-card-heading">
                      <div><h3>Atalhos</h3><p>O que você gostaria de fazer?</p></div>
                      <ChevronDown size={18} />
                    </div>
                    <button onClick={() => { setSection("products"); setEditorOpen(false); }} type="button">
                      <span><Package size={18} /></span>
                      <span><strong>Ver produtos</strong><small>Consulte e atualize seus cadastros.</small></span>
                      <ArrowRight size={17} />
                    </button>
                    <button onClick={() => { setEditingProduct(null); setEditorOpen(true); setSection("products"); }} type="button">
                      <span><Plus size={18} /></span>
                      <span><strong>Adicionar produto</strong><small>Cadastre roupa ou perfume.</small></span>
                      <ArrowRight size={17} />
                    </button>
                    <Link to="/">
                      <span><Store size={18} /></span>
                      <span><strong>Abrir a loja</strong><small>Veja a página como os clientes.</small></span>
                      <ArrowRight size={17} />
                    </Link>
                  </section>
                </div>

                <div className={`admin-inventory-alert${outOfStockCount ? " is-attention" : ""}`}>
                  <span>{outOfStockCount ? <AlertCircle size={19} /> : <BadgeCheck size={19} />}</span>
                  <div>
                    <strong>{outOfStockCount ? "Produtos publicados sem estoque" : "Nenhum alerta de estoque"}</strong>
                    <p>
                      {outOfStockCount
                        ? `${outOfStockCount} produto${outOfStockCount === 1 ? "" : "s"} publicado${outOfStockCount === 1 ? "" : "s"} está${outOfStockCount === 1 ? "" : "ão"} sem unidades disponíveis.`
                        : "Os produtos publicados têm unidades cadastradas."}
                    </p>
                  </div>
                  <button onClick={() => { setSection("products"); setEditorOpen(false); }} type="button">Ver produtos</button>
                </div>
              </section>
            ) : (
              <section className="admin-products-view" aria-labelledby="admin-products-title">
                <div className="admin-page-heading">
                  <div>
                    <p className="admin-eyebrow">CADASTROS DA LOJA</p>
                    <h2 id="admin-products-title">Seus produtos</h2>
                    <p>Edite as informações ou escolha o que fica visível na loja.</p>
                  </div>
                  <button
                    className="admin-button admin-button--primary"
                    onClick={() => {
                      setEditingProduct(null);
                      setProductError("");
                      setEditorOpen(true);
                    }}
                    type="button"
                  >
                    <Plus size={17} /> Adicionar produto
                  </button>
                </div>

                {productError && (
                  <div className="admin-alert admin-alert--error" role="alert">
                    <AlertCircle size={18} />
                    <span>{productError}</span>
                    <button className="admin-text-button" onClick={() => void loadProducts()} type="button">Tentar novamente</button>
                  </div>
                )}

                <div className="admin-list-toolbar">
                  <label className="admin-search">
                    <Search size={17} />
                    <span className="sr-only">Buscar produtos</span>
                    <input
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Buscar por nome ou marca"
                      type="search"
                      value={search}
                    />
                  </label>
                  <label>
                    <span className="sr-only">Filtrar por categoria</span>
                    <select
                      onChange={(event) => setFilterCategory(event.target.value as typeof filterCategory)}
                      value={filterCategory}
                    >
                      <option value="all">Todas as categorias</option>
                      <option value="clothing">Roupas</option>
                      <option value="perfume">Perfumes</option>
                    </select>
                  </label>
                  <label>
                    <span className="sr-only">Filtrar por situação</span>
                    <select
                      onChange={(event) => setFilterStatus(event.target.value as typeof filterStatus)}
                      value={filterStatus}
                    >
                      <option value="all">Todas as situações</option>
                      <option value="published">Publicados</option>
                      <option value="draft">Rascunhos</option>
                    </select>
                  </label>
                </div>

                {productsLoading ? (
                  <div className="admin-list-state" aria-live="polite">
                    <Loader2 className="admin-spin" size={24} /> Carregando produtos…
                  </div>
                ) : filteredProducts.length ? (
                  <div className="admin-product-list" aria-live="polite">
                    <div className="admin-product-list-head">
                      <span>Produto</span><span>Categoria</span><span>Preço</span><span>Estoque</span><span>Situação</span><span>Ação</span>
                    </div>
                    {filteredProducts.map((product) => {
                      const variantStock = product.product_variants.reduce((sum, item) => sum + item.stock, 0);
                      const firstVariant = product.product_variants[0];
                      const image = product.product_images[0]?.url;
                      return (
                        <article className="admin-product-row" key={product.id}>
                          <div className="admin-product-name">
                            <span className="admin-product-thumb">
                              {image ? <img alt="" src={image} /> : <Package size={20} />}
                            </span>
                            <span><strong>{product.name}</strong><small>{product.brand || "Sem marca"}</small></span>
                          </div>
                          <span className="admin-product-category">
                            {categoryLabels[product.category]} ·{" "}
                            {product.category === "perfume"
                              ? product.audience
                              : product.clothing_type}
                          </span>
                          <span className="admin-product-price">{firstVariant ? formatPrice(firstVariant.price) : "—"}</span>
                          <span className={variantStock === 0 ? "admin-stock-empty" : ""}>{variantStock} un.</span>
                          <span><span className={`admin-status-pill admin-status-pill--${product.status}`}>{statusLabels[product.status]}</span></span>
                          <button
                            className="admin-row-edit"
                            onClick={() => {
                              setEditingProduct(product);
                              setProductError("");
                              setEditorOpen(true);
                            }}
                            type="button"
                          >
                            Editar <ArrowRight size={15} />
                          </button>
                        </article>
                      );
                    })}
                    <p className="admin-list-count">{filteredProducts.length} produto{filteredProducts.length === 1 ? "" : "s"}</p>
                  </div>
                ) : (
                  <div className="admin-empty-products">
                    <span><Package size={27} /></span>
                    <h3>{products.length ? "Nenhum produto encontrado" : "Ainda não há produtos cadastrados"}</h3>
                    <p>
                      {products.length
                        ? "Tente mudar a busca ou os filtros."
                        : "Quando cadastrar um produto, você poderá decidir se ele aparece na loja."}
                    </p>
                    {!products.length && (
                      <button
                        className="admin-button admin-button--primary"
                        onClick={() => { setEditingProduct(null); setEditorOpen(true); }}
                        type="button"
                      >
                        <Plus size={17} /> Adicionar primeiro produto
                      </button>
                    )}
                  </div>
                )}
              </section>
            )}

            <footer className="admin-footer">
              <span><ShieldCheck size={14} /> Área restrita a administradores</span>
              <a
                href="https://github.com/NeuralSync001/mazestudio/blob/main/docs/admin-setup.md"
                rel="noreferrer"
                target="_blank"
              >
                <HelpCircle size={14} /> Precisa de ajuda?
              </a>
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
}
