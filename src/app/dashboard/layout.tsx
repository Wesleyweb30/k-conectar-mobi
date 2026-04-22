import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import UserNav from "@/components/user/user-nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/login");
  }

  if (session.user.role === "admin") {
    redirect("/admin");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <UserNav userName={session.user.name} />
      <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}