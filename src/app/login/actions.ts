"use server";

import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { EstadoAcao } from "@/components/form/FormAcao";
import { CONTAS_DEMO } from "@/lib/demo";
import { criarLimitador } from "@/lib/limite-tentativas";
import { PERFIS, type Perfil } from "@/lib/permissoes";
import { novaContaSchema } from "@/lib/schemas/usuario";
import { auth } from "@/server/auth";
import { senhaDemo } from "@/server/demo";
import { CadastroFechadoError, criarContaPeloCadastro, EmailJaCadastradoError } from "@/server/services/usuarios";
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

/** O que a tela "Criar conta" recebe de volta: erros e o que foi digitado (menos as senhas). */
export type EstadoCriarConta = EstadoAcao & { valores?: { nome: string; email: string } };

// No máximo 5 contas por minuto vindas do mesmo IP (contra robôs criando contas em série).
const limiteCadastro = criarLimitador({ maximo: 5, janelaMs: 60_000 });

async function ipDaRequisicao(): Promise<string> {
  const cabecalhos = await headers();
  // Atrás de um proxy (ex.: na hospedagem), o IP do visitante vem no primeiro item da lista.
  return cabecalhos.get("x-forwarded-for")?.split(",")[0]?.trim() || cabecalhos.get("x-real-ip") || "desconhecido";
}

/**
 * Cria a conta do visitante e já entra com ela.
 *
 * Esta action é pública (quem chama ainda não tem conta), então não usa `exigirPermissaoAcao`,
 * como acontece com o login. A proteção fica no service: cadastro fechado no .env recusa tudo,
 * e o perfil é sempre o definido no servidor.
 */
export async function criarConta(_estado: EstadoCriarConta, formData: FormData): Promise<EstadoCriarConta> {
  const valores = { nome: String(formData.get("nome") ?? ""), email: String(formData.get("email") ?? "") };

  if (!limiteCadastro.permitir(await ipDaRequisicao())) {
    return { erro: "Muitas tentativas. Aguarde um minuto e tente de novo.", valores };
  }

  const resultado = novaContaSchema.safeParse(Object.fromEntries(formData));
  if (!resultado.success) {
    const erros: Record<string, string> = {};
    for (const issue of resultado.error.issues) erros[String(issue.path[0])] ??= issue.message;
    return { erro: "Corrija os campos destacados.", erros, valores };
  }

  try {
    await criarContaPeloCadastro(resultado.data);
  } catch (erro) {
    if (erro instanceof EmailJaCadastradoError) return { erro: erro.message, erros: { email: erro.message }, valores };
    if (erro instanceof CadastroFechadoError) return { erro: erro.message, valores };
    throw erro;
  }

  // Conta criada: entra com ela. O plugin nextCookies grava o cookie de sessão na resposta.
  await auth.api.signInEmail({ body: { email: resultado.data.email, password: resultado.data.senha }, headers: await headers() });
  redirect(destinoSeguro(formData.get("destino")));
}
