"use server";

import { redirect } from "next/navigation";
import {
  createProduttivoFormFill,
  createProduttivoWork,
  FORM_ID_MANUTENCAO,
  getLatestProduttivoFormFillByWorkId,
  getProduttivoResourcePlace,
} from "@/service/produttivo.service";

function buildRedirectUrl(
  basePath: string,
  message: string,
  extra?: { returnTo?: string; localQ?: string; resourcePlaceId?: string },
) {
  const params = new URLSearchParams();
  params.set("msg", message);

  if (extra?.returnTo) params.set("returnTo", extra.returnTo);
  if (extra?.localQ) params.set("localQ", extra.localQ);
  if (extra?.resourcePlaceId) params.set("resourcePlaceId", extra.resourcePlaceId);

  return `${basePath}?${params.toString()}`;
}

function resolveReturnToPath(returnToRaw: FormDataEntryValue | null) {
  const returnTo = String(returnToRaw ?? "").trim();

  if (returnTo.startsWith("/dashboard/atividades") || returnTo.startsWith("/admin/atividades")) {
    return returnTo;
  }

  return "/atividades";
}

function toPositiveInt(value: FormDataEntryValue | null): number | undefined {
  const parsed = Number(String(value ?? "").trim());
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export async function criarAtividadeAction(formData: FormData) {
  const returnTo = resolveReturnToPath(formData.get("returnTo"));
  const localQ = String(formData.get("localQ") ?? "").trim();

  const title = String(formData.get("title") ?? "").trim();
  const resourcePlaceIdRaw = String(formData.get("resource_place_id") ?? "").trim();
  const resourcePlaceId = toPositiveInt(formData.get("resource_place_id"));

  if (!title || !resourcePlaceId) {
    redirect(
      buildRedirectUrl("/atividades/nova", "Preencha titulo e local.", {
        returnTo,
        localQ,
        resourcePlaceId: resourcePlaceIdRaw,
      }),
    );
  }

  let accountId: number | undefined;
  try {
    const resourcePlace = await getProduttivoResourcePlace(resourcePlaceId);
    if (resourcePlace.account_id && Number(resourcePlace.account_id) > 0) {
      accountId = Number(resourcePlace.account_id);
    }
  } catch {
    redirect(
      buildRedirectUrl("/atividades/nova", "Nao foi possivel consultar o local selecionado.", {
        returnTo,
        localQ,
        resourcePlaceId: resourcePlaceIdRaw,
      }),
    );
  }

  if (!accountId) {
    redirect(
      buildRedirectUrl("/atividades/nova", "Local invalido para criacao da atividade.", {
        returnTo,
        localQ,
        resourcePlaceId: resourcePlaceIdRaw,
      }),
    );
  }

  const normalizedTitle = title;
  let createdWorkId: number | null = null;
  let createdWorkStartAt = "";

  try {
    const created = await createProduttivoWork({
      account_id: accountId,
      form_id: FORM_ID_MANUTENCAO,
      title: normalizedTitle,
      status: "not_started",
      resource_place_id: resourcePlaceId,
    });

    createdWorkId = created.id;
    createdWorkStartAt = String(created.created_at ?? "").trim() || new Date().toISOString();
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Nao foi possivel criar atividade no Produttivo.";

    redirect(
      buildRedirectUrl("/atividades/nova", message, {
        returnTo,
        localQ,
        resourcePlaceId: resourcePlaceIdRaw,
      }),
    );
  }

  if (!createdWorkId) {
    redirect(buildRedirectUrl(returnTo, "Atividade criada, mas nao foi possivel abrir o detalhe."));
  }

  let formFillId: number | null = null;

  try {
    const latest = await getLatestProduttivoFormFillByWorkId(createdWorkId);

    if (latest?.id) {
      formFillId = latest.id;
    } else {
      const created = await createProduttivoFormFill({ work_id: createdWorkId });
      formFillId = created.id;
    }
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Atividade criada, mas nao foi possivel abrir o preenchimento.";

    redirect(`/atividades/${createdWorkId}?returnTo=${encodeURIComponent(returnTo)}&msg=${encodeURIComponent(message)}`);
  }

  if (!formFillId) {
    redirect(`/atividades/${createdWorkId}?returnTo=${encodeURIComponent(returnTo)}&msg=${encodeURIComponent("Atividade criada, mas nao foi possivel abrir o preenchimento.")}`);
  }

  redirect(`/atividades/${createdWorkId}/preenchimento/${formFillId}?returnTo=${encodeURIComponent(returnTo)}&msg=${encodeURIComponent("Atividade criada com sucesso.")}&defaultStartAt=${encodeURIComponent(createdWorkStartAt)}`);
}
