import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Clock3,
  Image as ImageIcon,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { FadeIn } from "./FadeIn";
import { BooksyAction, booksyBookingUrl } from "./BooksyAction";

const services = Array.from({ length: 20 }, (_, index) => {
  const number = String(index + 1).padStart(2, "0");

  return {
    number,
    title: `Serviço ${number}`,
    description: "O que é e o que esse serviço faz.",
  };
});

export function ServicesSection() {
  const [showAllServices, setShowAllServices] = useState(false);
  const visibleServices = showAllServices ? services : services.slice(0, 4);

  return (
    <section
      className="scroll-mt-24 border-t border-champagne/30 px-5 py-14 sm:px-8 sm:py-20 md:py-24"
      id="servicos"
    >
      <div className="mx-auto max-w-5xl">
        <FadeIn className="mx-auto mb-4 max-w-md text-center sm:mb-5">
          <p className="mb-1.5 text-[0.55rem] font-semibold uppercase tracking-[0.22em] text-plum/60">
            Espaço da Maze
          </p>
          <h2 className="text-lg font-black uppercase leading-[0.95] tracking-tight text-plum sm:text-xl">
            Serviços
          </h2>
          <p className="mx-auto mt-1.5 max-w-sm text-[0.65rem] leading-relaxed text-plum/70 sm:text-xs">
            Conheça os atendimentos do Espaço da Maze. As informações serão
            adicionadas aqui.
          </p>
        </FadeIn>

        <div
          className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4"
          id="lista-servicos"
        >
          {visibleServices.map((service, index) => (
            <FadeIn
              key={service.number}
              delay={(index % 4) * 0.04}
              y={12}
            >
              <article className="flex h-full items-center gap-2 rounded-lg border border-plum/10 bg-paper p-2 transition-transform duration-300 hover:-translate-y-1">
                <div
                  aria-label={`Espaço reservado para foto do ${service.title}`}
                  className="flex h-11 w-11 shrink-0 flex-col items-center justify-center gap-0.5 rounded-md bg-lavender/25 text-plum/55"
                  role="img"
                >
                  <ImageIcon aria-hidden="true" size={14} strokeWidth={1.5} />
                  <span className="text-[0.45rem] font-semibold uppercase tracking-wide">
                    Foto
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[0.45rem] font-semibold tracking-[0.08em] text-plum/45">
                    {service.number} / SERVIÇO
                  </p>
                  <h3 className="mt-0.5 text-[0.7rem] font-bold uppercase tracking-wide text-plum">
                    {service.title}
                  </h3>
                  <p className="mt-0.5 text-[0.55rem] leading-snug text-plum/65">
                    {service.description}
                  </p>
                  <Link
                    className="mt-0.5 inline-flex items-center gap-1 text-[0.55rem] font-semibold text-plum transition-colors hover:text-plum/70"
                    to="/#agendamento"
                  >
                    Agendar serviço
                    <ArrowRight aria-hidden="true" size={10} />
                  </Link>
                </div>
              </article>
            </FadeIn>
          ))}
        </div>

        <button
          aria-controls="lista-servicos"
          aria-expanded={showAllServices}
          className="mx-auto mt-4 flex items-center gap-1 rounded-full border border-plum/20 px-3 py-1.5 text-[0.6rem] font-semibold uppercase tracking-wide text-plum transition-colors hover:bg-lavender/25"
          onClick={() => setShowAllServices((show) => !show)}
          type="button"
        >
          {showAllServices ? "Ver menos" : "Ver mais"}
          {showAllServices ? (
            <ArrowUp aria-hidden="true" size={12} />
          ) : (
            <ArrowDown aria-hidden="true" size={12} />
          )}
        </button>
      </div>
    </section>
  );
}

export function BookingSection() {
  return (
    <section className="scroll-mt-24 px-5 pb-16 sm:px-8 sm:pb-20" id="agendamento">
      <div className="mx-auto max-w-sm rounded-xl border border-plum/10 bg-lavender/15 px-4 py-4 text-center text-plum">
        <div className="flex flex-col items-center gap-2">
          <div>
            <p className="mb-1 flex items-center justify-center gap-1.5 text-[0.55rem] font-semibold uppercase tracking-[0.18em] text-plum/55">
              <Clock3 aria-hidden="true" size={12} />
              Agendamento
            </p>
            <h2 className="text-sm font-bold uppercase leading-tight">
              Agende seu horário
            </h2>
            <p className="mx-auto mt-1 max-w-xs text-[0.6rem] leading-relaxed text-plum/65">
              {booksyBookingUrl
                ? "Escolha um horário disponível diretamente pela agenda do Booksy."
                : "A área está pronta. O link público de agendamento do Booksy será conectado aqui."}
            </p>
          </div>
          <BooksyAction
            className="px-3 py-1.5 text-[0.55rem]"
            disabledWhenUnavailable
            fallbackTo="#agendamento"
            label="Abrir agenda do Booksy"
          />
        </div>
      </div>
    </section>
  );
}

export function CollectionsSection() {
  return (
    <section className="ambient-collections px-5 py-14 sm:px-8 sm:py-20">
      <div className="mx-auto max-w-md">
        <FadeIn className="mb-4 text-center sm:mb-5">
          <p className="mb-1 text-[0.55rem] font-semibold uppercase tracking-[0.22em] text-plum/60">
            Explore
          </p>
          <h2 className="text-sm font-bold uppercase tracking-tight text-plum">
            Nossas páginas
          </h2>
        </FadeIn>

        <div className="grid gap-2 sm:grid-cols-2">
          <CollectionCard
            description="Área de roupas em preparação."
            number="01"
            title="Roupas"
            to="/roupas"
            variant="lavender"
          />
          <CollectionCard
            description="Área de perfumes em preparação."
            number="02"
            title="Perfumes"
            to="/perfumes"
            variant="plum"
          />
        </div>
      </div>
    </section>
  );
}

type CollectionCardProps = {
  number: string;
  title: string;
  description: string;
  to: string;
  variant: "lavender" | "plum";
};

function CollectionCard({
  number,
  title,
  description,
  to,
  variant,
}: CollectionCardProps) {
  const isLavender = variant === "lavender";

  return (
    <Link
      className={`group relative flex min-h-16 flex-col justify-between overflow-hidden rounded-md p-2.5 transition-transform duration-300 hover:-translate-y-1 sm:min-h-20 ${
        isLavender
          ? "bg-lavender/25 text-plum"
          : "border border-plum/10 bg-plum/[0.03] text-plum"
      }`}
      to={to}
    >
      <span className="text-[0.45rem] font-semibold tracking-[0.12em] opacity-60">
        {number} / ESPAÇO DA MAZE
      </span>
      <div className="relative z-10 flex items-end justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold uppercase leading-none">
            {title}
          </h3>
          <p className="mt-1 text-[0.55rem] opacity-75">{description}</p>
        </div>
        <span className="mb-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-current transition-transform duration-300 group-hover:translate-x-1">
          <ArrowRight aria-hidden="true" size={11} />
        </span>
      </div>
      <span
        aria-hidden="true"
        className={`absolute -right-4 -top-6 h-16 w-16 rounded-full border ${
          isLavender ? "border-paper/60" : "border-lavender/35"
        }`}
      />
    </Link>
  );
}
