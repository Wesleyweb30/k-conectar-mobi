import "dotenv/config";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const adminUser = {
    email: "admin@admin.com",
    name: "Super Admin",
    password: "admin123",
    role: "admin" as const,
};

export async function main() {
    const existingUser = await prisma.user.findUnique({
        where: { email: adminUser.email },
    });

    if (existingUser) {
        await prisma.user.update({
            where: { email: adminUser.email },
            data: { role: adminUser.role },
        });

        console.log(`✓ Usuário ${adminUser.email} já existia e foi promovido para admin`);
        return;
    }

    await auth.api.signUpEmail({
        body: {
            email: adminUser.email,
            name: adminUser.name,
            password: adminUser.password,
        },
    });

    await prisma.user.update({
        where: { email: adminUser.email },
        data: { role: adminUser.role },
    });

    console.log(`✓ Admin criado com sucesso`);
    console.log(`  E-mail: ${adminUser.email}`);
    console.log(`  Senha: ${adminUser.password}`);
}

main()
    .catch((error) => {
        console.error("✗ Erro ao criar o admin:", error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });