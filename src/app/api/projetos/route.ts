import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PAPEIS_VALIDOS = new Set(["participante", "visualizador", "editor"]);

type ParticipanteInput = {
  usuarioId: string;
  papel: string;
};

function normalizeParticipantesInput(raw: unknown): ParticipanteInput[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item) => {
      const usuarioId = String((item as { usuarioId?: unknown }).usuarioId ?? "").trim();
      const papel = String((item as { papel?: unknown }).papel ?? "").trim().toLowerCase();
      return { usuarioId, papel };
    })
    .filter((item) => item.usuarioId && PAPEIS_VALIDOS.has(item.papel));
}

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const projetos = await prisma.projeto.findMany({
    where: {
      OR: [
        { criadoPorId: userId },
        { participantes: { some: { usuarioId: userId } } },
      ],
    },
    include: {
      _count: {
        select: {
          tarefas: true,
          participantes: true,
        },
      },
      participantes: {
        where: { usuarioId: userId },
        select: { papel: true },
        take: 1,
      },
    },
    orderBy: { atualizadoEm: "desc" },
  });

  const projetoIds = projetos.map((projeto) => projeto.id);
  const tarefasAgrupadasPorStatus =
    projetoIds.length > 0
      ? await prisma.tarefa.groupBy({
          by: ["projetoId", "status"],
          where: { projetoId: { in: projetoIds } },
          _count: { _all: true },
        })
      : [];

  const totaisPorProjeto = new Map<
    string,
    { tarefasAFazer: number; tarefasEmAndamento: number; tarefasFinalizadas: number }
  >();

  for (const item of tarefasAgrupadasPorStatus) {
    const atual = totaisPorProjeto.get(item.projetoId) ?? {
      tarefasAFazer: 0,
      tarefasEmAndamento: 0,
      tarefasFinalizadas: 0,
    };

    if (item.status === "pendente") atual.tarefasAFazer = item._count._all;
    if (item.status === "em_andamento") atual.tarefasEmAndamento = item._count._all;
    if (item.status === "concluida") atual.tarefasFinalizadas = item._count._all;

    totaisPorProjeto.set(item.projetoId, atual);
  }

  const items = projetos.map((projeto) => {
    const totaisStatus = totaisPorProjeto.get(projeto.id) ?? {
      tarefasAFazer: 0,
      tarefasEmAndamento: 0,
      tarefasFinalizadas: 0,
    };

    return {
      id: projeto.id,
      nome: projeto.nome,
      descricao: projeto.descricao,
      criadoPorId: projeto.criadoPorId,
      criadoEm: projeto.criadoEm,
      atualizadoEm: projeto.atualizadoEm,
      papelAtual:
        projeto.criadoPorId === userId
          ? "owner"
          : (projeto.participantes[0]?.papel ?? "visualizador"),
      totais: {
        tarefas: projeto._count.tarefas,
        participantes: projeto._count.participantes,
        tarefasAFazer: totaisStatus.tarefasAFazer,
        tarefasEmAndamento: totaisStatus.tarefasEmAndamento,
        tarefasFinalizadas: totaisStatus.tarefasFinalizadas,
      },
    };
  });

  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as {
    nome?: unknown;
    descricao?: unknown;
    participantes?: unknown;
  };

  const nome = String(body.nome ?? "").trim();
  const descricaoRaw = String(body.descricao ?? "").trim();
  const descricao = descricaoRaw || null;

  if (!nome) {
    return NextResponse.json({ error: "nome e obrigatorio" }, { status: 400 });
  }


  const participantesInput = normalizeParticipantesInput(body.participantes);
  const participantesUnicosMap = new Map<string, ParticipanteInput>();

  // Adiciona o criador como Owner
  participantesUnicosMap.set(session.user.id, { usuarioId: session.user.id, papel: "owner" });

  for (const participante of participantesInput) {
    if (participante.usuarioId === session.user.id) continue;
    participantesUnicosMap.set(participante.usuarioId, participante);
  }

  const participantesUnicos = [...participantesUnicosMap.values()];
  const usuarioIds = participantesUnicos.map((item) => item.usuarioId);

  if (usuarioIds.length > 0) {
    const usuariosExistentes = await prisma.user.findMany({
      where: { id: { in: usuarioIds } },
      select: { id: true },
    });

    if (usuariosExistentes.length !== usuarioIds.length) {
      return NextResponse.json(
        { error: "Um ou mais usuarios informados nao existem" },
        { status: 400 },
      );
    }
  }

  const projeto = await prisma.projeto.create({
    data: {
      nome,
      descricao,
      criadoPorId: session.user.id,
      participantes: {
        createMany: {
          data: participantesUnicos.map((item) => ({
            usuarioId: item.usuarioId,
            papel: item.papel,
          })),
        },
      },
    },
    include: {
      _count: {
        select: {
          tarefas: true,
          participantes: true,
        },
      },
    },
  });

  return NextResponse.json(
    {
      item: {
        id: projeto.id,
        nome: projeto.nome,
        descricao: projeto.descricao,
        criadoPorId: projeto.criadoPorId,
        criadoEm: projeto.criadoEm,
        atualizadoEm: projeto.atualizadoEm,
        papelAtual: "owner",
        totais: {
          tarefas: projeto._count.tarefas,
          participantes: projeto._count.participantes,
        },
      },
    },
    { status: 201 },
  );
}

