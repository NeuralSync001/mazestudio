import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { BooksyAction } from "../components/BooksyAction";

type CollectionPageProps = {
  category: "roupas" | "perfumes";
};

const categoryDetails = {
  roupas: {
    title: "Roupas",
    label: "Moda",
    description: "Esta página está reservada para a coleção de roupas.",
    alternate: "perfumes" as const,
  },
  perfumes: {
    title: "Perfumes",
    label: "Fragrâncias",
    description: "Esta página está reservada para a coleção de perfumes.",
    alternate: "roupas" as const,
  },
};

export function CollectionPage({ category }: CollectionPageProps) {
  const details = categoryDetails[category];
  const alternate = categoryDetails[details.alternate];

  return (
    <main className="px-5 pb-16 pt-16 sm:px-8 sm:pb-24 sm:pt-24">
      <div className="mx-auto max-w-xl">
        <section className="relative mx-auto max-w-md overflow-hidden rounded-2xl bg-lavender/20 px-5 py-6 text-center sm:px-7 sm:py-8">
          <div
            aria-hidden="true"
            className="absolute -right-6 -top-8 h-28 w-28 rounded-full border border-paper/80"
          />
          <div className="relative">
            <p className="mb-2 text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-plum/60">
              Espaço da Maze / {details.label}
            </p>
            <h1 className="text-2xl font-black uppercase leading-[0.9] tracking-tight text-plum sm:text-3xl">
              {details.title}
            </h1>
            <p className="mx-auto mt-3 max-w-xs text-[0.7rem] leading-relaxed text-plum/75 sm:text-xs">
              {details.description} O conteúdo será adicionado em breve.
            </p>
            <Link
              className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-plum/20 px-3 py-1.5 text-[0.65rem] font-semibold text-plum transition-colors hover:bg-paper/70"
              to="/"
            >
              <ArrowLeft aria-hidden="true" size={13} />
              Voltar ao início
            </Link>
          </div>
        </section>

        <section
          aria-label={`Espaços reservados para ${details.title.toLowerCase()}`}
          className="mx-auto mt-4 grid max-w-md gap-2 sm:grid-cols-3"
        >
          {["01", "02", "03"].map((number) => (
            <div
              className="flex h-16 flex-col justify-between rounded-lg border border-plum/10 bg-paper p-2.5"
              key={number}
            >
              <span className="text-[0.55rem] font-semibold text-plum/40">
                {number}
              </span>
              <span className="text-[0.55rem] font-medium uppercase tracking-wider text-plum/60">
                Espaço reservado
              </span>
            </div>
          ))}
        </section>

        <div className="mx-auto mt-4 flex max-w-md flex-col items-center justify-between gap-3 rounded-xl border border-plum/10 p-3 text-center sm:flex-row sm:text-left">
          <div>
            <p className="text-xs font-bold text-plum">
              Continue explorando
            </p>
            <Link
              className="mt-1 inline-flex items-center gap-1.5 text-[0.65rem] text-plum/70 hover:text-plum"
              to={`/${details.alternate}`}
            >
              {alternate.title}
              <ArrowRight aria-hidden="true" size={12} />
            </Link>
          </div>
          <BooksyAction
            className="px-3 py-1.5 text-[0.6rem]"
            fallbackTo="/#agendamento"
            label="Agendar serviço"
          />
        </div>
      </div>
    </main>
  );
}
