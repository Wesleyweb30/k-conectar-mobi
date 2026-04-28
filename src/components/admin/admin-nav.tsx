"use client";

import { signOut } from "@/lib/auth-client";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

interface AdminNavProps {
  userName: string;
}

export default function AdminNav({ userName }: AdminNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [parqueOpen, setParqueOpen] = useState(false);
  const [produttivoOpen, setProduttivoOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  async function handleSignOut() {
    await signOut({ fetchOptions: { onSuccess: () => router.push("/login") } });
  }

  const isParqueActive = pathname.startsWith("/admin/analytics") || pathname.startsWith("/paradas");
  const isProduttivoActive = pathname.startsWith("/admin/produttivo");

  function navLink(href: string, label: string) {
    const isActive = pathname === href;
    return (
      <Link
        href={href}
        className={`text-sm font-medium transition-colors ${
          isActive
            ? "text-violet-700"
            : "text-gray-600 hover:text-gray-900"
        }`}
      >
        {label}
      </Link>
    );
  }

  return (
    <>
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between md:h-20">
        <Link href="/admin" className="inline-flex items-center" aria-label="Ir para home do admin">
          <Image
            src="/kallas-logo-color.png"
            alt="K-Conectar Mobi"
            width={180}
            height={55}
            className="object-contain md:w-[260px]"
            priority
          />
        </Link>

        {/* Hamburger - mobile only */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Abrir menu"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 md:hidden"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-5 md:flex">
          {/* Dropdown Parque */}
          <div className="relative">
            <button
              onClick={() => {
                setParqueOpen((v) => !v);
                setProduttivoOpen(false);
              }}
              onBlur={() => setTimeout(() => setParqueOpen(false), 150)}
              className={`flex items-center gap-1 text-sm font-medium transition-colors ${
                isParqueActive ? "text-violet-700" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Parque
              <svg
                className={`h-3.5 w-3.5 transition-transform ${parqueOpen ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {parqueOpen && (
              <div className="absolute left-0 top-full z-50 mt-2 w-52 rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg">
                <Link
                  href="/admin/analytics"
                  onClick={() => setParqueOpen(false)}
                  className={`flex items-center gap-2.5 px-4 py-2 text-sm font-medium transition-colors ${
                    pathname.startsWith("/admin/analytics")
                      ? "bg-violet-50 text-violet-700"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span className="inline-block h-2 w-2 rounded-full bg-violet-400" />
                  Analytics Paradas
                </Link>
                <Link
                  href="/paradas"
                  onClick={() => setParqueOpen(false)}
                  className={`flex items-center gap-2.5 px-4 py-2 text-sm font-medium transition-colors ${
                    pathname === "/paradas"
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span className="inline-block h-2 w-2 rounded-full bg-blue-400" />
                  Paradas
                </Link>
                <Link
                  href="/paradas/rotas"
                  onClick={() => setParqueOpen(false)}
                  className={`flex items-center gap-2.5 px-4 py-2 text-sm font-medium transition-colors ${
                    pathname.startsWith("/paradas/rotas")
                      ? "bg-emerald-50 text-emerald-700"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
                  Rotas
                </Link>
                <Link
                  href="/paradas/mapa"
                  onClick={() => setParqueOpen(false)}
                  className={`flex items-center gap-2.5 px-4 py-2 text-sm font-medium transition-colors ${
                    pathname.startsWith("/paradas/mapa")
                      ? "bg-cyan-50 text-cyan-700"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span className="inline-block h-2 w-2 rounded-full bg-cyan-400" />
                  Mapa
                </Link>
              </div>
            )}
          </div>

          {/* Dropdown Produttivo */}
          <div className="relative">
            <button
              onClick={() => {
                setProduttivoOpen((v) => !v);
                setParqueOpen(false);
              }}
              onBlur={() => setTimeout(() => setProduttivoOpen(false), 150)}
              className={`flex items-center gap-1 text-sm font-medium transition-colors ${
                isProduttivoActive ? "text-violet-700" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Produttivo
              <svg
                className={`h-3.5 w-3.5 transition-transform ${produttivoOpen ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {produttivoOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 w-52 rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg">
                <Link
                  href="/admin/produttivo"
                  onClick={() => setProduttivoOpen(false)}
                  className={`flex items-center gap-2.5 px-4 py-2 text-sm font-medium transition-colors ${
                    pathname === "/admin/produttivo"
                      ? "bg-violet-50 text-violet-700"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span className="inline-block h-2 w-2 rounded-full bg-violet-400" />
                  Analytics Produttivo
                </Link>
                <Link
                  href="/admin/produttivo/manutencao"
                  onClick={() => setProduttivoOpen(false)}
                  className={`flex items-center gap-2.5 px-4 py-2 text-sm font-medium transition-colors ${
                    pathname.startsWith("/admin/produttivo/manutencao")
                      ? "bg-amber-50 text-amber-700"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
                  Manutenção
                </Link>
                <Link
                  href="/admin/produttivo/implantacao"
                  onClick={() => setProduttivoOpen(false)}
                  className={`flex items-center gap-2.5 px-4 py-2 text-sm font-medium transition-colors ${
                    pathname.startsWith("/admin/produttivo/implantacao")
                      ? "bg-sky-50 text-sky-700"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span className="inline-block h-2 w-2 rounded-full bg-sky-400" />
                  Implantação
                </Link>
                <Link
                  href="/admin/produttivo/instalacao-eletrica"
                  onClick={() => setProduttivoOpen(false)}
                  className={`flex items-center gap-2.5 px-4 py-2 text-sm font-medium transition-colors ${
                    pathname.startsWith("/admin/produttivo/instalacao-eletrica")
                      ? "bg-emerald-50 text-emerald-700"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
                  Instalação Elétrica
                </Link>
                <Link
                  href="/admin/produttivo/ligacao-paradas"
                  onClick={() => setProduttivoOpen(false)}
                  className={`flex items-center gap-2.5 px-4 py-2 text-sm font-medium transition-colors ${
                    pathname.startsWith("/admin/produttivo/ligacao-paradas")
                      ? "bg-cyan-50 text-cyan-700"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span className="inline-block h-2 w-2 rounded-full bg-cyan-400" />
                  Radar Sem Manutenção
                </Link>
              </div>
            )}
          </div>

          {navLink("/admin/usuarios", "Usuários")}

          <span className="text-sm text-gray-400">{userName}</span>
          <button
            onClick={handleSignOut}
            className="text-sm font-medium text-red-600 transition-colors hover:text-red-700"
          >
            Sair
          </button>
        </nav>
      </div>
    </header>

      {/* Mobile menu overlay - fora do header para evitar stacking context */}
      <div
        className={`fixed inset-0 z-50 transition md:hidden ${
          mobileMenuOpen ? "pointer-events-auto" : "pointer-events-none"
        }`}
        aria-hidden={!mobileMenuOpen}
      >
        <button
          type="button"
          onClick={() => setMobileMenuOpen(false)}
          className={`absolute inset-0 bg-slate-900/40 transition-opacity ${
            mobileMenuOpen ? "opacity-100" : "opacity-0"
          }`}
          aria-label="Fechar menu"
        />
        <aside
          className={`absolute right-0 top-0 z-10 flex h-full w-72 flex-col bg-white shadow-2xl transition-transform duration-300 ${
            mobileMenuOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4">
            <span className="text-sm font-semibold text-slate-700">Menu</span>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Fechar menu"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Parque</p>
            {[
              { href: "/admin/analytics", label: "Analytics Paradas", color: "bg-violet-400" },
              { href: "/paradas", label: "Paradas", color: "bg-blue-400" },
              { href: "/paradas/rotas", label: "Rotas", color: "bg-emerald-400" },
              { href: "/paradas/mapa", label: "Mapa", color: "bg-cyan-400" },
            ].map(({ href, label, color }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${
                  pathname.startsWith(href) ? "bg-slate-100 text-slate-900" : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span className={`h-2 w-2 shrink-0 rounded-full ${color}`} />
                {label}
              </Link>
            ))}

            <p className="px-2 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Produttivo</p>
            {[
              { href: "/admin/produttivo", label: "Analytics Produttivo", color: "bg-violet-400", exact: true },
              { href: "/admin/produttivo/manutencao", label: "Manutenção", color: "bg-amber-400" },
              { href: "/admin/produttivo/implantacao", label: "Implantação", color: "bg-sky-400" },
              { href: "/admin/produttivo/instalacao-eletrica", label: "Instalação Elétrica", color: "bg-emerald-400" },
              { href: "/admin/produttivo/ligacao-paradas", label: "Radar Sem Manutenção", color: "bg-cyan-400" },
            ].map(({ href, label, color, exact }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${
                  (exact ? pathname === href : pathname.startsWith(href)) ? "bg-slate-100 text-slate-900" : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span className={`h-2 w-2 shrink-0 rounded-full ${color}`} />
                {label}
              </Link>
            ))}

            <p className="px-2 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Geral</p>
            <Link
              href="/admin/usuarios"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${
                pathname === "/admin/usuarios" ? "bg-slate-100 text-slate-900" : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <span className="h-2 w-2 shrink-0 rounded-full bg-slate-400" />
              Usuários
            </Link>
          </nav>

          <div className="border-t border-slate-200 px-4 py-4">
            <div className="mb-3 rounded-xl bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-600">
              {userName}
            </div>
            <button
              onClick={() => { setMobileMenuOpen(false); void handleSignOut(); }}
              className="w-full rounded-xl border border-rose-200 bg-rose-50 py-2.5 text-sm font-medium text-rose-700 transition-colors hover:bg-rose-100"
            >
              Sair
            </button>
          </div>
        </aside>
      </div>
    </>
  );
}
