"use client";

import Link from "next/link";
import { useState } from "react";
import type { ProduttivoManutencaoItem, ProduttivoFieldValue } from "@/types/produttivo";

const PER_PAGE = 20;

/** Mapa de work_id pra numero PED (ex.: { 10751500: "160444" }) */
type PedMap = Record<number, string>;

type Props = {
  items: ProduttivoManutencaoItem[];
  total: number;
  page: number;
  basePath: string;
  preserveParams?: Record<string, string>;
  accentColor?: "amber" | "sky" | "emerald";
  pedMap?: PedMap;
  idLabel?: string;
  preferFieldActivityId?: boolean;
  useLabelOnFallback?: boolean;
  variant?: "default" | "feed";
  showImages?: boolean;
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
    feedGlow: "shadow-[0_24px_44px_-34px_rgba(245,158,11,0.45)]",
    feedBorder: "before:from-amber-300 before:to-orange-300",
    photoLabel: "bg-amber-900/75",
    pagActive: "bg-amber-500 text-white border-amber-500",
    pagHover: "hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700",
  },
  sky: {
    badge: "border-sky-200 bg-sky-50 text-sky-700",
    dot: "bg-sky-400",
    feedGlow: "shadow-[0_24px_44px_-34px_rgba(14,165,233,0.45)]",
    feedBorder: "before:from-sky-300 before:to-cyan-300",
    photoLabel: "bg-sky-900/75",
    pagActive: "bg-sky-500 text-white border-sky-500",
    pagHover: "hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700",
  },
  emerald: {
    badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
    dot: "bg-emerald-400",
    feedGlow: "shadow-[0_24px_44px_-34px_rgba(16,185,129,0.45)]",
    feedBorder: "before:from-emerald-300 before:to-teal-300",
    photoLabel: "bg-emerald-900/75",
    pagActive: "bg-emerald-500 text-white border-emerald-500",
    pagHover: "hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700",
  },
};

const VISIBLE_FIELDS = 6;

/** Campos prioritários — exibidos primeiro, na ordem definida */
const PRIORITY_FIELDS: string[] = [
  "DATA E HORA - INICIO DE SERVIÇO",
  "DATA E HORA - FIM DE SERVIÇO",
  "SERVIÇO EXECUTADO",
  "EXECUTOR DO SERVIÇO",
  "TIPO DO SERVIÇO",
  "TIPO DO EQUIPAMENTO - POSTERIOR",
  "NOVA TIPOLOGIA KALLAS - POSTERIOR",
  "TIPO DO EQUIPAMENTO - ANTERIOR",
  "OBSERVAÇÃO",
  "ADESIVO",
];

const HIDDEN_DETAIL_FIELD_NAMES = [
  "FOTO DO EQUIPAMENTO - (ANTERIOR)",
  "FOTO DO EQUIPAMENTO - (POSTERIOR)",
  "ASSINATURA EXECUTOR",
];

function isLikelyImageUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return /\.(jpg|jpeg|png|gif|webp|bmp|heic|heif)(\?|$)/.test(lower)
    || lower.includes("/attachments/")
    || lower.includes("image")
    || lower.includes("foto");
}

