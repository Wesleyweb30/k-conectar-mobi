"use client";

import { signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

interface AdminNavProps {
  userName: string;
}

export default function AdminNav({ userName }: AdminNavProps) {
  const router = useRouter();

  async function handleSignOut() {
    await signOut({ fetchOptions: { onSuccess: () => router.push("/login") } });
  }

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <span className="font-bold text-gray-800 text-lg">K-Conectar Mobi</span>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{userName}</span>
          <button
            onClick={handleSignOut}
            className="text-sm text-red-600 hover:text-red-700 font-medium"
          >
            Sair
          </button>
        </div>
      </div>
    </header>
  );
}
