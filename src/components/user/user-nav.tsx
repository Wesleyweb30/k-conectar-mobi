"use client";

import { signOut } from "@/lib/auth-client";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

interface UserNavProps {
  userName: string;
}

export default function UserNav({ userName }: UserNavProps) {
  const router = useRouter();
  const pathname = usePathname();

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
    <header className="border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 md:h-20 md:flex-row md:items-center md:justify-between md:py-0">
        <Link
          href="/dashboard"
          className="inline-flex items-center"
          aria-label="Ir para home"
        >
          <Image
            src="/kallas-logo-color.png"
            alt="K-Conectar Mobi"
            width={260}
            height={85}
            className="object-contain"
            priority
          />
        </Link>

        <div className="flex flex-wrap items-center gap-2 md:gap-3">
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
      </div>
    </header>
  );
}