export async function PATCH(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as {
    projetoId?: unknown;
    nome?: unknown;
    descricao?: unknown;
  };

  const projetoId = String(body.projetoId ?? "").trim();
  if (!projetoId) {
    return NextResponse.json({ error: "projetoId e obrigatorio" }, { status: 400 });
  }

  const projeto = await prisma.projeto.findUnique({
    where: { id: projetoId },
    select: { id: true, criadoPorId: true },
  });

  if (!projeto) {
    return NextResponse.json({ error: "Projeto nao encontrado" }, { status: 404 });
  }

  const podeEditar =
    projeto.criadoPorId === session.user.id || session.user.role === "admin";
  if (!podeEditar) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const data: { nome?: string; descricao?: string | null } = {};

  if (body.nome !== undefined) {
    const nome = String(body.nome ?? "").trim();
    if (!nome) {
      return NextResponse.json({ error: "nome nao pode ser vazio" }, { status: 400 });
    }
    data.nome = nome;
  }

  if (body.descricao !== undefined) {
    data.descricao = String(body.descricao ?? "").trim() || null;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { error: "Informe ao menos um campo para atualizar" },
      { status: 400 },
    );
  }

  const atualizado = await prisma.projeto.update({
    where: { id: projetoId },
    data,
    include: {
      _count: {
        select: {
          tarefas: true,
          participantes: true,
        },
      },
    },
  });

  return NextResponse.json({
    item: {
      id: atualizado.id,
      nome: atualizado.nome,
      descricao: atualizado.descricao,
      criadoPorId: atualizado.criadoPorId,
      criadoEm: atualizado.criadoEm,
      atualizadoEm: atualizado.atualizadoEm,
      totais: {
        tarefas: atualizado._count.tarefas,
        participantes: atualizado._count.participantes,
      },
    },
  });
}

export async function DELETE(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { projetoId?: unknown };
  const projetoId = String(body.projetoId ?? req.nextUrl.searchParams.get("projetoId") ?? "").trim();

  if (!projetoId) {
    return NextResponse.json({ error: "projetoId e obrigatorio" }, { status: 400 });
  }

  const projeto = await prisma.projeto.findUnique({
    where: { id: projetoId },
    select: { id: true, criadoPorId: true },
  });

  if (!projeto) {
    return NextResponse.json({ error: "Projeto nao encontrado" }, { status: 404 });
  }

  const podeExcluir =
    projeto.criadoPorId === session.user.id || session.user.role === "admin";
  if (!podeExcluir) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.$transaction([
    prisma.tarefa.deleteMany({ where: { projetoId } }),
    prisma.participanteProjeto.deleteMany({ where: { projetoId } }),
    prisma.projeto.delete({ where: { id: projetoId } }),
  ]);

  return NextResponse.json({ ok: true });
}
