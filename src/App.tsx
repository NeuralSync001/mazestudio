import { useLayoutEffect, useState } from "react";
import {
  BrowserRouter,
  Link,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { SiteHeader } from "./components/SiteHeader";
import { HomePage } from "./pages/HomePage";
import { MazeClothingPage } from "./pages/MazeClothingPage";
import { PerfumeStorePage } from "./pages/PerfumeStorePage";
import { AdminPage } from "./pages/AdminPage";
import { AdminPasswordRecoveryPage } from "./pages/AdminPasswordRecoveryPage";

function ScrollToAnchor() {
  const { pathname, hash } = useLocation();

  useLayoutEffect(() => {
    if (hash) {
      const target = document.getElementById(decodeURIComponent(hash.slice(1)));
      if (target) {
        const marginTop =
          Number.parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
        const top =
          target.getBoundingClientRect().top + window.scrollY - marginTop;
        window.scrollTo({ top, behavior: "auto" });
      }
    } else {
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  }, [pathname, hash]);

  return null;
}

function NotFoundPage() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-7xl flex-col items-center justify-center px-5 text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-plum/60">
        Página não encontrada
      </p>
      <Link
        className="mt-5 rounded-full bg-plum px-6 py-3 font-medium text-paper outline outline-2 outline-lavender"
        to="/"
      >
        Voltar ao início
      </Link>
    </main>
  );
}

function SiteFooter({ showAdminLink = false }: { showAdminLink?: boolean }) {
  return (
    <footer className="border-t border-plum/10 px-5 py-5 sm:px-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 text-[0.6rem] text-plum/70 sm:flex-row">
        <Link className="text-[0.65rem] font-black tracking-widest text-plum" to="/">
          ESPAÇO DA MAZE
        </Link>
        <nav aria-label="Links do rodapé" className="flex gap-5">
          <Link className="hover:text-plum" to="/roupas">
            Roupas
          </Link>
          <Link className="hover:text-plum" to="/perfumes">
            Perfumes
          </Link>
          {showAdminLink && (
            <Link
              aria-label="Acessar painel administrativo"
              className="text-[0.6rem] hover:text-plum"
              to="/admin"
            >
              Área administrativa
            </Link>
          )}
        </nav>
        <span>© {new Date().getFullYear()} Espaço da Maze</span>
      </div>
    </footer>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToAnchor />
      <AppLayout />
    </BrowserRouter>
  );
}

function AppLayout() {
  const { pathname } = useLocation();
  const isClothing = pathname === "/roupas";
  const isPerfumeStore = pathname === "/perfumes";
  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  const [cartCount, setCartCount] = useState(0);

  useLayoutEffect(() => {
    document.documentElement.classList.toggle("perfume-route", isPerfumeStore);
    return () => {
      if (isPerfumeStore) {
        document.documentElement.classList.remove("perfume-route");
      }
    };
  }, [isPerfumeStore]);

  return (
    <div
      className={
        isAdmin
          ? "admin-route-root min-h-svh bg-[#f7f6f8] text-[#29232c]"
          : isPerfumeStore
          ? "min-h-screen overflow-x-clip bg-[#030304] text-[#F5F1F5]"
          : isClothing
            ? "min-h-svh overflow-x-clip bg-transparent text-plum"
            : `min-h-screen overflow-x-clip bg-transparent text-plum ${
                pathname === "/" ? "home-bottom-glow" : ""
              }`
      }
    >
      {!isPerfumeStore && !isAdmin && (
        <SiteHeader cartCount={isClothing ? cartCount : undefined} />
      )}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route
          path="/roupas"
          element={
            <MazeClothingPage
              onAddToCart={() => setCartCount((count) => count + 1)}
            />
          }
        />
        <Route path="/perfumes" element={<PerfumeStorePage />} />
        <Route
          path="/admin/redefinir-senha"
          element={<AdminPasswordRecoveryPage />}
        />
        <Route path="/admin/*" element={<AdminPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      {!isClothing && !isPerfumeStore && !isAdmin && (
        <SiteFooter showAdminLink={pathname === "/"} />
      )}
    </div>
  );
}
