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

  async function handleSignOut() {
    await signOut({ fetchOptions: { onSuccess: () => router.push("/login") } });
  }

  const isParqueActive = pathname === "/admin" || pathname.startsWith("/paradas");
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
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4 h-20 flex items-center justify-between">
        <Link href="/admin" className="inline-flex items-center" aria-label="Ir para home do admin">
          <Image
            src="/kallas-logo-color.png"
            alt="K-Conectar Mobi"
            width={260}
            height={85}
            className="object-contain"
            priority
          />
        </Link>

        <nav className="flex items-center gap-5">
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
                  href="/admin"
                  onClick={() => setParqueOpen(false)}
                  className={`flex items-center gap-2.5 px-4 py-2 text-sm font-medium transition-colors ${
                    pathname === "/admin"
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
  );
}
