"use server";

import { redirect } from "next/navigation";
import { getProduttivoFormFill, updateProduttivoFormFill } from "@/service/produttivo.service";
import type { ProduttivoFieldValue } from "@/types/produttivo";

function toPositiveInt(value: FormDataEntryValue | null): number | null {
  const parsed = Number.parseInt(String(value ?? "").trim(), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function resolveReturnToPath(rawValue: string | undefined): string {
  if (!rawValue) return "/atividades";
  if (!rawValue.startsWith("/")) return "/atividades";
  if (rawValue.startsWith("//")) return "/atividades";
  return rawValue;
}

function stripDiacritics(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalizeFieldKey(value: string | null | undefined): string {
  return String(value ?? "").trim().replace(/\s+/g, " ").toUpperCase();
}

function normalizeLooseFieldKey(value: string | null | undefined): string {
  return stripDiacritics(normalizeFieldKey(value));
}

function buildExistingFieldLookup(fields: ProduttivoFieldValue[] | undefined) {
  const byStrict = new Map<string, ProduttivoFieldValue>();
  const byLoose = new Map<string, ProduttivoFieldValue>();

  (fields ?? []).forEach((field) => {
    const strictKey = normalizeFieldKey(field.name);
    if (strictKey && !byStrict.has(strictKey)) {
      byStrict.set(strictKey, field);
    }

    const looseKey = normalizeLooseFieldKey(field.name);
    if (looseKey && !byLoose.has(looseKey)) {
      byLoose.set(looseKey, field);
    }
  });

  return { byStrict, byLoose };
}

function toComparableMultiValues(value: string | string[] | null | undefined): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeFieldKey(item))
      .filter((item) => item.length > 0);
  }

  if (typeof value !== "string") return [];

  return value
    .split(/[\n,;]+/)
    .map((item) => normalizeFieldKey(item))
    .filter((item) => item.length > 0);
}

type MultiSelectSubmission = {
  id?: number;
  field_id?: number;
  field_option_ids?: number[];
  name: string;
  selectedValues: string[];
};

