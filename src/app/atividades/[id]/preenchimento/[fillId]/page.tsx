import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import AdminNav from "@/components/admin/admin-nav";
import FormFillMediaUpload from "@/components/produttivo/form-fill-media-upload";
import LocationFieldInput from "@/components/produttivo/location-field-input";
import UserNav from "@/components/user/user-nav";
import {
  FORM_ID_MANUTENCAO,
  getProduttivoAttachmentProxyUrl,
  getProduttivoForm,
  getProduttivoFormFill,
  getProduttivoWork,
} from "@/service/produttivo.service";
import type { ProduttivoFieldValue, ProduttivoFormField, ProduttivoFormSection } from "@/types/produttivo";
import { salvarPreenchimentoAction } from "./actions";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type Params = Promise<{ id: string; fillId: string }>;

function pickFirst(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function toPositiveInt(value: string): number | null {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function resolveReturnToPath(rawValue: string | undefined): string {
  if (!rawValue) return "/atividades";
  if (!rawValue.startsWith("/")) return "/atividades";
  if (rawValue.startsWith("//")) return "/atividades";
  return rawValue;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

type EditableField = {
  id?: number;
  formFieldId?: number;
  name: string;
  value: string;
  fieldKind: string;
  mandatory: boolean;
  options: Array<{ id?: number; value: string; label: string }>;
  hasMedia: boolean;
  mediaUrls: string[];
  mediaAttachmentIds: number[];
};

const FALLBACK_MANUTENCAO_V2_SECTIONS: ProduttivoFormSection[] = [
  {
    id: 3779450,
    name: "INICIO E RESPONSAVEL",
    position: 0,
    removed: false,
    fields: [
      { id: 16164758, name: "DATA E HORA - INICIO DE SERVIÇO", field_type: "datetime", mandatory: true, removed: false, position: 0 },
      { id: 16164823, name: "EXECUTOR DO SERVIÇO", field_type: "text", mandatory: true, removed: false, position: 1 },
      { id: 16164824, name: "LATITUDE/LONGITUDE", field_type: "location", mandatory: true, removed: false, position: 2 },
      {
        id: 16169798,
        name: "TIPO DE EQUIPAMENTO",
        field_type: "single_select",
        mandatory: true,
        removed: false,
        position: 3,
        field_options: [
          { id: 41310033, name: "Abrigo Kallas" },
          { id: 41310034, name: "Totem Kallas" },
          { id: 41310035, name: "Abrigo Metálico CTM" },
          { id: 41310038, name: "Pré-moldado" },
          { id: 42912762, name: "Coluna C/ Placa" },
          { id: 42912763, name: "Sem Equipamento" },
        ],
      },
      {
        id: 16164826,
        name: "QUANTIDADE DO ABRIGO",
        field_type: "single_select",
        mandatory: true,
        removed: false,
        position: 4,
        field_options: [
          { id: 41299906, name: "Simples" },
          { id: 41299907, name: "Duplo" },
          { id: 43320942, name: "Triplo" },
          { id: 42912764, name: "Sem Equipamento" },
        ],
      },
      {
        id: 16164827,
        name: "MIDIA",
        field_type: "single_select",
        mandatory: false,
        removed: false,
        position: 5,
        field_options: [
          { id: 41299908, name: "Mupi" },
          { id: 41299909, name: "Megaled" },
          { id: 43320943, name: "Mupi Elevado" },
          { id: 43320944, name: "Totem Digital" },
        ],
      },
    ],
  },
  {
    id: 3779623,
    name: "FOTO DE EQUIPAMENTO - (ANTERIOR)",
    position: 1,
    removed: false,
    fields: [
      { id: 16165137, name: "FOTO DE EQUIPAMENTO - (ANTERIOR)", field_type: "image", mandatory: true, removed: false, position: 0 },
    ],
  },
  {
    id: 3779624,
    name: "Serviços Executados",
    position: 2,
    removed: false,
    fields: [
      {
        id: 16169124,
        name: "REVITALIZAÇÃO NO ENTORNO DA ÁREA DO EQUIPAMENTO ",
        field_type: "multi_select",
        mandatory: true,
        removed: false,
        position: 0,
        field_options: [
          { id: 42913442, name: "VARRIÇÃO" },
          { id: 42913460, name: "REMOÇÃO DE VEGETAÇÃO RASTEIRA E RESÍDUOS SOLIDOS: METRALHA - MADEIRA - LIXO" },
          { id: 42913657, name: "PINTURA NAS ESTRUTURAS" },
          { id: 43282106, name: "PINTURA DE PISO PODOTÁTIL" },
        ],
      },
      {
        id: 16872025,
        name: "LIMPEZA DAS INSTALAÇÕES DOS EQUIPAMENTOS",
        field_type: "multi_select",
        mandatory: false,
        removed: false,
        position: 1,
        field_options: [
          { id: 42913446, name: "REMOÇÃO DE PLACAS IRREGULARES" },
          { id: 42913447, name: "CARTAZES" },
          { id: 42913448, name: "ADESIVOS" },
          { id: 42913449, name: "MARCAÇÕES DE COLAGENS" },
          { id: 42913450, name: "ARAMES" },
          { id: 42913451, name: "CORDAS" },
          { id: 42913452, name: "FIAÇÕES IRREGULARES" },
          { id: 42913453, name: "PICHAÇÕES" },
        ],
      },
      {
        id: 16872026,
        name: "HIGIENIZAÇÃO",
        field_type: "single_select",
        mandatory: true,
        removed: false,
        position: 2,
        field_options: [
          { id: 42913454, name: "HIGIENIZAÇÃO LEVE SABÃO NEUTRO" },
          { id: 42913455, name: "HIGIENIZAÇÃO COM HIDROJATO" },
        ],
      },
      {
        id: 16872027,
        name: "OUTROS TIPOS DE SERVIÇO",
        field_type: "multi_select",
        mandatory: false,
        removed: false,
        position: 3,
        field_options: [
          { id: 42913456, name: "Implantação de coluna CTM" },
          { id: 42913457, name: "Instalação de Vidro" },
          { id: 42913458, name: "Remoção de Abrigo" },
          { id: 42913459, name: "Substituição" },
          { id: 43320945, name: "Implantação de abrigo CTM" },
        ],
      },
      {
        id: 16165139,
        name: "Peças Substituidas",
        field_type: "multi_select",
        mandatory: false,
        removed: false,
        position: 4,
        field_options: [
          { id: 41299920, name: "Coberta" },
          { id: 41299921, name: "Banco" },
          { id: 41299922, name: "Traves de Vidro Inferior" },
          { id: 41299923, name: "Traves de Vidro Superior" },
          { id: 41299924, name: "Coluna Esquerda" },
          { id: 41299925, name: "Coluna Direita" },
          { id: 41299926, name: "Trave C/ Fio" },
          { id: 41299927, name: "Trave S/ Fio" },
          { id: 41299928, name: "Louças" },
          { id: 41299929, name: "Outros" },
        ],
      },
      {
        id: 16871753,
        name: "Justificativa de Substituição",
        field_type: "multi_select",
        mandatory: false,
        removed: false,
        position: 5,
        field_options: [
          { id: 42912774, name: "Equipamento colidido" },
          { id: 42912775, name: "Vidro Vandalizado" },
          { id: 42912776, name: "Banco Furtado" },
          { id: 42912777, name: "Kit Celpe Furtado" },
        ],
      },
    ],
  },
  {
    id: 3779625,
    name: "FOTO DE EQUIPAMENTO - (POSTERIOR)",
    position: 3,
    removed: false,
    fields: [
      { id: 16165141, name: "FOTO DE EQUIPAMENTO - (POSTERIOR)", field_type: "image", mandatory: true, removed: false, position: 0 },
    ],
  },
  {
    id: 3779736,
    name: "VALIDAÇÂO E CONCLUSÃO",
    position: 4,
    removed: false,
    fields: [
      { id: 16165467, name: "DATA E HORA - FIM DE SERVIÇO", field_type: "datetime", mandatory: true, removed: false, position: 0 },
      { id: 16165468, name: "ASSINATURA EXECUTOR", field_type: "signature", mandatory: true, removed: false, position: 1 },
      { id: 16165469, name: "OBSERVAÇÃO", field_type: "text", mandatory: false, removed: false, position: 2 },
    ],
  },
];

function normalizeFieldKey(name: string | null | undefined): string {
  return String(name ?? "").trim().replace(/\s+/g, " ").toUpperCase();
}

function toEditableFieldFromFill(field: ProduttivoFieldValue): EditableField | null {
  const rawName = String(field.name ?? "");
  const normalizedName = rawName.trim();
  if (!normalizedName) return null;

  const mediaUrls = (field.attachments ?? [])
    .map((attachment) => getProduttivoAttachmentProxyUrl(attachment.file_url ?? null))
    .filter((url): url is string => Boolean(url));
  const mediaAttachmentIds = (field.attachments ?? [])
    .map((attachment) => attachment.id)
    .filter((id): id is number => Number.isInteger(id) && id > 0);

  const hasMedia = mediaUrls.length > 0 || Boolean(field.attachment_content_type);

  if (Array.isArray(field.value)) {
    return {
      id: field.id,
      formFieldId: undefined,
      name: rawName,
      value: field.value.join("\n"),
      fieldKind: "multi_select",
      mandatory: false,
      options: [],
      hasMedia,
      mediaUrls,
      mediaAttachmentIds,
    };
  }

  return {
    id: field.id,
    formFieldId: undefined,
    name: rawName,
    value: String(field.value ?? ""),
    fieldKind: "text",
    mandatory: false,
    options: [],
    hasMedia,
    mediaUrls,
    mediaAttachmentIds,
  };
}

function toEditableFieldFromSchema(field: ProduttivoFormField, fillByName: Map<string, ProduttivoFieldValue>): EditableField | null {
  if (field.removed) return null;

  const rawName = String(field.name ?? "");
  const normalizedName = rawName.trim();
  if (!normalizedName || normalizedName.toLowerCase().startsWith("removed-")) return null;

  const valueFromFill = fillByName.get(normalizeFieldKey(normalizedName));
  const existingName = String(valueFromFill?.name ?? "");
  const outputName = existingName.trim().length > 0 ? existingName : rawName;
  const mediaUrls = (valueFromFill?.attachments ?? [])
    .map((attachment) => getProduttivoAttachmentProxyUrl(attachment.file_url ?? null))
    .filter((url): url is string => Boolean(url));
  const mediaAttachmentIds = (valueFromFill?.attachments ?? [])
    .map((attachment) => attachment.id)
    .filter((id): id is number => Number.isInteger(id) && id > 0);
  const hasMedia = mediaUrls.length > 0 || Boolean(valueFromFill?.attachment_content_type);

  const value = Array.isArray(valueFromFill?.value)
    ? valueFromFill.value.join("\n")
    : String(valueFromFill?.value ?? "");

  const options = (field.field_options ?? [])
    .map((option) => {
      const rawValue = String(option.name ?? "");
      const label = rawValue.trim();
      if (!label) return null;
      return {
        id: typeof option.id === "number" && option.id > 0 ? option.id : undefined,
        value: rawValue,
        label,
      };
    })
    .filter(Boolean) as Array<{ id?: number; value: string; label: string }>;

  return {
    id: valueFromFill?.id,
    formFieldId: field.id,
    name: outputName,
    value,
    fieldKind: String(field.field_type ?? "text").trim() || "text",
    mandatory: Boolean(field.mandatory),
    options,
    hasMedia,
    mediaUrls,
    mediaAttachmentIds,
  };
}

function splitMultiValues(value: string): string[] {
  return value
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function normalizeSelectionValue(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function isFieldEmpty(field: EditableField): boolean {
  if (field.fieldKind === "multi_select") {
    return splitMultiValues(field.value).length === 0;
  }

  if (field.fieldKind === "image" || field.fieldKind === "signature") {
    return field.mediaAttachmentIds.length === 0;
  }

  return field.value.trim().length === 0;
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function formatDateForDateTimeLocal(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function toDateTimeLocalValue(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(trimmed)) {
    return trimmed.slice(0, 16);
  }

  const brMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:[\sT](\d{2}):(\d{2})(?::\d{2})?)?$/);
  if (brMatch) {
    const [, dd, mm, yyyy, hh = "00", min = "00"] = brMatch;
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  }

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return formatDateForDateTimeLocal(parsed);
  }

  return "";
}

function normalizeLocationValue(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const jsonLike = trimmed.match(/^\{[\s\S]*\}$/);
  if (jsonLike) {
    try {
      const parsed = JSON.parse(trimmed) as { latitude?: unknown; longitude?: unknown; lat?: unknown; lng?: unknown };
      const lat = parsed.latitude ?? parsed.lat;
      const lng = parsed.longitude ?? parsed.lng;

      if ((typeof lat === "number" || typeof lat === "string") && (typeof lng === "number" || typeof lng === "string")) {
        return `${String(lat).trim()}; ${String(lng).trim()}`;
      }
    } catch {
      // Mantem valor original quando nao for JSON valido.
    }
  }

  const clean = trimmed.replace(/\s+/g, " ").replace(/,/g, ".");
  const match = clean.match(/(-?\d+(?:\.\d+)?)\s*[;\s]\s*(-?\d+(?:\.\d+)?)/);
  if (match) {
    const [, lat, lng] = match;
    return `${lat}; ${lng}`;
  }

  return trimmed;
}

function stripDiacritics(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function shouldRenderCollapsedField(fieldName: string): boolean {
  const normalized = stripDiacritics(normalizeFieldKey(fieldName));

  return normalized === "OUTROS TIPOS DE SERVICO"
    || normalized === "PECAS SUBSTITUIDAS"
    || normalized === "JUSTIFICATIVA DE SUBSTITUICAO";
}

function isStartServiceDateTimeField(field: EditableField): boolean {
  if (field.fieldKind !== "datetime") return false;
  const normalized = normalizeFieldKey(field.name);
  return normalized.includes("DATA E HORA") && normalized.includes("INICIO") && normalized.includes("SERVI");
}

function applyDefaultStartDateTime(fields: EditableField[], defaultDateTimeValue: string): EditableField[] {
  const normalizedDefault = defaultDateTimeValue.trim();
  if (!normalizedDefault) return fields;

  let applied = false;

  return fields.map((field) => {
    if (applied) return field;
    if (!isStartServiceDateTimeField(field)) return field;
    if (field.value.trim().length > 0) return field;

    applied = true;
    return { ...field, value: normalizedDefault };
  });
}

export default async function PreenchimentoAtividadePage(props: {
  params: Params;
  searchParams: SearchParams;
}) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    redirect("/login");
  }

  const isAdmin = (session.user.role ?? "") === "admin";
  const returnToDefault = isAdmin ? "/admin/atividades" : "/dashboard/atividades";

  const [params, searchParams] = await Promise.all([props.params, props.searchParams]);

  const workId = toPositiveInt(params.id);
  const fillId = toPositiveInt(params.fillId);

  if (!workId || !fillId) {
    notFound();
  }

  const returnTo = resolveReturnToPath(pickFirst(searchParams.returnTo) || returnToDefault);
  const msg = pickFirst(searchParams.msg);
  const defaultStartAt = toDateTimeLocalValue(pickFirst(searchParams.defaultStartAt));

  const [work, formFill] = await Promise.all([
    getProduttivoWork(workId).catch(() => null),
    getProduttivoFormFill(fillId).catch(() => null),
  ]);

  if (!work || !formFill) {
    notFound();
  }

  if (formFill.work_id && Number(formFill.work_id) !== workId) {
    notFound();
  }

  const form = work.form_id ? await getProduttivoForm(work.form_id).catch(() => null) : null;

  const fillByName = new Map<string, ProduttivoFieldValue>();
  (formFill.field_values ?? []).forEach((field) => {
    const key = normalizeFieldKey(field.name);
    if (!key) return;
    // Preserve the first occurrence to avoid switching reference when API has duplicated names with tiny variations.
    if (fillByName.has(key)) return;
    fillByName.set(key, field);
  });

  const usingFallbackSchema =
    (!form?.form_sections || form.form_sections.length === 0) && work.form_id === FORM_ID_MANUTENCAO;

  const sourceSections = usingFallbackSchema ? FALLBACK_MANUTENCAO_V2_SECTIONS : (form?.form_sections ?? []);

  const schemaSections: Array<{ section: ProduttivoFormSection; fields: EditableField[] }> =
    sourceSections
      .filter((section) => !section.removed)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .map((section) => {
        const fields = (section.fields ?? [])
          .slice()
          .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
          .map((field) => toEditableFieldFromSchema(field, fillByName))
          .filter((item): item is EditableField => Boolean(item));

        return { section, fields };
      })
      .filter((entry) => entry.fields.length > 0);

  const schemaSectionsWithDefaultStart = schemaSections.length > 0
    ? (() => {
        let applied = false;
        return schemaSections.map((entry) => ({
          section: entry.section,
          fields: entry.fields.map((field) => {
            if (applied) return field;
            if (!defaultStartAt) return field;
            if (!isStartServiceDateTimeField(field)) return field;
            if (field.value.trim().length > 0) return field;

            applied = true;
            return { ...field, value: defaultStartAt };
          }),
        }));
      })()
    : schemaSections;

  const fallbackFields = applyDefaultStartDateTime((formFill.field_values ?? [])
    .map(toEditableFieldFromFill)
    .filter((item): item is EditableField => Boolean(item)), defaultStartAt);

  const editableFields = schemaSectionsWithDefaultStart.length > 0
    ? schemaSectionsWithDefaultStart.flatMap((entry) => entry.fields)
    : fallbackFields;

  const indexedSchemaSections = schemaSectionsWithDefaultStart.length > 0
    ? (() => {
        let runningIndex = 0;
        return schemaSectionsWithDefaultStart.map((entry) => {
          const fields = entry.fields.map((field) => {
            const fieldIndex = runningIndex;
            runningIndex += 1;
            return { ...field, fieldIndex };
          });

          return {
            section: entry.section,
            fields,
          };
        });
      })()
    : [];

  const requiredFieldsTotal = editableFields.filter((field) => field.mandatory).length;
  const requiredFieldsPending = editableFields.filter((field) => field.mandatory && isFieldEmpty(field)).length;
  const requiredFieldsDone = Math.max(requiredFieldsTotal - requiredFieldsPending, 0);
  const completionPercent = requiredFieldsTotal > 0
    ? Math.round((requiredFieldsDone / requiredFieldsTotal) * 100)
    : 100;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      {isAdmin ? <AdminNav userName={session.user.name} /> : <UserNav userName={session.user.name} />}

      <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3 sm:items-center">
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-slate-900">Ordem de Servico - Manutenção V2</h1>
              <p className="mt-1 text-sm text-slate-500">Atividade #{work.id} | Form fill #{formFill.id}</p>
            </div>
            <div className="grid w-full grid-cols-1 gap-2 sm:w-auto sm:grid-cols-none sm:auto-cols-max sm:grid-flow-col sm:items-center">
              <Link
                href={`/atividades/${work.id}?returnTo=${encodeURIComponent(returnTo)}`}
                className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-slate-300 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-100 sm:w-auto"
              >
                Voltar para atividade
              </Link>
              <Link
                href={returnTo}
                className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-slate-300 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-100 sm:w-auto"
              >
                Voltar para lista
              </Link>
            </div>
          </div>

          {msg ? (
            <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{msg}</p>
          ) : null}

          <section className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-800">Progresso do formulario</p>
                <p className="text-xs text-slate-600">
                  {requiredFieldsDone}/{requiredFieldsTotal} pendencias resolvidas
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-right">
                <p className="text-xs text-slate-500">Progresso</p>
                <p className="text-sm font-semibold text-slate-800">{completionPercent}%</p>
              </div>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-slate-500">Dica: complete primeiro os campos com status pendente.</p>
          </section>

          <form action={salvarPreenchimentoAction} className="mt-5 space-y-4">
            <input type="hidden" name="workId" value={work.id} />
            <input type="hidden" name="fillId" value={formFill.id} />
            <input type="hidden" name="returnTo" value={returnTo} />
            <input type="hidden" name="totalFields" value={editableFields.length} />

            {editableFields.length === 0 ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Este formulario ainda nao possui campos editaveis retornados pela API.
              </div>
            ) : null}

            {indexedSchemaSections.length > 0 ? (
              indexedSchemaSections.map((entry, sectionIndex) => (
                <section
                  key={entry.section.id ?? sectionIndex}
                  className="rounded-xl border border-slate-200 bg-white"
                >
                  <div className="flex flex-col items-start justify-between gap-2 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center">
                    <span className="text-sm font-semibold text-slate-900">{entry.section.name || `Secao ${sectionIndex + 1}`}</span>
                    <span className="text-xs text-slate-500">
                      {(() => {
                        const requiredCount = entry.fields.filter((f) => f.mandatory).length;
                        const pendingRequired = entry.fields.filter((f) => f.mandatory && isFieldEmpty(f)).length;
                        if (requiredCount === 0) return "Sem pendencias";
                        return `${requiredCount - pendingRequired}/${requiredCount} pendencias resolvidas`;
                      })()}
                    </span>
                  </div>
                  <div className="px-4 py-4 space-y-4 bg-slate-50/40">
                    {entry.fields.map((field) => {
                      const safeIndex = field.fieldIndex;
                      const multiSelected = splitMultiValues(field.value);
                      const multiSelectedNormalized = new Set(multiSelected.map(normalizeSelectionValue));
                      const inputId = `field-input-${safeIndex}`;
                      const datetimeValue = toDateTimeLocalValue(field.value);
                      const canUseDateTimeInput = field.fieldKind === "datetime"
                        && (datetimeValue.length > 0 || field.value.trim().length === 0);
                      const shouldCollapse = shouldRenderCollapsedField(field.name);

                      return (
                        <div key={`${field.name}-${field.id ?? safeIndex}`} className="rounded-lg border border-slate-200 bg-white p-3">
                          {shouldCollapse ? (
                            <details>
                              <summary className="flex cursor-pointer list-none items-center justify-between gap-2">
                                <span className="text-sm font-semibold text-slate-800">{field.name}</span>
                                <div className="flex items-center gap-2">
                                  {field.mandatory ? (
                                    isFieldEmpty(field)
                                      ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">Pendente</span>
                                      : <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">Concluido</span>
                                  ) : null}
                                  <span className="text-xs font-medium text-slate-500">Expandir</span>
                                </div>
                              </summary>
                              <div className="mt-3 space-y-2">
                                <input type="hidden" name={`field_id_${safeIndex}`} value={field.id ?? ""} />
                                <input type="hidden" name={`schema_field_id_${safeIndex}`} value={field.formFieldId ?? ""} />
                                <input type="hidden" name={`field_name_${safeIndex}`} value={field.name} />
                                <input type="hidden" name={`field_kind_${safeIndex}`} value={field.fieldKind} />

                                {field.fieldKind === "single_select" && field.options.length > 0 ? (
                                  <select
                                    id={inputId}
                                    name={`field_value_${safeIndex}`}
                                    defaultValue={field.value}
                                    className="h-11 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none ring-sky-200 focus:ring"
                                  >
                                    <option value="">Selecione</option>
                                    {field.options.map((option) => (
                                      <option key={`${option.value}-${safeIndex}`} value={option.value}>
                                        {option.label}
                                      </option>
                                    ))}
                                  </select>
                                ) : field.fieldKind === "multi_select" && field.options.length > 0 ? (
                                  <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
                                    {field.options.map((option) => (
                                      <label key={`${option.value}-${safeIndex}`} className="flex items-center gap-2 text-sm text-slate-700">
                                        {option.id ? (
                                          <input type="hidden" name={`field_option_name_${safeIndex}_${option.id}`} value={option.value} />
                                        ) : null}
                                        <input
                                          id={`${inputId}-${option.value}`}
                                          type="checkbox"
                                          name={`field_value_${safeIndex}`}
                                          value={option.id ? String(option.id) : option.value}
                                          defaultChecked={multiSelected.includes(option.value) || multiSelectedNormalized.has(normalizeSelectionValue(option.value))}
                                          className="h-4 w-4 rounded border-slate-300"
                                        />
                                        {option.label}
                                      </label>
                                    ))}
                                  </div>
                                ) : canUseDateTimeInput ? (
                                  <div className="space-y-2">
                                    <input
                                      id={inputId}
                                      name={`field_value_${safeIndex}`}
                                      type="datetime-local"
                                      defaultValue={datetimeValue}
                                      step={60}
                                      className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none ring-sky-200 focus:ring"
                                    />
                                    <p className="text-xs text-slate-500">Selecione data e hora no calendario para preencher mais rapido.</p>
                                  </div>
                                ) : field.fieldKind === "datetime" ? (
                                  <div className="space-y-2">
                                    <input
                                      id={inputId}
                                      name={`field_value_${safeIndex}`}
                                      type="text"
                                      defaultValue={field.value}
                                      placeholder="Ex.: 01/07/2026 08:30"
                                      className="h-11 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none ring-sky-200 focus:ring"
                                    />
                                    <p className="text-xs text-slate-500">Nao foi possivel converter automaticamente o formato anterior. Ajuste a data e hora neste campo.</p>
                                  </div>
                                ) : field.hasMedia || field.fieldKind === "image" || field.fieldKind === "signature" ? (
                                  <FormFillMediaUpload
                                    fieldIndex={safeIndex}
                                    fieldName={field.name}
                                    fieldKind={field.fieldKind}
                                    accountId={work.account_id}
                                    existingAttachmentIds={field.mediaAttachmentIds}
                                    inputId={inputId}
                                    existingMedia={field.mediaUrls.map((url, mediaIndex) => ({
                                      url,
                                      attachmentId: field.mediaAttachmentIds[mediaIndex],
                                    }))}
                                  />
                                ) : field.fieldKind === "text" ? (
                                  <textarea
                                    id={inputId}
                                    name={`field_value_${safeIndex}`}
                                    defaultValue={field.value}
                                    rows={3}
                                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none ring-sky-200 focus:ring"
                                  />
                                ) : field.fieldKind === "location" ? (
                                  <LocationFieldInput
                                    inputId={inputId}
                                    name={`field_value_${safeIndex}`}
                                    defaultValue={normalizeLocationValue(field.value)}
                                  />
                                ) : (
                                  <input
                                    id={inputId}
                                    name={`field_value_${safeIndex}`}
                                    type="text"
                                    defaultValue={field.value}
                                    className="h-11 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none ring-sky-200 focus:ring"
                                  />
                                )}
                              </div>
                            </details>
                          ) : (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-sm font-semibold text-slate-800">{field.name}</span>
                                {field.mandatory ? (
                                  isFieldEmpty(field)
                                    ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">Pendente</span>
                                    : <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">Concluido</span>
                                ) : null}
                              </div>
                              <input type="hidden" name={`field_id_${safeIndex}`} value={field.id ?? ""} />
                              <input type="hidden" name={`schema_field_id_${safeIndex}`} value={field.formFieldId ?? ""} />
                              <input type="hidden" name={`field_name_${safeIndex}`} value={field.name} />
                              <input type="hidden" name={`field_kind_${safeIndex}`} value={field.fieldKind} />

                              {field.fieldKind === "single_select" && field.options.length > 0 ? (
                                <select
                                  id={inputId}
                                  name={`field_value_${safeIndex}`}
                                  defaultValue={field.value}
                                  className="h-11 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none ring-sky-200 focus:ring"
                                >
                                  <option value="">Selecione</option>
                                  {field.options.map((option) => (
                                    <option key={`${option.value}-${safeIndex}`} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                              ) : field.fieldKind === "multi_select" && field.options.length > 0 ? (
                                <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
                                  {field.options.map((option) => (
                                    <label key={`${option.value}-${safeIndex}`} className="flex items-center gap-2 text-sm text-slate-700">
                                      {option.id ? (
                                        <input type="hidden" name={`field_option_name_${safeIndex}_${option.id}`} value={option.value} />
                                      ) : null}
                                      <input
                                        id={`${inputId}-${option.value}`}
                                        type="checkbox"
                                        name={`field_value_${safeIndex}`}
                                        value={option.id ? String(option.id) : option.value}
                                        defaultChecked={multiSelected.includes(option.value) || multiSelectedNormalized.has(normalizeSelectionValue(option.value))}
                                        className="h-4 w-4 rounded border-slate-300"
                                      />
                                      {option.label}
                                    </label>
                                  ))}
                                </div>
                              ) : canUseDateTimeInput ? (
                                <div className="space-y-2">
                                  <input
                                    id={inputId}
                                    name={`field_value_${safeIndex}`}
                                    type="datetime-local"
                                    defaultValue={datetimeValue}
                                    step={60}
                                    className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none ring-sky-200 focus:ring"
                                  />
                                  <p className="text-xs text-slate-500">Selecione data e hora no calendario para preencher mais rapido.</p>
                                </div>
                              ) : field.fieldKind === "datetime" ? (
                                <div className="space-y-2">
                                  <input
                                    id={inputId}
                                    name={`field_value_${safeIndex}`}
                                    type="text"
                                    defaultValue={field.value}
                                    placeholder="Ex.: 01/07/2026 08:30"
                                    className="h-11 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none ring-sky-200 focus:ring"
                                  />
                                  <p className="text-xs text-slate-500">Nao foi possivel converter automaticamente o formato anterior. Ajuste a data e hora neste campo.</p>
                                </div>
                              ) : field.hasMedia || field.fieldKind === "image" || field.fieldKind === "signature" ? (
                                <FormFillMediaUpload
                                  fieldIndex={safeIndex}
                                  fieldName={field.name}
                                  fieldKind={field.fieldKind}
                                  accountId={work.account_id}
                                  existingAttachmentIds={field.mediaAttachmentIds}
                                  inputId={inputId}
                                  existingMedia={field.mediaUrls.map((url, mediaIndex) => ({
                                    url,
                                    attachmentId: field.mediaAttachmentIds[mediaIndex],
                                  }))}
                                />
                              ) : field.fieldKind === "text" ? (
                                <textarea
                                  id={inputId}
                                  name={`field_value_${safeIndex}`}
                                  defaultValue={field.value}
                                  rows={3}
                                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none ring-sky-200 focus:ring"
                                />
                              ) : field.fieldKind === "location" ? (
                                <LocationFieldInput
                                  inputId={inputId}
                                  name={`field_value_${safeIndex}`}
                                  defaultValue={normalizeLocationValue(field.value)}
                                />
                              ) : (
                                <input
                                  id={inputId}
                                  name={`field_value_${safeIndex}`}
                                  type="text"
                                  defaultValue={field.value}
                                  className="h-11 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none ring-sky-200 focus:ring"
                                />
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))
            ) : (
              editableFields.map((field, index) => (
                <label key={`${field.name}-${index}`} className="block space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{field.name}</span>
                  <input type="hidden" name={`field_id_${index}`} value={field.id ?? ""} />
                  <input type="hidden" name={`schema_field_id_${index}`} value={field.formFieldId ?? ""} />
                  <input type="hidden" name={`field_name_${index}`} value={field.name} />
                  <input type="hidden" name={`field_kind_${index}`} value="text" />
                  <input
                    name={`field_value_${index}`}
                    defaultValue={field.value}
                    className="h-11 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none ring-sky-200 focus:ring"
                  />
                </label>
              ))
            )}

            <div className="sticky bottom-3 z-10 flex flex-col items-stretch justify-between gap-3 rounded-xl border border-slate-200 bg-white/95 p-3 backdrop-blur sm:flex-row sm:items-center">
              <p className="text-xs text-slate-600">
                Pendencias: <span className="font-semibold text-slate-800">{requiredFieldsPending}</span>
              </p>
              <button
                type="submit"
                className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-auto"
                disabled={editableFields.length === 0}
              >
                Salvar preenchimento
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
