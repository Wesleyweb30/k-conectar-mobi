"use client";

import { useState } from "react";
import { createUserAction } from "@/app/admin/actions";

export default function CreateUserForm() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState("");

  function generatePassword(length = 12) {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
    let result = "";
    for (let i = 0; i < length; i += 1) {
      const idx = Math.floor(Math.random() * chars.length);
      result += chars[idx];
    }
    return result;
  }

  function applyGeneratedPassword() {
    const next = generatePassword();
    setGeneratedPassword(next);

    const input = document.getElementById("password") as HTMLInputElement | null;
    if (input) {
      input.value = next;
    }
  }

  async function copyGeneratedPassword() {
    if (!generatedPassword || typeof navigator === "undefined" || !navigator.clipboard) return;
    await navigator.clipboard.writeText(generatedPassword);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await createUserAction(formData);

    if (result?.error) {
      setError(result.error);
    } else {
      setSuccess(true);
      (e.target as HTMLFormElement).reset();
    }

    setLoading(false);
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <h2 className="font-semibold text-gray-800 mb-1">Cadastrar usuário</h2>
      <p className="text-xs text-gray-400 mb-5">Crie um novo acesso à plataforma.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-xs font-medium text-gray-600 mb-1">
            Nome completo
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-xs font-medium text-gray-600 mb-1">
            E-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-xs font-medium text-gray-600 mb-1">
            Senha
          </label>
          <div className="flex gap-2">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              minLength={8}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              {showPassword ? "Ocultar" : "Mostrar"}
            </button>
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={applyGeneratedPassword}
              className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
            >
              Gerar senha forte
            </button>
            <button
              type="button"
              onClick={copyGeneratedPassword}
              disabled={!generatedPassword}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Copiar senha
            </button>
          </div>
          {generatedPassword ? (
            <p className="mt-2 text-[11px] text-slate-500">Senha gerada: {generatedPassword}</p>
          ) : null}
        </div>

        <div>
          <label htmlFor="role" className="block text-xs font-medium text-gray-600 mb-1">
            Perfil
          </label>
          <select
            id="role"
            name="role"
            defaultValue="user"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="user">Usuário</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}
        {success && <p className="text-xs text-green-600">Usuário cadastrado com sucesso!</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-lg py-2 text-sm transition-colors"
        >
          {loading ? "Cadastrando..." : "Cadastrar"}
        </button>
      </form>
    </div>
  );
}
