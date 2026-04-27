import Link from "next/link";
import type { ProduttivoManutencaoItem } from "@/types/produttivo";

const PER_PAGE = 20;

/** Mapa de work_id pra numero PED (ex.: { 10751500: "160444" }) */
type PedMap = Record<number, string>;

type Props = {
  items: ProduttivoManutencaoItem[];
  total: number;
  page: number;
  basePath: string;
  preserveParams?: Record<string, string>;
  accentColor?: "amber" | "sky";
  pedMap?: PedMap;
  idLabel?: string;
  preferFieldActivityId?: boolean;
  useLabelOnFallback?: boolean;
};

function buildPageUrl(
  basePath: string,
  page: number,
  preserve: Record<string, string>
): string {
  const params = new URLSearchParams({ ...preserve, page: String(page) });
  return `${basePath}?${params.toString()}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function extractPedFromFieldValues(item: ProduttivoManutencaoItem): string | null {
  const atividade = item.field_values.find((fv) =>
    fv.name?.toLowerCase().includes("atividade")
  );
  if (!atividade) return null;

  const rawValue = Array.isArray(atividade.value)
    ? atividade.value[0]
    : atividade.value;
  if (!rawValue) return null;

  const text = String(rawValue).trim();
  if (!text) return null;

  const fromArrow = text.match(/>\s*([0-9]+)\s*$/);
  if (fromArrow) return fromArrow[1];

  if (/^[0-9]+$/.test(text)) return text;

  if (!/[a-zA-Z]/.test(text) && /[0-9]/.test(text)) {
    const digitsOnly = text.replace(/\D/g, "");
    return digitsOnly || null;
  }

  return null;
}

const accentStyles = {
  amber: {
    badge: "border-amber-200 bg-amber-50 text-amber-700",
    dot: "bg-amber-400",
    pagActive: "bg-amber-500 text-white border-amber-500",
    pagHover: "hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700",
  },
  sky: {
    badge: "border-sky-200 bg-sky-50 text-sky-700",
    dot: "bg-sky-400",
    pagActive: "bg-sky-500 text-white border-sky-500",
    pagHover: "hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700",
  },
};

export default function ProduttivoFillList({
  items,
  total,
  page,
  basePath,
  preserveParams = {},
  accentColor = "amber",
  pedMap = {},
  idLabel = "PED",
  preferFieldActivityId = false,
  useLabelOnFallback = false,
}: Props) {
  const totalPages = Math.ceil(total / PER_PAGE);
  const styles = accentStyles[accentColor];

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">
        Nenhum registro encontrado para os filtros selecionados.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const pedFromWork = item.work_id ? pedMap[item.work_id] ?? null : null;
        const pedFromField = extractPedFromFieldValues(item);
        const ped = preferFieldActivityId
          ? pedFromField ?? pedFromWork
          : pedFromWork ?? pedFromField;
        const fallbackId = String(item.document_number ?? item.id);
        const badgeText = ped
          ? `${idLabel} ${ped}`
          : useLabelOnFallback
            ? `${idLabel} ${fallbackId}`
            : `#${fallbackId}`;
        return (
          <div
            key={item.id}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${styles.badge}`}>
                  {badgeText}
                </span>
                <span className="text-xs text-slate-500">{formatDate(item.created_at)}</span>
              </div>
              <a
                href={`https://app.produttivo.com.br/form_fills/${item.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-800"
              >
                Abrir no Produttivo
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>

            {item.field_values.length > 0 && (
              <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
                {item.field_values.map((fv, idx) => {
                  if (!fv.name) return null;
                  const displayValue = Array.isArray(fv.value)
                    ? fv.value.join(", ")
                    : (fv.value ?? "---");

                  return (
                    <div key={idx} className="flex flex-col">
                      <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                        {fv.name}
                      </dt>
                      <dd className="mt-0.5 text-sm text-slate-800 break-words">
                        {displayValue || "---"}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            )}
          </div>
        );
      })}

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-xs text-slate-500">
            Pagina <strong>{page}</strong> de <strong>{totalPages}</strong> - {total} registros
          </p>

          <div className="flex items-center gap-1.5">
            {page > 1 && (
              <Link
                href={buildPageUrl(basePath, page - 1, preserveParams)}
                className={`rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 transition ${styles.pagHover}`}
              >
                Anterior
              </Link>
            )}

            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let p: number;
              if (totalPages <= 5) {
                p = i + 1;
              } else if (page <= 3) {
                p = i + 1;
              } else if (page >= totalPages - 2) {
                p = totalPages - 4 + i;
              } else {
                p = page - 2 + i;
              }

              return (
                <Link
                  key={p}
                  href={buildPageUrl(basePath, p, preserveParams)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                    p === page
                      ? styles.pagActive
                      : `border-slate-200 bg-slate-50 text-slate-600 ${styles.pagHover}`
                  }`}
                >
                  {p}
                </Link>
              );
            })}

            {page < totalPages && (
              <Link
                href={buildPageUrl(basePath, page + 1, preserveParams)}
                className={`rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 transition ${styles.pagHover}`}
              >
                Proxima
              </Link>
            )}
          </div>
        </div>
      )}

      {totalPages <= 1 && (
        <p className="text-right text-xs text-slate-400">{total} registro{total !== 1 ? "s" : ""} encontrado{total !== 1 ? "s" : ""}</p>
      )}
    </div>
  );
}