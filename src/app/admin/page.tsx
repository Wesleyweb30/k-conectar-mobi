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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Painel de Administração</h1>
        <p className="text-sm text-gray-500 mt-1">
          Bem-vindo, {session?.user.name}. Gerencie os usuários da plataforma.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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
