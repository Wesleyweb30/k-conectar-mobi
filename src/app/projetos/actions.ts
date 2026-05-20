"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function buildRedirectUrl(basePath: string, message: string) {
  return `${basePath}?msg=${encodeURIComponent(message)}`;
}

async function resolveApiContext() {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? null;
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
  const cookie = requestHeaders.get("cookie") ?? "";

  if (!host) {
    throw new Error("Nao foi possivel resolver host da requisicao");
  }

  return {
    baseUrl: `${protocol}://${host}`,
    cookie,
  };
}

async function apiRequest(path: string, init?: RequestInit) {
  const { baseUrl, cookie } = await resolveApiContext();
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      cookie,
      ...(init?.headers ?? {}),
    },
  });

  let data: Record<string, unknown> | null = null;
  try {
    data = (await response.json()) as Record<string, unknown>;
  } catch {
    data = null;
  }

  return { response, data };
}

function extractErrorMessage(data: Record<string, unknown> | null, fallback: string) {
  const error = typeof data?.error === "string" ? data.error : "";
  return error || fallback;
}

function ensureProjetoPath(projetoId: string) {
  return projetoId ? `/projetos/${projetoId}` : "/projetos";
}

function resolveReturnToPath(projetoId: string, returnToRaw: FormDataEntryValue | null) {
  const base = ensureProjetoPath(projetoId);
  const returnTo = String(returnToRaw ?? "").trim();

  if (returnTo && returnTo.startsWith(`${base}/`)) {
    return returnTo;
  }

  return base;
}

