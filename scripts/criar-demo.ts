// Cria (ou restaura) as contas de demonstração, uma por perfil: `npm run criar-demo`.
// Usa a senha DEMO_SENHA do .env. Pode rodar quantas vezes quiser: conta que já existe
// volta ao estado original (perfil certo, ativa e com a senha do .env).
import "dotenv/config";
import { CONTAS_DEMO } from "@/lib/demo";
import { PERFIS } from "@/lib/permissoes";
import { auth } from "@/server/auth";
import { prisma } from "@/server/db";
import { senhaDemo } from "@/server/demo";

async function main() {
  const senha = senhaDemo();
  if (!senha) {
    console.error('✗ Defina DEMO_HABILITADA="true" e DEMO_SENHA (10 caracteres ou mais) no .env.');
    process.exitCode = 1;
    return;
  }

  const contexto = await auth.$context;
  for (const perfil of PERFIS) {
    const { email, nome } = CONTAS_DEMO[perfil];
    const existente = await prisma.user.findUnique({ where: { email } });

    if (!existente) {
      await auth.api.createUser({ body: { name: nome, email, password: senha, role: perfil } });
      console.log(`✓ ${email} criado`);
      continue;
    }

    // Restaura direto no banco: as rotas de admin exigem um administrador logado,
    // e o hook de proteção (src/server/auth.ts) recusaria alterar uma conta demo.
    // A senha é gravada como hash, do mesmo jeito que a biblioteca faz.
    const hash = await contexto.password.hash(senha);
    await prisma.$transaction([
      prisma.user.update({
        where: { id: existente.id },
        data: { name: nome, role: perfil, banned: false, banReason: null, banExpires: null },
      }),
      prisma.account.updateMany({ where: { userId: existente.id, providerId: "credential" }, data: { password: hash } }),
    ]);
    console.log(`✓ ${email} restaurado`);
  }
}

main()
  .catch((erro) => {
    console.error("✗ Não foi possível criar as contas:", erro instanceof Error ? erro.message : erro);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
