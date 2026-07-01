"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type ResourcePlaceItem = {
  id: number;
  label: string;
};

type ResourcePlaceAutocompleteProps = {
  initialQuery?: string;
  initialSelectedId?: string;
  inputName?: string;
  queryName?: string;
  placeholder?: string;
  required?: boolean;
};

export default function ResourcePlaceAutocomplete({
  initialQuery = "",
  initialSelectedId = "",
  inputName = "resource_place_id",
  queryName = "localQ",
  placeholder = "Digite ao menos 2 caracteres para buscar local",
  required = false,
}: ResourcePlaceAutocompleteProps) {
  const [query, setQuery] = useState(initialQuery);
  const [selectedId, setSelectedId] = useState(initialSelectedId);
  const [selectedLabel, setSelectedLabel] = useState("");
  const [items, setItems] = useState<ResourcePlaceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const canSearch = query.trim().length >= 2;
  const selectedNumericId = useMemo(() => Number.parseInt(selectedId, 10), [selectedId]);

  useEffect(() => {
    if (Number.isInteger(selectedNumericId) && selectedNumericId > 0) {
      const inList = items.find((item) => item.id === selectedNumericId);
      if (inList) {
        setSelectedLabel(inList.label);
      }
    }
  }, [items, selectedNumericId]);

  useEffect(() => {
    function onDocumentClick(event: MouseEvent) {
      if (!wrapperRef.current) return;
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (!wrapperRef.current.contains(target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onDocumentClick);
    return () => document.removeEventListener("mousedown", onDocumentClick);
  }, []);

  useEffect(() => {
    let canceled = false;

    if (!canSearch) {
      setItems([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const timeout = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q: query.trim(), limit: "20" });
        const response = await fetch(`/api/produttivo/resource-places?${params.toString()}`, {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Falha ao buscar locais");
        }

        const data = (await response.json()) as { items?: ResourcePlaceItem[] };
        if (!canceled) {
          setItems(Array.isArray(data.items) ? data.items : []);
        }
      } catch {
        if (!canceled) {
          setItems([]);
          setError("Nao foi possivel buscar locais agora.");
        }
      } finally {
        if (!canceled) {
          setLoading(false);
        }
      }
    }, 300);

    return () => {
      canceled = true;
      window.clearTimeout(timeout);
    };
  }, [canSearch, query]);

  function onSelect(item: ResourcePlaceItem) {
    setSelectedId(String(item.id));
    setSelectedLabel(item.label);
    setQuery(item.label);
    setOpen(false);
    setError(null);
  }

  function onInputChange(value: string) {
    setQuery(value);
    setOpen(true);

    const lowerValue = value.trim().toLowerCase();
    const selectedMatches = selectedLabel.trim().toLowerCase() === lowerValue;

    if (!selectedMatches) {
      setSelectedId("");
    }
  }

  return (
    <div ref={wrapperRef} className="space-y-2">
      <input type="hidden" name={inputName} value={selectedId} />
      <input type="hidden" name={queryName} value={query} />

      <div className="relative">
        <input
          value={query}
          onChange={(event) => onInputChange(event.target.value)}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="h-11 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none ring-sky-200 focus:ring"
          aria-label="Pesquisar local"
          required={required}
        />

        {open ? (
          <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
            {!canSearch ? (
              <p className="px-2 py-2 text-xs text-slate-500">Digite pelo menos 2 caracteres para pesquisar.</p>
            ) : loading ? (
              <p className="px-2 py-2 text-xs text-slate-500">Buscando locais...</p>
            ) : error ? (
              <p className="px-2 py-2 text-xs text-rose-600">{error}</p>
            ) : items.length === 0 ? (
              <p className="px-2 py-2 text-xs text-slate-500">Nenhum local encontrado.</p>
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelect(item)}
                  className="block w-full rounded-lg px-2 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100"
                >
                  {item.label}
                </button>
              ))
            )}
          </div>
        ) : null}
      </div>

      {selectedId ? (
        <p className="text-xs text-emerald-700">Local selecionado: {selectedLabel || `ID ${selectedId}`}</p>
      ) : (
        <p className="text-xs text-slate-500">Selecione uma opcao da lista para definir o local.</p>
      )}
    </div>
  );
}
