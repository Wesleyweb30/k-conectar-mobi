import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  return (
    <section className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-800">Painel do Usuário</h1>
        <p className="text-sm text-gray-600 mt-2">
          Bem-vindo, {session?.user.name}. Aqui é a área do usuário comum.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800">Seu perfil</h2>
          <p className="text-sm text-gray-600 mt-2">E-mail: {session?.user.email}</p>
          <p className="text-sm text-gray-600">Perfil: usuário</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800">Ações</h2>
          <p className="text-sm text-gray-600 mt-2">
            Novas funcionalidades para usuários comuns podem ser adicionadas aqui.
          </p>
        </div>
      </div>
    </section>
  );
}