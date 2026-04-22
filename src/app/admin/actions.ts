"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

export async function createUserAction(formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const roleRaw = formData.get("role") as string;
  const role: "admin" | "user" = roleRaw === "admin" ? "admin" : "user";

  if (!name || !email || !password) {
    return { error: "Preencha todos os campos obrigatórios." };
  }

  if (password.length < 8) {
    return { error: "A senha deve ter no mínimo 8 caracteres." };
  }

  try {
    await auth.api.createUser({
      headers: await headers(),
      body: { name, email, password, role },
    });

    revalidatePath("/admin");
    return { success: true };
  } catch {
    return { error: "Erro ao cadastrar usuário. Verifique se o e-mail já existe." };
  }
}
