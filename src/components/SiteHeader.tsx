import { Link } from "react-router-dom";
import { BooksyAction } from "./BooksyAction";

type SiteHeaderProps = {
  cartCount?: number;
};

const navigation = [
  { label: "Serviços", to: "/#servicos" },
  { label: "Roupas", to: "/roupas" },
  { label: "Perfumes", to: "/perfumes" },
];

export function SiteHeader({ cartCount }: SiteHeaderProps) {
  return (
    <header className="relative z-30 bg-paper px-5 pt-3 sm:px-8 sm:pt-4">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-plum/10 pb-3">
        <Link
          className="text-xs font-black tracking-[0.12em] text-plum sm:text-sm"
          to="/"
        >
          ESPAÇO DA MAZE
        </Link>

        <nav
          aria-label="Navegação principal"
          className="order-3 flex w-full items-center justify-center gap-1 sm:order-none sm:w-auto sm:gap-1.5"
        >
          {navigation.map(({ label, to }) => (
            <Link
              key={label}
              className="rounded-full px-2 py-1 text-[0.55rem] font-medium uppercase tracking-[0.1em] text-plum transition-colors hover:bg-lavender/30 sm:px-2.5 sm:text-[0.6rem]"
              to={to}
            >
              {label}
            </Link>
          ))}
        </nav>

        <BooksyAction
          className="px-3 py-1.5 text-[0.6rem] sm:px-3.5 sm:py-1.5 sm:text-[0.65rem]"
          fallbackTo="/#agendamento"
          label="Agendar"
        />
        {cartCount !== undefined && (
          <span
            aria-live="polite"
            className="text-[0.55rem] font-semibold uppercase tracking-[0.1em] text-plum sm:text-[0.6rem]"
          >
            Sacola ({cartCount})
          </span>
        )}
      </div>
    </header>
  );
}
