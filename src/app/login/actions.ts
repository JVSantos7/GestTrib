"use server";

import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { CONTAS_DEMO } from "@/lib/demo";
import { PERFIS, type Perfil } from "@/lib/permissoes";
import { auth } from "@/server/auth";
import { senhaDemo } from "@/server/demo";
import { destinoSeguro } from "@/server/sessao";

/** Encerra a sessão: apaga o registro no banco e o cookie do navegador. */
export async function sair() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/login");
}

export type EstadoDemo = { erro?: string };

/**
 * Entra numa conta de demonstração. O navegador manda só o perfil escolhido;
 * a senha é lida do .env aqui no servidor e nunca vai para a página.
 */
export async function entrarDemonstracao(_estado: EstadoDemo, formData: FormData): Promise<EstadoDemo> {
  const senha = senhaDemo();
  // Toda action pode ser chamada direto, sem a tela: com o modo demo desligado, recusa.
  if (!senha) return { erro: "O acesso de demonstração não está disponível." };

  const perfil = formData.get("perfil");
  if (typeof perfil !== "string" || !PERFIS.includes(perfil as Perfil)) return { erro: "Perfil inválido." };

  try {
    // O plugin nextCookies (em src/server/auth.ts) grava o cookie de sessão na resposta.
    await auth.api.signInEmail({ body: { email: CONTAS_DEMO[perfil as Perfil].email, password: senha }, headers: await headers() });
  } catch (erro) {
    if (erro instanceof APIError) {
      return { erro: "Conta de demonstração não encontrada. Rode `npm run criar-demo` no servidor." };
    }
    throw erro;
  }
  // O redirect fica fora do try: no Next ele funciona lançando um erro especial.
  redirect(destinoSeguro(formData.get("destino")));
}