export async function salvarPreenchimentoAction(formData: FormData) {
  const workId = toPositiveInt(formData.get("workId"));
  const fillId = toPositiveInt(formData.get("fillId"));
  const returnTo = resolveReturnToPath(String(formData.get("returnTo") ?? ""));

  if (!workId || !fillId) {
    redirect("/atividades?msg=Preenchimento+invalido");
  }

  const totalFields = Number.parseInt(String(formData.get("totalFields") ?? "0"), 10);
  const safeTotal = Number.isInteger(totalFields) && totalFields > 0 ? totalFields : 0;

  const fieldValuesAttributes: Array<{
    id?: number;
    field_id?: number;
    field_option_ids?: number[];
    name: string;
    value: string | string[] | null;
    notes?: string | null;
    attachment_ids?: number[];
    accuracy?: number | null;
  }> = [];
  const multiSelectSubmissions: MultiSelectSubmission[] = [];

  const existingFill = await getProduttivoFormFill(fillId).catch(() => null);
  const existingLookup = buildExistingFieldLookup(existingFill?.field_values);

  for (let index = 0; index < safeTotal; index += 1) {
    const postedFieldId = toPositiveInt(formData.get(`field_id_${index}`));
    const schemaFieldId = toPositiveInt(formData.get(`schema_field_id_${index}`));
    const postedName = String(formData.get(`field_name_${index}`) ?? "");
    const fieldKind = String(formData.get(`field_kind_${index}`) ?? "text").trim();
    const rawValue = String(formData.get(`field_value_${index}`) ?? "");
    const uploadedAttachmentIdsRaw = String(formData.get(`field_uploaded_attachment_ids_${index}`) ?? "").trim();
    const uploadedAttachmentIds = uploadedAttachmentIdsRaw
      .split(",")
      .map((item) => Number.parseInt(item.trim(), 10))
      .filter((id) => Number.isInteger(id) && id > 0);

    if (!postedName.trim()) continue;

    const strictKey = normalizeFieldKey(postedName);
    const looseKey = normalizeLooseFieldKey(postedName);
    const existingField =
      existingLookup.byStrict.get(strictKey)
      ?? existingLookup.byLoose.get(looseKey);

    const existingFieldId = typeof existingField?.id === "number" && existingField.id > 0
      ? existingField.id
      : null;
    const fieldId = postedFieldId ?? existingFieldId;
    const fieldName = String(existingField?.name ?? postedName);

    if (fieldKind === "multi_select") {
      const selectedRaw = formData
        .getAll(`field_value_${index}`)
        .map((item) => String(item))
        .filter((item) => item.trim().length > 0);

      const selectedOptionIds = [...new Set(selectedRaw
        .map((item) => Number.parseInt(item, 10))
        .filter((id) => Number.isInteger(id) && id > 0))];

      const selectedValues = selectedRaw
        .map((item) => {
          const parsedId = Number.parseInt(item, 10);
          if (Number.isInteger(parsedId) && parsedId > 0) {
            return String(formData.get(`field_option_name_${index}_${parsedId}`) ?? "");
          }
          return item;
        })
        .filter((item) => item.trim().length > 0);

      const unique = [...new Set(selectedValues)];

      fieldValuesAttributes.push({
        ...(fieldId ? { id: fieldId } : {}),
        ...(schemaFieldId ? { field_id: schemaFieldId } : {}),
        ...(selectedOptionIds.length > 0 ? { field_option_ids: selectedOptionIds } : {}),
        name: fieldName,
        value: unique.length > 0 ? unique : null,
      });

      multiSelectSubmissions.push({
        ...(fieldId ? { id: fieldId } : {}),
        ...(schemaFieldId ? { field_id: schemaFieldId } : {}),
        ...(selectedOptionIds.length > 0 ? { field_option_ids: selectedOptionIds } : {}),
        name: fieldName,
        selectedValues: unique,
      });
      continue;
    }

    if (fieldKind === "image" || fieldKind === "signature") {
      const attachmentIds = [...new Set(uploadedAttachmentIds)];

      fieldValuesAttributes.push({
        ...(fieldId ? { id: fieldId } : {}),
        ...(schemaFieldId ? { field_id: schemaFieldId } : {}),
        name: fieldName,
        value: rawValue.trim().length > 0 ? rawValue : null,
        ...(attachmentIds.length > 0 ? { attachment_ids: attachmentIds } : {}),
      });
      continue;
    }

    fieldValuesAttributes.push({
      ...(fieldId ? { id: fieldId } : {}),
      ...(schemaFieldId ? { field_id: schemaFieldId } : {}),
      name: fieldName,
      value: rawValue.trim().length > 0 ? rawValue : null,
    });
  }

  try {
    await updateProduttivoFormFill(fillId, {
      work_id: workId,
      field_values_attributes: fieldValuesAttributes,
    });

    if (multiSelectSubmissions.length > 0) {
      const refreshedFill = await getProduttivoFormFill(fillId).catch(() => null);
      const refreshedLookup = buildExistingFieldLookup(refreshedFill?.field_values);

      const retryAttributes = multiSelectSubmissions
        .filter((submission) => submission.selectedValues.length > 0)
        .map((submission) => {
          const strictKey = normalizeFieldKey(submission.name);
          const looseKey = normalizeLooseFieldKey(submission.name);
          const refreshedField =
            refreshedLookup.byStrict.get(strictKey)
            ?? refreshedLookup.byLoose.get(looseKey);

          const expected = new Set(submission.selectedValues.map((item) => normalizeFieldKey(item)));
          const current = new Set(toComparableMultiValues(refreshedField?.value));

          const missingSomeValue = [...expected].some((item) => !current.has(item));
          if (!missingSomeValue) return null;

          const retryName = String(refreshedField?.name ?? submission.name);
          const retryId = typeof refreshedField?.id === "number" && refreshedField.id > 0
            ? refreshedField.id
            : submission.id;

          return {
            ...(retryId ? { id: retryId } : {}),
            ...(submission.field_id ? { field_id: submission.field_id } : {}),
            ...(submission.field_option_ids?.length ? { field_option_ids: submission.field_option_ids } : {}),
            name: retryName,
            value: submission.selectedValues.join(", "),
          };
        })
        .filter((item): item is {
          id?: number;
          field_id?: number;
          field_option_ids?: number[];
          name: string;
          value: string;
        } => Boolean(item));

      if (retryAttributes.length > 0) {
        await updateProduttivoFormFill(fillId, {
          work_id: workId,
          field_values_attributes: retryAttributes,
        });
      }
    }
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Nao foi possivel salvar o preenchimento.";

    redirect(
      `/atividades/${workId}/preenchimento/${fillId}?returnTo=${encodeURIComponent(returnTo)}&msg=${encodeURIComponent(message)}`,
    );
  }

  redirect(
    `/atividades/${workId}/preenchimento/${fillId}?returnTo=${encodeURIComponent(returnTo)}&msg=${encodeURIComponent("Preenchimento salvo com sucesso.")}`,
  );
}
