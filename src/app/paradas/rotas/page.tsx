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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(20,184,166,0.12),_transparent_24%),radial-gradient(circle_at_top_right,_rgba(14,165,233,0.1),_transparent_26%),linear-gradient(180deg,_#f8fafc,_#eef6f7)]">
      {isAdmin ? (
        <AdminNav userName={session.user.name} />
      ) : (
        <UserNav userName={session.user.name} />
      )}

      <main className="mx-auto max-w-7xl px-4 py-8 md:py-10">
        <ParadaList searchParams={resolvedSearchParams} routeMode />
      </main>
    </div>
  );
}