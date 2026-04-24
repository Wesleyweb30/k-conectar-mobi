"use client";

import { signOut } from "@/lib/auth-client";
import Image from "next/image";
import { useRouter } from "next/navigation";

interface UserNavProps {
  userName: string;
}

export default function UserNav({ userName }: UserNavProps) {
  const router = useRouter();

  async function handleSignOut() {
    await signOut({
      fetchOptions: {
        onSuccess: () => router.push("/login"),
      },
    });
  }

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        <Image src="/kallas-logo-color.png" alt="K-Conectar Mobi" width={160} height={52} className="object-contain" priority />
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