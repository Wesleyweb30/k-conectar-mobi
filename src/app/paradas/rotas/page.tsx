import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import AdminNav from "@/components/admin/admin-nav";
import UserNav from "@/components/user/user-nav";
import ParadaList from "@/components/parada/parada-list";

type RotasPageProps = {
  searchParams?: Promise<{
    codigo?: string;
    status?: string;
    municipio?: string;
    bairro?: string;
    logradouro?: string;
    novaTipologia?: string;
    page?: string;
  }>;
};

export default async function RotasPage({ searchParams }: RotasPageProps) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/login");
  }

  const resolvedSearchParams = (await searchParams) ?? {};
  const isAdmin = session.user.role === "admin";

  return (
    <div className="min-h-screen bg-gray-50">
      {isAdmin ? (
        <AdminNav userName={session.user.name} />
      ) : (
        <UserNav userName={session.user.name} />
      )}

      <main className="mx-auto max-w-7xl px-4 py-8">
        <ParadaList searchParams={resolvedSearchParams} routeMode />
      </main>
    </div>
  );
}