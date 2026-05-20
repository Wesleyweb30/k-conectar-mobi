"use client";

import { KanbanBoard } from "./kanban-board";

type TarefaItem = {
  id: string;
  titulo: string;
  descricao: string | null;
  status: string;
  criadoEm: string;
  responsavel: {
    id: string;
    name: string;
    email: string;
  } | null;
  parada: {
    codigo: string;
    municipio: string | null;
    bairro: string | null;
    novaTipologia: string | null;
  } | null;
};

type KanbanWrapperProps = {
  tarefas: TarefaItem[];
  projetoId: string;
  podeEditarTarefas: boolean;
  tarefaEmEdicaoId: string;
  tarefaDetalheLink: string;
};

export function KanbanWrapper({
  tarefas,
  projetoId,
  podeEditarTarefas,
  tarefaEmEdicaoId,
  tarefaDetalheLink,
}: KanbanWrapperProps) {
  return (
    <KanbanBoard
      tarefas={tarefas}
      projetoId={projetoId}
      podeEditarTarefas={podeEditarTarefas}
      tarefaEmEdicaoId={tarefaEmEdicaoId}
      onTarefaClick={(tarefaId) => {
        window.location.href = tarefaDetalheLink.replace(":tarefaId", tarefaId);
      }}
    />
  );
}
