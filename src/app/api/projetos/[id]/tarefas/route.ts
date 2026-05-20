import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type ProjetoPermissoes = {
  existe: boolean;
  criador: boolean;
  participante: boolean;
  papel: string | null;
  podeEditarTarefas: boolean;
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
      podeEditarTarefas: false,
    };
  }

  const criador = projeto.criadoPorId === userId;
  const papel = projeto.participantes[0]?.papel ?? null;
  const participante = Boolean(papel);
  const podeEditarTarefas = criador || papel === "editor" || papel === "owner";

  return {
    existe: true,
    criador,
    participante,
    papel,
    podeEditarTarefas,
  };
}

async function isResponsavelValido(projetoId: string, responsavelId: string) {
  const projeto = await prisma.projeto.findUnique({
    where: { id: projetoId },
    select: { criadoPorId: true },
  });

  if (!projeto) return false;
  if (projeto.criadoPorId === responsavelId) return true;

  const participante = await prisma.participanteProjeto.findUnique({
    where: {
      usuarioId_projetoId: {
        usuarioId: responsavelId,
        projetoId,
      },
    },
    select: { papel: true },
  });

  if (!participante) return false;
  return participante.papel === "editor";
}

export async function GET(
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

  if (!permissoes.criador && !permissoes.participante) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Paginação
  const { searchParams } = new URL(req.url);
  const page = Math.max(Number(searchParams.get("page")) || 1, 1);
  const perPage = Math.max(Number(searchParams.get("perPage")) || 10, 1);
  const skip = (page - 1) * perPage;

  const [tarefas, total] = await Promise.all([
    prisma.tarefa.findMany({
      where: { projetoId },
      include: {
        responsavel: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        parada: {
          select: {
            id: true,
            codigo: true,
            status: true,
            municipio: true,
            bairro: true,
            novaTipologia: true,
          },
        },
      },
      orderBy: [{ atualizadoEm: "desc" }, { criadoEm: "desc" }],
      skip,
      take: perPage,
    }),
    prisma.tarefa.count({ where: { projetoId } }),
  ]);

  return NextResponse.json({ items: tarefas, total, page, perPage });
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

  if (!permissoes.podeEditarTarefas) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as {
    titulo?: unknown;
    descricao?: unknown;
    status?: unknown;
    responsavelId?: unknown;
    responsavelEmail?: unknown;
    paradaId?: unknown;
    paradaCodigo?: unknown;
  };

  const titulo = String(body.titulo ?? "").trim();
  const descricao = String(body.descricao ?? "").trim() || null;
  const status = String(body.status ?? "").trim() || "pendente";
  const responsavelIdRaw = String(body.responsavelId ?? "").trim();
  const responsavelEmail = String(body.responsavelEmail ?? "").trim().toLowerCase();
  const paradaIdRaw = String(body.paradaId ?? "").trim();
  const paradaCodigo = String(body.paradaCodigo ?? "").trim();

  if (!titulo) {
    return NextResponse.json({ error: "titulo e obrigatorio" }, { status: 400 });
  }

  let paradaId: string | null = null;
  if (paradaIdRaw || paradaCodigo) {
    const parada = await prisma.parada.findUnique({
      where: paradaIdRaw ? { id: paradaIdRaw } : { codigo: paradaCodigo },
      select: { id: true },
    });
    if (!parada) {
      return NextResponse.json({ error: "Parada nao encontrada" }, { status: 404 });
    }
    paradaId = parada.id;
  }

  let responsavelId: string | null = null;
  if (responsavelIdRaw || responsavelEmail) {
    const usuario = await prisma.user.findUnique({
      where: responsavelIdRaw ? { id: responsavelIdRaw } : { email: responsavelEmail },
      select: { id: true },
    });
    if (!usuario) {
      return NextResponse.json({ error: "Responsavel nao encontrado" }, { status: 404 });
    }

    const responsavelValido = await isResponsavelValido(projetoId, usuario.id);
    if (!responsavelValido) {
      return NextResponse.json(
        { error: "Responsavel deve participar do projeto com papel editor ou participante" },
        { status: 400 },
      );
    }

    responsavelId = usuario.id;
  }

  const tarefa = await prisma.tarefa.create({
    data: {
      projetoId,
      titulo,
      descricao,
      status,
      responsavelId,
      paradaId,
    },
    include: {
      responsavel: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      parada: {
        select: {
          id: true,
          codigo: true,
          status: true,
          municipio: true,
          bairro: true,
        },
      },
    },
  });

  return NextResponse.json({ item: tarefa }, { status: 201 });
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

  if (!permissoes.podeEditarTarefas) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as {
    tarefaId?: unknown;
    titulo?: unknown;
    descricao?: unknown;
    status?: unknown;
    responsavelId?: unknown;
    responsavelEmail?: unknown;
    paradaId?: unknown;
    paradaCodigo?: unknown;
  };

  const tarefaId = String(body.tarefaId ?? "").trim();
  if (!tarefaId) {
    return NextResponse.json({ error: "tarefaId e obrigatorio" }, { status: 400 });
  }

  const tarefa = await prisma.tarefa.findUnique({
    where: { id: tarefaId },
    select: { id: true, projetoId: true },
  });

  if (!tarefa || tarefa.projetoId !== projetoId) {
    return NextResponse.json({ error: "Tarefa nao encontrada" }, { status: 404 });
  }

  const data: {
    titulo?: string;
    descricao?: string | null;
    status?: string;
    responsavelId?: string | null;
    paradaId?: string | null;
  } = {};

  if (body.titulo !== undefined) {
    const titulo = String(body.titulo ?? "").trim();
    if (!titulo) {
      return NextResponse.json({ error: "titulo nao pode ser vazio" }, { status: 400 });
    }
    data.titulo = titulo;
  }

  if (body.descricao !== undefined) {
    data.descricao = String(body.descricao ?? "").trim() || null;
  }

  if (body.status !== undefined) {
    data.status = String(body.status ?? "").trim() || "pendente";
  }

  if (body.paradaId !== undefined || body.paradaCodigo !== undefined) {
    const paradaIdRaw = String(body.paradaId ?? "").trim();
    const paradaCodigo = String(body.paradaCodigo ?? "").trim();

    if (!paradaIdRaw && !paradaCodigo) {
      data.paradaId = null;
    } else {
      const parada = await prisma.parada.findUnique({
        where: paradaIdRaw ? { id: paradaIdRaw } : { codigo: paradaCodigo },
        select: { id: true },
      });
      if (!parada) {
        return NextResponse.json({ error: "Parada nao encontrada" }, { status: 404 });
      }
      data.paradaId = parada.id;
    }
  }

  if (body.responsavelId !== undefined || body.responsavelEmail !== undefined) {
    const responsavelIdRaw = String(body.responsavelId ?? "").trim();
    const responsavelEmail = String(body.responsavelEmail ?? "").trim().toLowerCase();

    if (!responsavelIdRaw && !responsavelEmail) {
      data.responsavelId = null;
    } else {
      const usuario = await prisma.user.findUnique({
        where: responsavelIdRaw ? { id: responsavelIdRaw } : { email: responsavelEmail },
        select: { id: true },
      });
      if (!usuario) {
        return NextResponse.json({ error: "Responsavel nao encontrado" }, { status: 404 });
      }

      const responsavelValido = await isResponsavelValido(projetoId, usuario.id);
      if (!responsavelValido) {
        return NextResponse.json(
          { error: "Responsavel deve participar do projeto com papel editor ou participante" },
          { status: 400 },
        );
      }

      data.responsavelId = usuario.id;
    }
  }

  const atualizada = await prisma.tarefa.update({
    where: { id: tarefaId },
    data,
    include: {
      responsavel: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      parada: {
        select: {
          id: true,
          codigo: true,
          status: true,
          municipio: true,
          bairro: true,
        },
      },
    },
  });

  return NextResponse.json({ item: atualizada });
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

  if (!permissoes.podeEditarTarefas) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as { tarefaId?: unknown };
  const tarefaId = String(body.tarefaId ?? req.nextUrl.searchParams.get("tarefaId") ?? "").trim();

  if (!tarefaId) {
    return NextResponse.json({ error: "tarefaId e obrigatorio" }, { status: 400 });
  }

  const deleted = await prisma.tarefa.deleteMany({
    where: {
      id: tarefaId,
      projetoId,
    },
  });

  if (deleted.count === 0) {
    return NextResponse.json({ error: "Tarefa nao encontrada" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
