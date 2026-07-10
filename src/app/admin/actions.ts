"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

export async function createUserAction(formData: FormData) {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });

  if (!session || session.user.role !== "admin") {
    return { error: "Acesso não autorizado." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const roleRaw = formData.get("role") as string;
  const allowedRoles = new Set(["admin", "gestor", "user"]);
  const role: "admin" | "gestor" | "user" = allowedRoles.has(roleRaw)
    ? (roleRaw as "admin" | "gestor" | "user")
    : "user";

  if (!name || !email || !password) {
    return { error: "Preencha todos os campos obrigatórios." };
  }

  if (password.length < 8) {
    return { error: "A senha deve ter no mínimo 8 caracteres." };
  }

  try {
    await auth.api.createUser({
      headers: requestHeaders,
      body: { name, email, password, role },
    });

    revalidatePath("/admin");
    return { success: true };
  } catch {
    return { error: "Erro ao cadastrar usuário. Verifique se o e-mail já existe." };
  }
}