export async function criarProjetoAction(formData: FormData) {
  const nome = String(formData.get("nome") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim() || null;
  const participanteEmailsRaw = formData
    .getAll("participanteEmail")
    .map((value) => String(value ?? "").trim().toLowerCase());
  const participantePapeisRaw = formData
    .getAll("participantePapel")
    .map((value) => String(value ?? "").trim().toLowerCase());

  if (!nome) {
    redirect(buildRedirectUrl("/projetos", "Informe o nome do projeto."));
  }

  const { response, data } = await apiRequest("/api/projetos", {
    method: "POST",
    body: JSON.stringify({ nome, descricao }),
  });

  if (response.status === 401) redirect("/login");
  if (!response.ok) {
    const message = extractErrorMessage(data, "Nao foi possivel criar o projeto.");
    redirect(buildRedirectUrl("/projetos", message));
  }

  const projetoId = String((data?.item as { id?: unknown } | undefined)?.id ?? "").trim();

  const entradasParticipantes = participanteEmailsRaw
    .map((email, idx) => ({
      email,
      papel: participantePapeisRaw[idx] ?? "participante",
    }))
    .filter((item) => item.email);

  const emailUnicos = [...new Set(entradasParticipantes.map((item) => item.email))];
  const papeisValidos = new Set(["visualizador", "editor", "participante"]);
  const papelPorEmail = new Map<string, string>();
  for (const entrada of entradasParticipantes) {
    const papelNormalizado = papeisValidos.has(entrada.papel) ? entrada.papel : "editor";
    papelPorEmail.set(entrada.email, papelNormalizado);
  }

  const emailsFalha: string[] = [];
  if (projetoId && emailUnicos.length > 0) {
    for (const email of emailUnicos) {
      const addRes = await apiRequest(`/api/projetos/${projetoId}/participantes`, {
        method: "POST",
        body: JSON.stringify({ usuarioEmail: email, papel: papelPorEmail.get(email) ?? "participante" }),
      });

      if (!addRes.response.ok) {
        emailsFalha.push(email);
      }
    }
  }

  revalidatePath("/projetos");
  if (!projetoId) {
    redirect(buildRedirectUrl("/projetos", "Projeto criado com sucesso."));
  }

  revalidatePath(`/projetos/${projetoId}`);

  if (emailsFalha.length > 0) {
    redirect(
      buildRedirectUrl(
        `/projetos/${projetoId}`,
        `Projeto criado, mas alguns participantes nao foram adicionados: ${emailsFalha.join(", ")}`,
      ),
    );
  }

  redirect(buildRedirectUrl(`/projetos/${projetoId}`, "Projeto criado com sucesso."));
}

export async function editarProjetoAction(formData: FormData) {
  const projetoId = String(formData.get("projetoId") ?? "").trim();
  const nome = String(formData.get("nome") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim();

  if (!projetoId) {
    redirect(buildRedirectUrl("/projetos", "Projeto invalido."));
  }

  const { response, data } = await apiRequest("/api/projetos", {
    method: "PATCH",
    body: JSON.stringify({
      projetoId,
      nome,
      descricao,
    }),
  });

  if (response.status === 401) redirect("/login");

  const destino = ensureProjetoPath(projetoId);
  if (!response.ok) {
    const message = extractErrorMessage(data, "Nao foi possivel atualizar o projeto.");
    redirect(buildRedirectUrl(destino, message));
  }

  revalidatePath("/projetos");
  revalidatePath(`/projetos/${projetoId}`);
  redirect(buildRedirectUrl(destino, "Projeto atualizado com sucesso."));
}

export async function excluirProjetoAction(formData: FormData) {
  const projetoId = String(formData.get("projetoId") ?? "").trim();
  if (!projetoId) {
    redirect(buildRedirectUrl("/projetos", "Projeto invalido."));
  }

  const { response, data } = await apiRequest("/api/projetos", {
    method: "DELETE",
    body: JSON.stringify({ projetoId }),
  });

  if (response.status === 401) redirect("/login");
  if (!response.ok) {
    const message = extractErrorMessage(data, "Nao foi possivel excluir o projeto.");
    redirect(buildRedirectUrl("/projetos", message));
  }

  revalidatePath("/projetos");
  redirect(buildRedirectUrl("/projetos", "Projeto excluido com sucesso."));
}

export async function adicionarParticipanteAction(formData: FormData) {
  const projetoId = String(formData.get("projetoId") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const papel = String(formData.get("papel") ?? "").trim().toLowerCase();

  if (!projetoId || !email || !papel) {
    redirect(buildRedirectUrl(`/projetos/${projetoId}`, "Dados invalidos para adicionar participante."));
  }

  const { response, data } = await apiRequest(`/api/projetos/${projetoId}/participantes`, {
    method: "POST",
    body: JSON.stringify({ usuarioEmail: email, papel }),
  });

  if (response.status === 401) redirect("/login");
  if (!response.ok) {
    const message = extractErrorMessage(data, "Nao foi possivel salvar participante.");
    redirect(buildRedirectUrl(`/projetos/${projetoId}`, message));
  }

  revalidatePath(`/projetos/${projetoId}`);
  redirect(buildRedirectUrl(`/projetos/${projetoId}`, "Participante salvo com sucesso."));
}

export async function removerParticipanteAction(formData: FormData) {
  const projetoId = String(formData.get("projetoId") ?? "").trim();
  const usuarioId = String(formData.get("usuarioId") ?? "").trim();

  if (!projetoId || !usuarioId) {
    redirect(buildRedirectUrl(`/projetos/${projetoId}`, "Participante invalido."));
  }

  const { response, data } = await apiRequest(`/api/projetos/${projetoId}/participantes`, {
    method: "DELETE",
    body: JSON.stringify({ usuarioId }),
  });

  if (response.status === 401) redirect("/login");
  if (!response.ok) {
    const message = extractErrorMessage(data, "Nao foi possivel remover participante.");
    redirect(buildRedirectUrl(`/projetos/${projetoId}`, message));
  }

  revalidatePath(`/projetos/${projetoId}`);
  redirect(buildRedirectUrl(`/projetos/${projetoId}`, "Participante removido."));
}

export async function atualizarPapelParticipanteAction(formData: FormData) {
  const projetoId = String(formData.get("projetoId") ?? "").trim();
  const usuarioId = String(formData.get("usuarioId") ?? "").trim();
  const papel = String(formData.get("papel") ?? "").trim().toLowerCase();

  if (!projetoId || !usuarioId || !papel) {
    redirect(buildRedirectUrl(`/projetos/${projetoId}`, "Dados invalidos para atualizar papel."));
  }

  const { response, data } = await apiRequest(`/api/projetos/${projetoId}/participantes`, {
    method: "PATCH",
    body: JSON.stringify({ usuarioId, papel }),
  });

  if (response.status === 401) redirect("/login");
  if (!response.ok) {
    const message = extractErrorMessage(data, "Nao foi possivel atualizar o papel do participante.");
    redirect(buildRedirectUrl(`/projetos/${projetoId}`, message));
  }

  revalidatePath(`/projetos/${projetoId}`);
  redirect(buildRedirectUrl(`/projetos/${projetoId}`, "Papel do participante atualizado."));
}

export async function criarTarefaAction(formData: FormData) {
  const projetoId = String(formData.get("projetoId") ?? "").trim();
  const titulo = String(formData.get("titulo") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim() || null;
  const status = String(formData.get("status") ?? "").trim() || "pendente";
  const paradaCodigo = String(formData.get("paradaCodigo") ?? "").trim();
  const responsavelEmail = String(formData.get("responsavelEmail") ?? "").trim().toLowerCase();

  if (!projetoId || !titulo) {
    redirect(buildRedirectUrl(`/projetos/${projetoId}`, "Informe projeto e titulo da tarefa."));
  }

  const { response, data } = await apiRequest(`/api/projetos/${projetoId}/tarefas`, {
    method: "POST",
    body: JSON.stringify({
      titulo,
      descricao,
      status,
      paradaCodigo: paradaCodigo || undefined,
      responsavelEmail: responsavelEmail || undefined,
    }),
  });

  if (response.status === 401) redirect("/login");
  if (!response.ok) {
    const message = extractErrorMessage(data, "Nao foi possivel criar tarefa.");
    redirect(buildRedirectUrl(`/projetos/${projetoId}`, message));
  }

  revalidatePath(`/projetos/${projetoId}`);
  redirect(buildRedirectUrl(`/projetos/${projetoId}`, "Tarefa criada com sucesso."));
}

export async function editarTarefaAction(formData: FormData) {
  const projetoId = String(formData.get("projetoId") ?? "").trim();
  const tarefaId = String(formData.get("tarefaId") ?? "").trim();
  const destino = resolveReturnToPath(projetoId, formData.get("returnTo"));
  const titulo = String(formData.get("titulo") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const paradaCodigo = String(formData.get("paradaCodigo") ?? "").trim();
  const responsavelEmail = String(formData.get("responsavelEmail") ?? "").trim().toLowerCase();

  if (!projetoId || !tarefaId || !titulo) {
    redirect(buildRedirectUrl(destino, "Dados invalidos para atualizar tarefa."));
  }

  const { response, data } = await apiRequest(`/api/projetos/${projetoId}/tarefas`, {
    method: "PATCH",
    body: JSON.stringify({
      tarefaId,
      titulo,
      descricao,
      status,
      paradaCodigo,
      responsavelEmail,
    }),
  });

  if (response.status === 401) redirect("/login");
  if (!response.ok) {
    const message = extractErrorMessage(data, "Nao foi possivel atualizar tarefa.");
    redirect(buildRedirectUrl(destino, message));
  }

  revalidatePath(`/projetos/${projetoId}`);
  redirect(buildRedirectUrl(destino, "Tarefa atualizada com sucesso."));
}

export async function excluirTarefaAction(formData: FormData) {
  const projetoId = String(formData.get("projetoId") ?? "").trim();
  const tarefaId = String(formData.get("tarefaId") ?? "").trim();
  const destino = resolveReturnToPath(projetoId, formData.get("returnTo"));

  if (!projetoId || !tarefaId) {
    redirect(buildRedirectUrl(destino, "Tarefa invalida."));
  }

  const { response, data } = await apiRequest(`/api/projetos/${projetoId}/tarefas`, {
    method: "DELETE",
    body: JSON.stringify({ tarefaId }),
  });

  if (response.status === 401) redirect("/login");
  if (!response.ok) {
    const message = extractErrorMessage(data, "Nao foi possivel excluir tarefa.");
    redirect(buildRedirectUrl(destino, message));
  }

  revalidatePath(`/projetos/${projetoId}`);
  redirect(buildRedirectUrl(destino, "Tarefa excluida."));
}

export async function atualizarStatusTarefaAction(projetoId: string, tarefaId: string, novoStatus: string) {
  "use server";

  if (!projetoId || !tarefaId || !novoStatus) {
    throw new Error("Dados invalidos para atualizar status.");
  }

  const { response, data } = await apiRequest(`/api/projetos/${projetoId}/tarefas`, {
    method: "PATCH",
    body: JSON.stringify({
      tarefaId,
      status: novoStatus,
    }),
  });

  if (response.status === 401) {
    throw new Error("Sessao expirada. Faça login novamente.");
  }

  if (!response.ok) {
    const message = extractErrorMessage(data, "Nao foi possivel atualizar status da tarefa.");
    throw new Error(message);
  }

  revalidatePath(`/projetos/${projetoId}`);
  return { success: true };
}
