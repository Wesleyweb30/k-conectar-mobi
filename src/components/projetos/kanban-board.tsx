"use client";

import { useState } from "react";
import { atualizarStatusTarefaAction } from "@/app/projetos/actions";

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

type KanbanBoardProps = {
  tarefas: TarefaItem[];
  projetoId: string;
  podeEditarTarefas: boolean;
  tarefaEmEdicaoId: string;
  onTarefaClick: (tarefaId: string) => void;
};

export function KanbanBoard({
  tarefas,
  projetoId,
  podeEditarTarefas,
  tarefaEmEdicaoId,
  onTarefaClick,
}: KanbanBoardProps) {
  const formatDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Data invalida";
    return date.toLocaleDateString("pt-BR");
  };

  const [dragedItemId, setDragedItemId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, tarefaId: string) => {
    setDragedItemId(tarefaId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, columnStatus: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverColumn(columnStatus);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, novoStatus: string) => {
    e.preventDefault();
    setDragOverColumn(null);

    if (!dragedItemId || isUpdating) return;

    const tarefa = tarefas.find((t) => t.id === dragedItemId);
    if (!tarefa || tarefa.status === novoStatus) {
      setDragedItemId(null);
      return;
    }

    try {
      setIsUpdating(true);
      await atualizarStatusTarefaAction(projetoId, dragedItemId, novoStatus);
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      alert("Erro ao mover tarefa. Tente novamente.");
    } finally {
      setIsUpdating(false);
      setDragedItemId(null);
    }
  };

  const tarefasPendentes = tarefas.filter((t) => t.status === "pendente");
  const tarefasEmAndamento = tarefas.filter((t) => t.status === "em_andamento");
  const tarefasConcluidas = tarefas.filter((t) => t.status === "concluida");

  const columns = [
    { status: "pendente", label: "A Fazer", tarefas: tarefasPendentes, color: "orange" },
    { status: "em_andamento", label: "Em Andamento", tarefas: tarefasEmAndamento, color: "blue" },
    { status: "concluida", label: "Concluída", tarefas: tarefasConcluidas, color: "emerald" },
  ];

  const getColorClasses = (color: string) => {
    const colorMap: Record<string, { border: string; bg: string; text: string; bgLight: string; circle: string; textLight: string }> = {
      orange: {
        border: "border-orange-200",
        bg: "bg-orange-50",
        text: "text-orange-900",
        bgLight: "from-orange-50 to-white",
        circle: "bg-orange-400",
        textLight: "text-orange-700",
      },
      blue: {
        border: "border-blue-200",
        bg: "bg-blue-50",
        text: "text-blue-900",
        bgLight: "from-blue-50 to-white",
        circle: "bg-blue-400",
        textLight: "text-blue-700",
      },
      emerald: {
        border: "border-emerald-200",
        bg: "bg-emerald-50",
        text: "text-emerald-900",
        bgLight: "from-emerald-50 to-white",
        circle: "bg-emerald-400",
        textLight: "text-emerald-700",
      },
    };
    return colorMap[color];
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 auto-rows-max">
      {columns.map((column) => {
        const colorClasses = getColorClasses(column.color);
        const isOver = dragOverColumn === column.status;

        return (
          <div
            key={column.status}
            className={`rounded-2xl border-2 transition-all ${
              isOver
                ? `${colorClasses.border} ${colorClasses.bg} shadow-lg`
                : `${colorClasses.border} bg-gradient-to-b ${colorClasses.bgLight} shadow-md`
            }`}
            onDragOver={(e) => handleDragOver(e, column.status)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, column.status)}
          >
            <div className="p-4">
              <div className="mb-4">
                <h3 className={`text-base font-semibold ${colorClasses.text} flex items-center gap-2`}>
                  <span className={`inline-block w-3 h-3 rounded-full ${colorClasses.circle}`}></span>
                  {column.label}
                </h3>
                <p className={`text-xs ${colorClasses.textLight} mt-1`}>{column.tarefas.length} tarefa(s)</p>
              </div>

              <div className={`space-y-3 min-h-[300px] rounded-lg p-2 transition-colors ${isOver ? "bg-white/50" : ""}`}>
                {column.tarefas.length === 0 ? (
                  <div className="text-center py-12">
                    <p className={`text-xs ${colorClasses.textLight}`}>Nenhuma tarefa</p>
                  </div>
                ) : (
                  column.tarefas.map((tarefa) => (
                    <div
                      key={tarefa.id}
                      draggable={!isUpdating && tarefaEmEdicaoId !== tarefa.id}
                      onDragStart={(e) => handleDragStart(e, tarefa.id)}
                      onClick={() => onTarefaClick(tarefa.id)}
                      className={`rounded-lg border px-3 py-3 shadow-sm transition cursor-pointer hover:shadow-md ${
                        tarefaEmEdicaoId === tarefa.id ? "opacity-50" : "opacity-100"
                      } ${colorClasses.border} bg-white`}
                    >
                      <h4 className={`text-sm font-semibold ${column.status === "concluida" ? "line-through opacity-75 text-slate-900" : "text-slate-900"}`}>
                        {tarefa.titulo}
                      </h4>

                      <p className="mt-1 text-[11px] text-slate-500">Criada em: {formatDate(tarefa.criadoEm)}</p>

                      {tarefa.descricao && (
                        <p className={`mt-1 text-xs line-clamp-2 ${column.status === "concluida" ? "opacity-75" : "text-slate-600"}`}>
                          {tarefa.descricao}
                        </p>
                      )}

                      <div className="mt-2 space-y-1">
                        {tarefa.parada && (
                          <>
                            <p className="text-xs text-cyan-700 bg-cyan-50 rounded px-2 py-0.5">Parada: {tarefa.parada.codigo}</p>
                            <p className="text-xs text-teal-700 bg-teal-50 rounded px-2 py-0.5">Nova tipologia: {tarefa.parada.novaTipologia ?? "Nao informada"}</p>
                            <p className="text-xs text-sky-700 bg-sky-50 rounded px-2 py-0.5">Bairro: {tarefa.parada.bairro ?? "Nao informado"}</p>
                          </>
                        )}
                        {tarefa.responsavel && (
                          <p className="text-xs text-purple-700 bg-purple-50 rounded px-2 py-0.5">Resp: {tarefa.responsavel.name}</p>
                        )}
                      </div>
                      <p className="mt-3 text-[11px] text-slate-500">Clique para ver detalhes</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        );
      })}

      {tarefas.length === 0 && (
        <div className="col-span-1 lg:col-span-3 text-center py-12">
          <p className="text-sm text-slate-500">Nenhuma tarefa cadastrada.</p>
          <p className="text-xs text-slate-400 mt-1">Comece criando sua primeira tarefa acima</p>
        </div>
      )}
    </div>
  );
}
