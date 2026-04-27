import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import AdminNav from "@/components/admin/admin-nav";
import UserNav from "@/components/user/user-nav";
import ParadaList from "@/components/parada/parada-list";

type ParadasPageProps = {
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

export default async function ParadasPage({ searchParams }: ParadasPageProps) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/login");
  }

  const resolvedSearchParams = (await searchParams) ?? {};
  const isAdmin = session.user.role === "admin";

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(34,197,94,0.08),_transparent_24%),radial-gradient(circle_at_top_right,_rgba(6,182,212,0.12),_transparent_28%),linear-gradient(180deg,_#f8fafc,_#eef2f7)]">
      {isAdmin ? (
        <AdminNav userName={session.user.name} />
      ) : (
        <UserNav userName={session.user.name} />
      )}

      <main className={`${isAdmin ? "max-w-6xl" : "max-w-5xl"} mx-auto px-4 py-8 md:py-10`}>
        <ParadaList searchParams={resolvedSearchParams} />
      </main>
    </div>
  );
}