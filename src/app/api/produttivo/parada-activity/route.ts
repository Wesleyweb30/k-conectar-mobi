import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { searchWorksByPed } from "@/service/produttivo.service";

const FORM_TYPES: Record<number, string> = {
  356389: "Inspeção",
  356263: "Manutenção",
  485100: "Implementação",
  443660: "Instalação Elétrica",
};

const CLOSED_STATUSES = new Set(["canceled", "cancelled", "done", "closed", "completed"]);

function isOpenStatus(status?: string | null) {
  const normalized = String(status ?? "").trim().toLowerCase();
  if (!normalized) return false;
  return !CLOSED_STATUSES.has(normalized);
}

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const ped = searchParams.get("ped")?.trim();

  if (!ped) {
    return NextResponse.json({ error: "ped is required" }, { status: 400 });
  }

  try {
    const response = await searchWorksByPed(ped);
    const allWorks = (response.results ?? []).filter(
      (w) => w.status !== "canceled",
    );

    const works = allWorks.filter(
      (w) => w.status !== "canceled" && w.updated_at,
    );

    const hasAnyOs = allWorks.length > 0;
    const hasOpenOs = allWorks.some((w) => isOpenStatus(w.status));

    if (works.length === 0) {
      return NextResponse.json({ items: [], hasAnyOs, hasOpenOs });
    }

    const sorted = works.sort(
      (a, b) =>
        new Date(b.updated_at!).getTime() - new Date(a.updated_at!).getTime(),
    );

    const items = sorted.slice(0, 3).map((work) => ({
      id: work.id,
      tipo: work.form_id
        ? (FORM_TYPES[work.form_id] ?? `Outro formulário (${work.form_id})`)
        : "Formulário",
      date: new Date(work.updated_at!).toLocaleDateString("pt-BR"),
      url: `${process.env.PRODUTTIVO_BASE_URL}/works/${work.id}`,
    }));

    return NextResponse.json({ items, hasAnyOs, hasOpenOs });
  } catch {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}
