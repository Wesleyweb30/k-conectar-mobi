"use server";

import { redirect } from "next/navigation";
import {
  createProduttivoFormFill,
  getLatestProduttivoFormFillByWorkId,
} from "@/service/produttivo.service";

function pickFirst(value: FormDataEntryValue | null): string {
  return String(value ?? "").trim();
}

function toPositiveInt(value: FormDataEntryValue | null): number | null {
  const parsed = Number.parseInt(pickFirst(value), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function resolveReturnToPath(rawValue: string | undefined): string {
  if (!rawValue) return "/atividades";
  if (!rawValue.startsWith("/")) return "/atividades";
  if (rawValue.startsWith("//")) return "/atividades";
  return rawValue;
}

export async function iniciarPreenchimentoAction(formData: FormData) {
  const workId = toPositiveInt(formData.get("workId"));
  const returnTo = resolveReturnToPath(pickFirst(formData.get("returnTo")));

  if (!workId) {
    redirect("/atividades?msg=Atividade+invalida+para+iniciar+preenchimento");
  }

  let formFillId: number | null = null;

  try {
    const latest = await getLatestProduttivoFormFillByWorkId(workId);

    if (latest?.id) {
      formFillId = latest.id;
    } else {
      const created = await createProduttivoFormFill({ work_id: workId });
      formFillId = created.id;
    }
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Nao foi possivel iniciar o preenchimento da atividade.";

    const next = `/atividades/${workId}?returnTo=${encodeURIComponent(returnTo)}&msg=${encodeURIComponent(message)}`;
    redirect(next);
  }

  if (!formFillId) {
    const next = `/atividades/${workId}?returnTo=${encodeURIComponent(returnTo)}&msg=${encodeURIComponent("Nao foi possivel abrir o formulario.")}`;
    redirect(next);
  }

  redirect(`/atividades/${workId}/preenchimento/${formFillId}?returnTo=${encodeURIComponent(returnTo)}`);
}