function extractImageCandidates(raw: string): string[] {
  const candidates = new Set<string>();

  if (isLikelyImageUrl(raw)) {
    candidates.add(raw);
  }

  const directMatches = raw.match(/https?:\/\/[^\s"'<>]+|\/attachments\/[^\s"'<>]+/gi) ?? [];
  directMatches.forEach((match) => {
    const cleaned = match.replace(/[),.;]+$/, "").trim();
    if (cleaned) candidates.add(cleaned);
  });

  return Array.from(candidates);
}

function pickAttachmentUrl(
  attachmentUrl?: ProduttivoFieldValue["attachment_url"]
): string | null {
  if (!attachmentUrl) return null;
  if (typeof attachmentUrl === "string") return attachmentUrl;
  return attachmentUrl.original ?? attachmentUrl.medium ?? attachmentUrl.thumb ?? attachmentUrl.mini ?? null;
}

function getLatestActiveAttachmentUrl(fieldValue: ProduttivoFieldValue): string | null {
  const activeAttachments = (fieldValue.attachments ?? []).filter((attachment) => !attachment.removed);
  if (activeAttachments.length === 0) return null;
  const latest = activeAttachments[activeAttachments.length - 1];
  return latest.file_url ?? null;
}

function getNamedPhotoUrl(
  fieldValues: ProduttivoFieldValue[],
  keyword: "anterior" | "posterior"
): string | null {
  const photoField = fieldValues.find((fieldValue) => {
    const fieldName = fieldValue.name?.toLowerCase() ?? "";
    return fieldName.includes("foto") && fieldName.includes(keyword);
  });

  if (!photoField) return null;

  const fromAttachmentUrl = pickAttachmentUrl(photoField.attachment_url);
  if (fromAttachmentUrl && isLikelyImageUrl(fromAttachmentUrl)) return fromAttachmentUrl;

  const fromActiveAttachment = getLatestActiveAttachmentUrl(photoField);
  if (fromActiveAttachment && isLikelyImageUrl(fromActiveAttachment)) return fromActiveAttachment;

  const values = Array.isArray(photoField.value)
    ? photoField.value
    : photoField.value
      ? [photoField.value]
      : [];
  for (const value of values) {
    const candidates = extractImageCandidates(String(value));
    if (candidates.length > 0) return candidates[0];
  }

  return null;
}

function getAdesivoStatus(fieldValues: ProduttivoFieldValue[]): "conforme" | "nao_conforme" | "vazio" | null {
  const field = fieldValues.find((fv) => {
    const name = fv.name?.toLowerCase() ?? "";
    return name.includes("adesivo");
  });
  if (!field) return null;
  const raw = Array.isArray(field.value) ? field.value[0] : field.value;
  if (!raw || String(raw).trim() === "") return "vazio";
  const normalized = String(raw).trim().toLowerCase();
  if (normalized.includes("não conforme") || normalized.includes("nao conforme")) return "nao_conforme";
  if (normalized.includes("conforme")) return "conforme";
  return "vazio";
}

function getSignatureUrl(fieldValues: ProduttivoFieldValue[]): string | null {
  const signatureField = fieldValues.find((fieldValue) => {
    const fieldName = fieldValue.name?.toLowerCase() ?? "";
    return fieldName.includes("assinatura");
  });

  if (!signatureField) return null;

  const fromAttachmentUrl = pickAttachmentUrl(signatureField.attachment_url);
  if (fromAttachmentUrl && isLikelyImageUrl(fromAttachmentUrl)) return fromAttachmentUrl;

  const fromActiveAttachment = getLatestActiveAttachmentUrl(signatureField);
  if (fromActiveAttachment && isLikelyImageUrl(fromActiveAttachment)) return fromActiveAttachment;

  const values = Array.isArray(signatureField.value)
    ? signatureField.value
    : signatureField.value
      ? [signatureField.value]
      : [];
  for (const value of values) {
    const candidates = extractImageCandidates(String(value));
    if (candidates.length > 0) return candidates[0];
  }

  return null;
}

function normalizeImageKey(url: string): string {
  const attachmentMatch = url.match(/\/attachments\/(\d+)\//i);
  if (attachmentMatch) return `attachment:${attachmentMatch[1]}`;
  return url.replace(/([?&])size=(original|medium|thumb|mini)/gi, "").replace(/([?&])timestamp=\d+/gi, "");
}

function getImageUrlsFromFieldValues(fieldValues: ProduttivoFieldValue[]): string[] {
  const all = new Map<string, string>();

  const addIfImage = (candidate?: string | null) => {
    if (!candidate) return;
    const trimmed = String(candidate).trim();
    if (!trimmed) return;
    if (!isLikelyImageUrl(trimmed)) return;
    const key = normalizeImageKey(trimmed);
    if (!all.has(key)) {
      all.set(key, trimmed);
    }
  };

  for (const fv of fieldValues) {
    if (fv.attachment_content_type?.startsWith("image/")) {
      if (typeof fv.attachment_url === "string") {
        addIfImage(fv.attachment_url);
      } else if (fv.attachment_url && typeof fv.attachment_url === "object") {
        addIfImage(fv.attachment_url.original ?? fv.attachment_url.medium ?? fv.attachment_url.thumb ?? fv.attachment_url.mini ?? null);
      }

      (fv.attachments ?? [])
        .filter((attachment) => !attachment.removed)
        .forEach((attachment) => addIfImage(attachment.file_url));
    }

    const values = Array.isArray(fv.value) ? fv.value : fv.value ? [fv.value] : [];
    for (const value of values) {
      const raw = String(value).trim();
      if (!raw) continue;

      extractImageCandidates(raw).forEach((url) => addIfImage(url));

      if ((raw.startsWith("[") && raw.endsWith("]")) || (raw.startsWith("{") && raw.endsWith("}"))) {
        try {
          const parsed = JSON.parse(raw) as unknown;
          const stack: unknown[] = [parsed];

          while (stack.length > 0) {
            const current = stack.pop();
            if (!current) continue;

            if (typeof current === "string") {
              extractImageCandidates(current).forEach((url) => addIfImage(url));
              continue;
            }

            if (Array.isArray(current)) {
              stack.push(...current);
              continue;
            }

            if (typeof current === "object") {
              Object.values(current as Record<string, unknown>).forEach((entry) => stack.push(entry));
            }
          }
        } catch {
          // Ignora valores que parecem JSON mas nao sao validos.
        }
      }
    }
  }

  return Array.from(all.values());
}

function toAttachmentProxyUrl(fileUrl: string): string {
  return `/api/produttivo/attachment?fileUrl=${encodeURIComponent(fileUrl)}`;
}

function priorityIndex(name: string | null | undefined): number {
  if (!name) return Infinity;
  const upper = name.trim().toUpperCase();
  const idx = PRIORITY_FIELDS.findIndex((p) => upper.includes(p) || p.includes(upper));
  return idx === -1 ? Infinity : idx;
}

function shouldHideDetailField(name?: string | null): boolean {
  if (!name) return false;
  const normalized = name.trim().toUpperCase();
  return HIDDEN_DETAIL_FIELD_NAMES.some((fieldName) => normalized.includes(fieldName));
}

function FieldList({ fieldValues }: { fieldValues: ProduttivoFieldValue[] }) {
  const sorted = [...fieldValues.filter((fv) => fv.name && !shouldHideDetailField(fv.name))].sort(
    (a, b) => priorityIndex(a.name) - priorityIndex(b.name)
  );

  return (
    <div className="mt-3">
      <dl className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((fv, idx) => {
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
    </div>
  );
}


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
  variant = "default",
  showImages = false,
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

        const imageUrls = showImages
          ? getImageUrlsFromFieldValues(item.field_values).slice(0, 4)
          : [];

        const anteriorImage = showImages ? getNamedPhotoUrl(item.field_values, "anterior") : null;
        const posteriorImage = showImages ? getNamedPhotoUrl(item.field_values, "posterior") : null;
        const signatureImage = showImages ? getSignatureUrl(item.field_values) : null;
        const adesivoStatus = getAdesivoStatus(item.field_values);
        const keyPhotosCount = Number(Boolean(anteriorImage)) + Number(Boolean(posteriorImage));

        if (variant === "feed") {
          return (
            <article
              key={item.id}
              className={`relative overflow-hidden rounded-[26px] border border-slate-200 bg-white ${styles.feedGlow} before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-gradient-to-r ${styles.feedBorder}`}
            >
              <div className="p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${styles.badge}`}>
                        {badgeText}
                      </span>
                      <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                        {formatDate(item.created_at)}
                      </span>
                    </div>
                    <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                      Registro #{item.document_number ?? item.id}
                    </p>
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

                {showImages && (
                  <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-[linear-gradient(140deg,rgba(248,250,252,1),rgba(241,245,249,0.85))] p-2">
                    <div className="mb-2 flex items-center justify-between px-1">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Comparativo visual</p>
                      <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                        {keyPhotosCount}/2 fotos-chave
                      </span>
                    </div>
                    {anteriorImage || posteriorImage ? (
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {[
                          { label: "Antes", url: anteriorImage },
                          { label: "Depois", url: posteriorImage },
                        ].map((entry) => {
                          if (!entry.url) {
                            return (
                              <div
                                key={`${item.id}-${entry.label}`}
                                className="flex h-[22rem] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-100/80 px-3 text-xs font-medium text-slate-500"
                              >
                                {entry.label} indisponivel
                              </div>
                            );
                          }

                          const proxyUrl = toAttachmentProxyUrl(entry.url);
                          return (
                            <a
                              key={`${item.id}-${entry.label}`}
                              href={proxyUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group/photo relative block h-[22rem] overflow-hidden rounded-xl border border-slate-200 bg-slate-100"
                            >
                              <img
                                src={proxyUrl}
                                alt={`${entry.label} do registro ${item.id}`}
                                loading="lazy"
                                className="h-full w-full object-cover transition duration-500 group-hover/photo:scale-[1.04]"
                              />
                              <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-900/50 to-transparent" />
                              <span className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white ${styles.photoLabel}`}>
                                {entry.label}
                              </span>
                            </a>
                          );
                        })}
                      </div>
                    ) : imageUrls.length > 0 ? (
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {imageUrls.map((url, index) => {
                          const proxyUrl = toAttachmentProxyUrl(url);
                          return (
                            <a
                              key={`${item.id}-${index}`}
                              href={proxyUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="relative block h-56 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 sm:h-64"
                            >
                              <img
                                src={proxyUrl}
                                alt={`Imagem ${index + 1} do registro ${item.id}`}
                                loading="lazy"
                                className="h-full w-full object-cover transition duration-300 hover:scale-[1.03]"
                              />
                            </a>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white text-xs font-medium text-slate-500">
                        Sem imagens neste registro
                      </div>
                    )}
                  </div>
                )}

                {item.field_values.length > 0 && (
                  <FieldList fieldValues={item.field_values} />
                )}

                {adesivoStatus !== null && (
                  <div
                    className={`mt-4 flex items-center gap-2.5 rounded-xl border px-3 py-2.5 ${
                      adesivoStatus === "conforme"
                        ? "border-emerald-200 bg-emerald-50"
                        : adesivoStatus === "nao_conforme"
                          ? "border-rose-200 bg-rose-50"
                          : "border-amber-200 bg-amber-50"
                    }`}
                  >
                    {adesivoStatus === "conforme" ? (
                      <svg className="h-4 w-4 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : adesivoStatus === "nao_conforme" ? (
                      <svg className="h-4 w-4 shrink-0 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4 shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                      </svg>
                    )}
                    <div>
                      <p
                        className={`text-[11px] font-semibold uppercase tracking-wide ${
                          adesivoStatus === "conforme"
                            ? "text-emerald-700"
                            : adesivoStatus === "nao_conforme"
                              ? "text-rose-600"
                              : "text-amber-700"
                        }`}
                      >
                        Adesivo —{" "}
                        {adesivoStatus === "conforme"
                          ? "Conforme"
                          : adesivoStatus === "nao_conforme"
                            ? "Não conforme"
                            : "Não informado"}
                      </p>
                      {adesivoStatus !== "conforme" && (
                        <p
                          className={`mt-0.5 text-xs ${
                            adesivoStatus === "nao_conforme" ? "text-rose-500" : "text-amber-600"
                          }`}
                        >
                          {adesivoStatus === "nao_conforme"
                            ? "Adesivo fora do padrão. Verifique e corrija no Produttivo."
                            : "Campo de adesivo não foi preenchido. Verifique e corrija no Produttivo."}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {signatureImage ? (
                  <div className="mt-4 flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <a
                      href={toAttachmentProxyUrl(signatureImage)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group/sig shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white"
                    >
                      <img
                        src={toAttachmentProxyUrl(signatureImage)}
                        alt="Assinatura do executor"
                        loading="lazy"
                        className="h-14 w-28 object-contain transition duration-300 group-hover/sig:opacity-80"
                      />
                    </a>
                    <div className="flex flex-col justify-center">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Assinatura executor</p>
                      <p className="mt-0.5 text-xs text-slate-500">Toque para ampliar</p>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5">
                    <svg className="h-4 w-4 shrink-0 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    </svg>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-rose-600">Assinatura ausente</p>
                      <p className="mt-0.5 text-xs text-rose-500">Este registro não possui assinatura do executor. Verifique e corrija no Produttivo.</p>
                    </div>
                  </div>
                )}
              </div>
            </article>
          );
        }

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
              <FieldList fieldValues={item.field_values} />
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