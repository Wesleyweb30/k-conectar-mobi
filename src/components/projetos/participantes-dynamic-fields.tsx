"use client";

import { useState } from "react";

type ParticipanteAdicionado = {
  id: string;
  email: string;
  papel: "visualizador" | "editor";
};

export default function ParticipantesDynamicFields() {
  const [email, setEmail] = useState("");
  const [papel, setPapel] = useState<"visualizador" | "editor">("editor");
  const [participantes, setParticipantes] = useState<ParticipanteAdicionado[]>([]);
  const [erro, setErro] = useState("");

  function adicionarParticipante() {
    const emailTrimmed = email.trim().toLowerCase();

    if (!emailTrimmed) {
      setErro("Informe o e-mail do participante.");
      return;
    }

    if (!emailTrimmed.includes("@")) {
      setErro("E-mail invalido.");
      return;
    }

    if (participantes.some((p) => p.email === emailTrimmed)) {
      setErro("Esse participante ja foi adicionado.");
      return;
    }

    setParticipantes((prev) => [
      ...prev,
      {
        id: `${emailTrimmed}-${Date.now()}`,
        email: emailTrimmed,
        papel,
      },
    ]);

    setEmail("");
    setPapel("editor");
    setErro("");
  }

  function removerParticipante(id: string) {
    setParticipantes((prev) => prev.filter((p) => p.id !== id));
  }

  function handleKeyPress(event: React.KeyboardEvent) {
    if (event.key === "Enter") {
      event.preventDefault();
      adicionarParticipante();
    }
  }

  function papelLabel(papel: string) {
    if (papel === "visualizador") return "Visualizador";
    if (papel === "editor") return "Editor";

    return papel;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-2 md:grid-cols-5">
        <input
          type="email"
          placeholder="E-mail do participante"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          onKeyPress={handleKeyPress}
          className="md:col-span-2 rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none ring-sky-200 focus:ring"
        />
        <select
          value={papel}
          onChange={(event) =>
            setPapel(event.target.value as "visualizador" | "editor")
          }
          className="md:col-span-2 rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none ring-sky-200 focus:ring"
        >
          <option value="visualizador">Visualizador</option>
          <option value="editor">Editor</option>
        </select>
        <button
          type="button"
          onClick={adicionarParticipante}
          className="rounded-xl bg-sky-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-sky-700"
        >
          Adicionar
        </button>
      </div>

      {erro ? (
        <p className="text-xs text-rose-600 font-semibold">{erro}</p>
      ) : null}

      {participantes.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Participantes adicionados ({participantes.length})
          </p>
          {participantes.map((participante) => (
            <div
              key={participante.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2"
            >
              <div className="flex items-center gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{participante.email}</p>
                  <p className="text-xs text-slate-500">{papelLabel(participante.papel)}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => removerParticipante(participante.id)}
                className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
              >
                Remover
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {participantes.map((participante) => (
        <input
          key={`email-${participante.id}`}
          type="hidden"
          name="participanteEmail"
          value={participante.email}
        />
      ))}
      {participantes.map((participante) => (
        <input
          key={`papel-${participante.id}`}
          type="hidden"
          name="participantePapel"
          value={participante.papel}
        />
      ))}
    </div>
  );
}
