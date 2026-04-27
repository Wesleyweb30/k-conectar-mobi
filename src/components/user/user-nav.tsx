"use client";

import { signOut } from "@/lib/auth-client";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

interface UserNavProps {
  userName: string;
}

export default function UserNav({ userName }: UserNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  async function handleSignOut() {
    await signOut({
      fetchOptions: {
        onSuccess: () => router.push("/login"),
      },
    });
  }

  function navLink(href: string, label: string) {
    const isActive =
      pathname === href ||
      (href === "/paradas" && pathname.startsWith("/paradas"));

    return (
      <Link
        href={href}
        className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
          isActive
            ? "bg-sky-100 text-sky-800"
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        }`}
      >
        {label}
      </Link>
    );
  }

  return (
    <>
    <header className="border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link
          href="/dashboard"
          className="inline-flex items-center"
          aria-label="Ir para home"
        >
          <Image
            src="/kallas-logo-color.png"
            alt="K-Conectar Mobi"
            width={180}
            height={55}
            className="object-contain md:w-[260px]"
            priority
          />
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-2 md:flex md:gap-3">
          {navLink("/dashboard", "Início")}
          {navLink("/paradas", "Paradas")}
          {navLink("/paradas/rotas", "Rotas")}
          <span className="ml-1 rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600">
            {userName}
          </span>
          <button
            onClick={handleSignOut}
            className="rounded-lg px-3 py-2 text-sm font-medium text-rose-700 transition-colors hover:bg-rose-50 hover:text-rose-800"
          >
            Sair
          </button>
        </div>

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
          className={`absolute right-0 top-0 z-10 flex h-full w-64 flex-col bg-white shadow-2xl transition-transform duration-300 ${
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
            {[
              { href: "/dashboard", label: "Início" },
              { href: "/paradas", label: "Paradas" },
              { href: "/paradas/rotas", label: "Rotas" },
            ].map(({ href, label }) => {
              const isActive = pathname === href || (href === "/paradas" && pathname.startsWith("/paradas"));
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block rounded-xl px-3 py-3 text-sm font-medium transition-colors ${
                    isActive ? "bg-sky-50 text-sky-800" : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
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
