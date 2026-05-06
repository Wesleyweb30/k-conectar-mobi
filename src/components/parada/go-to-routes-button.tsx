"use client";

import { useRouter } from "next/navigation";
import { ROUTE_SELECTION_TTL_MS, ROUTE_STORAGE_KEY } from "@/lib/session-policy";

type RouteSelectionPayloadItem = {
  codigo: string;
};

type Props = {
  href: string;
  items: RouteSelectionPayloadItem[];
  label?: string;
  disabled?: boolean;
};

export default function GoToRoutesButton({
  href,
  items,
  label = "Ação Rota / Excel",
  disabled = false,
}: Props) {
  const router = useRouter();

  function handleClick() {
    if (disabled) return;

    if (typeof window !== "undefined") {
      if (items.length > 0) {
        const payload = {
          codigos: Array.from(new Set(items.map((item) => item.codigo.trim()).filter(Boolean))),
          expiresAt: Date.now() + ROUTE_SELECTION_TTL_MS,
        };
        window.localStorage.setItem(ROUTE_STORAGE_KEY, JSON.stringify(payload));
      } else {
        window.localStorage.removeItem(ROUTE_STORAGE_KEY);
      }
    }

    router.push(href);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className="inline-flex h-10 items-center rounded-xl border border-emerald-300 bg-emerald-50 px-4 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
    >
      {label}
    </button>
  );
}
