"use client";

import { useMemo, useState } from "react";

interface User {
  id: string;
  name: string;
  email: string;
  role?: string;
  banned?: boolean | null;
  createdAt: Date | string;
}

interface UserTableProps {
  users: User[];
}

export default function UserTable({ users }: UserTableProps) {
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "user">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "banned">("all");
  const [sortBy, setSortBy] = useState<"name-asc" | "name-desc" | "date-desc" | "date-asc">(
    "name-asc",
  );

  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const base = users.filter((user) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        user.name.toLowerCase().includes(normalizedQuery) ||
        user.email.toLowerCase().includes(normalizedQuery);

      const isAdmin = user.role === "admin";
      const matchesRole =
        roleFilter === "all" || (roleFilter === "admin" ? isAdmin : !isAdmin);

      const isBanned = Boolean(user.banned);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" ? !isBanned : isBanned);

      return matchesQuery && matchesRole && matchesStatus;
    });

    const sorted = [...base].sort((a, b) => {
      if (sortBy === "name-asc") return a.name.localeCompare(b.name, "pt-BR");
      if (sortBy === "name-desc") return b.name.localeCompare(a.name, "pt-BR");

      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      if (sortBy === "date-asc") return dateA - dateB;
      return dateB - dateA;
    });

    return sorted;
  }, [users, query, roleFilter, statusFilter, sortBy]);

  function formatDate(value: Date | string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);
  }

  function exportUsersCsv() {
    if (filteredUsers.length === 0 || typeof window === "undefined") return;

    const header = ["nome", "email", "perfil", "status", "criado em"];
    const rows = filteredUsers.map((user) => [
      user.name,
      user.email,
      user.role === "admin" ? "Admin" : "Usuário",
      user.banned ? "Banido" : "Ativo",
      formatDate(user.createdAt),
    ]);

    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\r\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "usuarios-filtrados.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-gray-800">Usuários cadastrados</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {filteredUsers.length} de {users.length} usuário(s)
            </p>
          </div>
          <button
            type="button"
            onClick={exportUsersCsv}
            disabled={filteredUsers.length === 0}
            className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Exportar CSV
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-4">
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nome ou e-mail"
            className="h-9 rounded-lg border border-slate-300 px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />

          <select
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value as "all" | "admin" | "user")}
            className="h-9 rounded-lg border border-slate-300 px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            <option value="all">Perfil: todos</option>
            <option value="admin">Apenas admins</option>
            <option value="user">Apenas usuários</option>
          </select>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as "all" | "active" | "banned")
            }
            className="h-9 rounded-lg border border-slate-300 px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            <option value="all">Status: todos</option>
            <option value="active">Somente ativos</option>
            <option value="banned">Somente banidos</option>
          </select>

          <select
            value={sortBy}
            onChange={(event) =>
              setSortBy(
                event.target.value as "name-asc" | "name-desc" | "date-desc" | "date-asc",
              )
            }
            className="h-9 rounded-lg border border-slate-300 px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            <option value="name-asc">Nome (A-Z)</option>
            <option value="name-desc">Nome (Z-A)</option>
            <option value="date-desc">Mais novos</option>
            <option value="date-asc">Mais antigos</option>
          </select>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
              <th className="px-6 py-3">Nome</th>
              <th className="px-6 py-3">E-mail</th>
              <th className="px-6 py-3">Perfil</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Criado em</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                  Nenhum usuário encontrado para os filtros selecionados.
                </td>
              </tr>
            )}
            {filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-3 font-medium text-gray-800">{user.name}</td>
                <td className="px-6 py-3 text-gray-500">{user.email}</td>
                <td className="px-6 py-3">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      user.role === "admin"
                        ? "bg-purple-100 text-purple-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {user.role === "admin" ? "Admin" : "Usuário"}
                  </span>
                </td>
                <td className="px-6 py-3">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      user.banned
                        ? "bg-red-100 text-red-600"
                        : "bg-green-100 text-green-600"
                    }`}
                  >
                    {user.banned ? "Banido" : "Ativo"}
                  </span>
                </td>
                <td className="px-6 py-3 text-gray-500">{formatDate(user.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
