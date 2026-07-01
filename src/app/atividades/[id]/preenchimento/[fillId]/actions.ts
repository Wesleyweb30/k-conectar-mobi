"use server";

import { redirect } from "next/navigation";
import { updateProduttivoFormFill } from "@/service/produttivo.service";

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
    name: string;
    value: string | string[] | null;
    notes?: string | null;
    attachment_ids?: number[];
    accuracy?: number | null;
  }> = [];

  for (let index = 0; index < safeTotal; index += 1) {
    const name = String(formData.get(`field_name_${index}`) ?? "").trim();
    const fieldKind = String(formData.get(`field_kind_${index}`) ?? "text").trim();
    const rawValue = String(formData.get(`field_value_${index}`) ?? "");
    const uploadedAttachmentIdsRaw = String(formData.get(`field_uploaded_attachment_ids_${index}`) ?? "").trim();
    const uploadedAttachmentIds = uploadedAttachmentIdsRaw
      .split(",")
      .map((item) => Number.parseInt(item.trim(), 10))
      .filter((id) => Number.isInteger(id) && id > 0);

    if (!name) continue;

    if (fieldKind === "multi_select") {
      const selectedValues = formData
        .getAll(`field_value_${index}`)
        .map((item) => String(item).trim())
        .filter((item) => item.length > 0);

      const unique = [...new Set(selectedValues)];

      fieldValuesAttributes.push({
        name,
        value: unique.length > 0 ? unique.join(",") : null,
      });
      continue;
    }

    if (fieldKind === "image" || fieldKind === "signature") {
      const attachmentIds = [...new Set(uploadedAttachmentIds)];

      fieldValuesAttributes.push({
        name,
        value: rawValue.trim().length > 0 ? rawValue : null,
        ...(attachmentIds.length > 0 ? { attachment_ids: attachmentIds } : {}),
      });
      continue;
    }

    fieldValuesAttributes.push({
      name,
      value: rawValue.trim().length > 0 ? rawValue : null,
    });
  }

  try {
    await updateProduttivoFormFill(fillId, {
      work_id: workId,
      field_values_attributes: fieldValuesAttributes,
    });
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
