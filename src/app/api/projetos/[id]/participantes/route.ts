import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PAPEIS_VALIDOS = new Set(["participante", "visualizador", "editor"]);

type ProjetoPermissoes = {
  existe: boolean;
  criador: boolean;
  participante: boolean;
  papel: string | null;
  podeGerenciarParticipantes: boolean;
};

async function getPermissoesProjeto(
  projetoId: string,
  userId: string,
): Promise<ProjetoPermissoes> {
  const projeto = await prisma.projeto.findUnique({
    where: { id: projetoId },
    select: {
      id: true,
      criadoPorId: true,
      participantes: {
        where: { usuarioId: userId },
        select: { papel: true },
        take: 1,
      },
    },
  });

  if (!projeto) {
    return {
      existe: false,
      criador: false,
      participante: false,
      papel: null,
      podeGerenciarParticipantes: false,
    };
  }


  const criador = projeto.criadoPorId === userId;
  const papel = projeto.participantes[0]?.papel ?? null;
  const participante = Boolean(papel);
  const podeGerenciarParticipantes = criador;

  return {
    existe: true,
    criador,
    participante,
    papel,
    podeGerenciarParticipantes,
  };
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projetoId } = await context.params;
  const permissoes = await getPermissoesProjeto(projetoId, session.user.id);

  if (!permissoes.existe) {
    return NextResponse.json({ error: "Projeto nao encontrado" }, { status: 404 });
  }

  if (!permissoes.criador && !permissoes.participante) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const participantes = await prisma.participanteProjeto.findMany({
    where: { projetoId },
    include: {
      usuario: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          role: true,
        },
      },
    },
    orderBy: [{ papel: "asc" }, { usuario: { name: "asc" } }],
  });

  return NextResponse.json({
    criadorId: permissoes.criador ? session.user.id : undefined,
    items: participantes,
  });
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projetoId } = await context.params;
  const permissoes = await getPermissoesProjeto(projetoId, session.user.id);

  if (!permissoes.existe) {
    return NextResponse.json({ error: "Projeto nao encontrado" }, { status: 404 });
  }

  if (!permissoes.podeGerenciarParticipantes) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as {
    usuarioId?: unknown;
    usuarioEmail?: unknown;
    papel?: unknown;
  };
  const usuarioIdInput = String(body.usuarioId ?? "").trim();
  const usuarioEmail = String(body.usuarioEmail ?? "").trim().toLowerCase();
  const papel = String(body.papel ?? "").trim().toLowerCase();

  if ((!usuarioIdInput && !usuarioEmail) || !PAPEIS_VALIDOS.has(papel)) {
    return NextResponse.json(
      { error: "usuarioId ou usuarioEmail e papel valido sao obrigatorios" },
      { status: 400 },
    );
  }

  const usuario = await prisma.user.findUnique({
    where: usuarioIdInput ? { id: usuarioIdInput } : { email: usuarioEmail },
    select: { id: true },
  });

  if (!usuario) {
    return NextResponse.json({ error: "Usuario nao encontrado" }, { status: 404 });
  }

  const participante = await prisma.participanteProjeto.upsert({
    where: {
      usuarioId_projetoId: {
        usuarioId: usuario.id,
        projetoId,
      },
    },
    create: {
      usuarioId: usuario.id,
      projetoId,
      papel,
    },
    update: {
      papel,
    },
    include: {
      usuario: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          role: true,
        },
      },
    },
  });

  return NextResponse.json({ item: participante }, { status: 201 });
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projetoId } = await context.params;
  const permissoes = await getPermissoesProjeto(projetoId, session.user.id);

  if (!permissoes.existe) {
    return NextResponse.json({ error: "Projeto nao encontrado" }, { status: 404 });
  }

  if (!permissoes.podeGerenciarParticipantes) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as {
    usuarioId?: unknown;
    usuarioEmail?: unknown;
    papel?: unknown;
  };
  const usuarioIdInput = String(body.usuarioId ?? "").trim();
  const usuarioEmail = String(body.usuarioEmail ?? "").trim().toLowerCase();
  const papel = String(body.papel ?? "").trim().toLowerCase();

  if ((!usuarioIdInput && !usuarioEmail) || !PAPEIS_VALIDOS.has(papel)) {
    return NextResponse.json(
      { error: "usuarioId ou usuarioEmail e papel valido sao obrigatorios" },
      { status: 400 },
    );
  }

  const usuario = await prisma.user.findUnique({
    where: usuarioIdInput ? { id: usuarioIdInput } : { email: usuarioEmail },
    select: { id: true },
  });

  if (!usuario) {
    return NextResponse.json({ error: "Usuario nao encontrado" }, { status: 404 });
  }

  const participante = await prisma.participanteProjeto.findUnique({
    where: {
      usuarioId_projetoId: {
        usuarioId: usuario.id,
        projetoId,
      },
    },
    select: { id: true },
  });

  if (!participante) {
    return NextResponse.json({ error: "Participante nao encontrado" }, { status: 404 });
  }

  const atualizado = await prisma.participanteProjeto.update({
    where: {
      usuarioId_projetoId: {
        usuarioId: usuario.id,
        projetoId,
      },
    },
    data: { papel },
    include: {
      usuario: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          role: true,
        },
      },
    },
  });

  return NextResponse.json({ item: atualizado });
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projetoId } = await context.params;
  const permissoes = await getPermissoesProjeto(projetoId, session.user.id);

  if (!permissoes.existe) {
    return NextResponse.json({ error: "Projeto nao encontrado" }, { status: 404 });
  }

  const body = (await req.json().catch(() => ({}))) as { usuarioId?: unknown };
  const usuarioId = String(body.usuarioId ?? req.nextUrl.searchParams.get("usuarioId") ?? "").trim();

  if (!usuarioId) {
    return NextResponse.json({ error: "usuarioId e obrigatorio" }, { status: 400 });
  }

  const projeto = await prisma.projeto.findUnique({
    where: { id: projetoId },
    select: { criadoPorId: true },
  });

  if (!projeto) {
    return NextResponse.json({ error: "Projeto nao encontrado" }, { status: 404 });
  }

  const isCriador = projeto.criadoPorId === session.user.id;
  const isAutoRemocao = usuarioId === session.user.id;

  if (!isCriador && !isAutoRemocao) {
    return NextResponse.json({ error: "Apenas o criador pode remover outros participantes" }, { status: 403 });
  }

  if (usuarioId === projeto.criadoPorId) {
    return NextResponse.json({ error: "O criador do projeto nao pode ser removido" }, { status: 400 });
  }

  const deleted = await prisma.participanteProjeto.deleteMany({
    where: {
      usuarioId,
      projetoId,
    },
  });

  if (deleted.count === 0) {
    return NextResponse.json({ error: "Participante nao encontrado" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
