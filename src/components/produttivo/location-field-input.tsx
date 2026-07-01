"use client";

import { useEffect, useState } from "react";

type Props = {
  name: string;
  defaultValue?: string;
  inputId?: string;
};

export default function LocationFieldInput({ name, defaultValue = "", inputId }: Props) {
  const [value, setValue] = useState(defaultValue);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue]);

  async function fillCurrentLocation() {
    if (!navigator.geolocation) {
      setError("Geolocalizacao nao suportada neste dispositivo.");
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude.toFixed(7);
        const lng = position.coords.longitude.toFixed(7);
        setValue(`${lat}; ${lng}`);
        setLoading(false);
      },
      () => {
        setError("Nao foi possivel obter sua localizacao.");
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <div className="space-y-2">
      <input
        id={inputId}
        name={name}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Ex.: -7.9819817; -34.8510817"
        className="h-11 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none ring-sky-200 focus:ring"
      />

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={fillCurrentLocation}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          {loading ? "Obtendo localizacao..." : "Usar localizacao atual"}
        </button>
        {error ? <p className="text-xs text-rose-600">{error}</p> : null}
      </div>
    </div>
  );
}
