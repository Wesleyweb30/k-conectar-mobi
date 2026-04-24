import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import UserTable from "@/components/admin/user-table";
import CreateUserForm from "@/components/admin/create-user-form";

export default async function AdminPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  const usersResponse = await auth.api.listUsers({
    headers: await headers(),
    query: { limit: 100 },
  });

  const users = usersResponse?.users ?? [];
  const adminCount = users.filter((user) => user.role === "admin").length;
  const activeCount = users.filter((user) => !user.banned).length;
  const bannedCount = users.filter((user) => Boolean(user.banned)).length;

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-[0_14px_32px_-24px_rgba(15,23,42,0.45)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-sky-700">
              Administração
            </span>
            <h1 className="mt-2 text-2xl font-bold text-slate-900">Painel de Administração</h1>
            <p className="mt-1 text-sm text-slate-600">
              Bem-vindo, {session?.user.name}. Gerencie os usuários da plataforma.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-right">
            <p className="text-xs uppercase tracking-wide text-slate-500">Usuários ativos</p>
            <p className="text-2xl font-semibold text-slate-900">{activeCount}</p>
            <p className="text-xs text-slate-500">de {users.length} cadastrados</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Total</p>
            <p className="mt-1 text-xl font-semibold text-slate-900">{users.length}</p>
          </div>
          <div className="rounded-xl border border-blue-200 bg-blue-50/60 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-blue-700">Administradores</p>
            <p className="mt-1 text-xl font-semibold text-blue-900">{adminCount}</p>
          </div>
          <div className="rounded-xl border border-rose-200 bg-rose-50/60 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-rose-700">Banidos</p>
            <p className="mt-1 text-xl font-semibold text-rose-900">{bannedCount}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <UserTable users={users} />
        </div>
        <div>
          <CreateUserForm />
        </div>
      </div>
    </div>
  );
}
