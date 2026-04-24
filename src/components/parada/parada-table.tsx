"use client";

import { useEffect, useMemo, useState } from "react";

type ParadaRow = {
  id: string;
  codigo: string;
  status: string | null;
  gestao: string | null;
  classe: string | null;
  municipio: string | null;
  bairro: string | null;
  logradouro: string | null;
  referencia: string | null;
  sentido: string | null;
  tipologiaAtual: string | null;
  quantidadeAbrigosTotens: number | null;
  novaTipologia: string | null;
  latitude: number | null;
  longitude: number | null;
  area: string | null;
};

type Props = {
  paradas: ParadaRow[];
};

function displayValue(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

export default function ParadaTable({ paradas }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedParada = useMemo(
    () => paradas.find((parada) => parada.id === selectedId) ?? null,
    [paradas, selectedId],
  );

  useEffect(() => {
    if (!selectedParada) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedId(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedParada]);

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Codigo</th>
              <th className="px-4 py-3 text-left font-semibold">Municipio</th>
              <th className="px-4 py-3 text-left font-semibold">Bairro</th>
              <th className="px-4 py-3 text-left font-semibold">Logradouro</th>
              <th className="px-4 py-3 text-left font-semibold">Quantidade</th>
              <th className="px-4 py-3 text-left font-semibold">Nova tipologia</th>
              <th className="px-4 py-3 text-left font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {paradas.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  Nenhuma parada encontrada para os filtros selecionados.
                </td>
              </tr>
            ) : (
              paradas.map((parada) => {
                const isSelected = parada.id === selectedId;

                return (
                  <tr
                    key={parada.id}
                    role="button"
                    tabIndex={0}
                    aria-selected={isSelected}
                    onClick={() => setSelectedId(parada.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedId(parada.id);
                      }
                    }}
                    className={`border-t border-gray-100 text-gray-700 cursor-pointer transition ${
                      isSelected ? "bg-blue-50" : "hover:bg-gray-50"
                    }`}
                  >
                    <td className="px-4 py-3">{parada.codigo}</td>
                    <td className="px-4 py-3">{displayValue(parada.municipio)}</td>
                    <td className="px-4 py-3">{displayValue(parada.bairro)}</td>
                    <td className="px-4 py-3">{displayValue(parada.logradouro)}</td>
                    <td className="px-4 py-3">{displayValue(parada.quantidadeAbrigosTotens)}</td>
                    <td className="px-4 py-3">{displayValue(parada.novaTipologia)}</td>
                    <td className="px-4 py-3">{displayValue(parada.status)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div
        className={`fixed inset-0 z-40 transition ${
          selectedParada ? "pointer-events-auto" : "pointer-events-none"
        }`}
        aria-hidden={!selectedParada}
      >
        <button
          type="button"
          onClick={() => setSelectedId(null)}
          className={`absolute inset-0 bg-black/35 transition-opacity ${
            selectedParada ? "opacity-100" : "opacity-0"
          }`}
          aria-label="Fechar detalhes da parada"
        />

        <aside
          role="dialog"
          aria-modal="true"
          aria-label="Detalhes da parada"
          className={`absolute right-0 top-0 h-full w-full max-w-xl bg-white shadow-2xl transition-transform duration-300 ${
            selectedParada ? "translate-x-0" : "translate-x-full"
          }`}
        >
          {selectedParada ? (
            <div className="h-full overflow-y-auto p-5 md:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    Detalhes da parada {selectedParada.codigo}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Clique em outra linha para trocar a parada exibida.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  className="h-9 px-3 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Fechar
                </button>
              </div>

              <dl className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-gray-500">Codigo</dt>
                  <dd className="text-gray-800 font-medium">{displayValue(selectedParada.codigo)}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Status</dt>
                  <dd className="text-gray-800 font-medium">{displayValue(selectedParada.status)}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Gestao</dt>
                  <dd className="text-gray-800 font-medium">{displayValue(selectedParada.gestao)}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Classe</dt>
                  <dd className="text-gray-800 font-medium">{displayValue(selectedParada.classe)}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Municipio</dt>
                  <dd className="text-gray-800 font-medium">{displayValue(selectedParada.municipio)}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Bairro</dt>
                  <dd className="text-gray-800 font-medium">{displayValue(selectedParada.bairro)}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Logradouro</dt>
                  <dd className="text-gray-800 font-medium">{displayValue(selectedParada.logradouro)}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Referencia</dt>
                  <dd className="text-gray-800 font-medium">{displayValue(selectedParada.referencia)}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Sentido</dt>
                  <dd className="text-gray-800 font-medium">{displayValue(selectedParada.sentido)}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Tipologia atual</dt>
                  <dd className="text-gray-800 font-medium">{displayValue(selectedParada.tipologiaAtual)}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Nova tipologia</dt>
                  <dd className="text-gray-800 font-medium">{displayValue(selectedParada.novaTipologia)}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Quantidade abrigos/totens</dt>
                  <dd className="text-gray-800 font-medium">
                    {displayValue(selectedParada.quantidadeAbrigosTotens)}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">Latitude</dt>
                  <dd className="text-gray-800 font-medium">{displayValue(selectedParada.latitude)}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Longitude</dt>
                  <dd className="text-gray-800 font-medium">{displayValue(selectedParada.longitude)}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Area</dt>
                  <dd className="text-gray-800 font-medium">{displayValue(selectedParada.area)}</dd>
                </div>
              </dl>
            </div>
          ) : null}
        </aside>
      </div>
    </>
  );
}