import { FadeIn } from "./FadeIn";
import { Magnet } from "./Magnet";

export function HeroSection() {
  return (
    <section className="hero-ambient relative isolate min-h-[calc(100svh-3.75rem)] overflow-hidden px-5">
      <div className="relative mx-auto flex min-h-[calc(100svh-3.75rem)] w-full max-w-6xl flex-col items-center text-center md:block">
        <FadeIn
          delay={0.15}
          y={24}
          className="relative z-10 pt-8 md:absolute md:inset-x-0 md:top-[4%] md:pt-0"
        >
          <h1
            className="hero-heading text-[clamp(2rem,8.5vw,7rem)] font-black uppercase leading-[0.9] tracking-[-0.06em]"
            data-maze-pinball-obstacle="top"
          >
            Oi, eu sou a Maze
          </h1>
        </FadeIn>

        <FadeIn
          delay={0.28}
          duration={1.1}
          y={18}
          className="relative z-0 mx-auto mt-8 mb-4 w-[min(82vw,320px)] md:absolute md:inset-x-0 md:top-[28%] md:mt-0 md:mb-0 md:w-[min(40vw,420px)]"
        >
          <div
            aria-hidden="true"
            className="absolute left-1/2 top-1/2 -z-10 h-2/3 w-2/3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-lavender/30 blur-[70px]"
          />
          <Magnet mobilePinball padding={24} maxOffset={48}>
            <img
              src="/maze-portrait.png"
              alt="Ilustração 3D de Maze"
              className="block h-auto w-full object-contain drop-shadow-[0_24px_50px_rgba(185,155,218,0.2)]"
              draggable={false}
            />
          </Magnet>
        </FadeIn>

        <FadeIn
          delay={0.6}
          y={10}
          className="relative z-20 mt-auto pb-6 md:absolute md:bottom-7 md:right-5 md:mt-0 md:pb-0 md:text-right"
        >
          <p
            className="ml-auto max-w-[7rem] text-[0.55rem] font-medium uppercase tracking-[0.28em] text-plum/50"
            data-maze-pinball-obstacle="bottom"
          >
            Serviços • Moda • Fragrâncias
          </p>
        </FadeIn>
      </div>
    </section>
  );
}
