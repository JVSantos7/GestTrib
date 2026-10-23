import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { perfis, type Perfil } from "@/lib/permissoes";
import { auth } from "@/server/auth";

/**
 * Sessão do usuário que fez esta requisição (ou null, se não estiver logado).
 * O `cache` faz a consulta ao banco acontecer uma vez só por requisição,
 * mesmo que o cabeçalho, a página e a action perguntem.
 */
export const obterSessao = cache(async () => auth.api.getSession({ headers: await headers() }));

/** Aceita só caminhos internos ("/contribuintes"), nunca outro site ("//site.com", "https://..."). */
export function destinoSeguro(destino: unknown): string {
  if (typeof destino !== "string" || !destino.startsWith("/") || destino.startsWith("//") || destino.includes("\\")) {
    return "/";
  }
  return destino;
}

// ---------------------------------------------------------------------------
// Autorização: "o que este usuário pode fazer?"
// ---------------------------------------------------------------------------

/** Pedido de permissão, ex.: { contribuinte: ["editar"] }. */
export type Permissoes = Parameters<(typeof perfis)[Perfil]["authorize"]>[0];

export type UsuarioLogado = { id: string; nome: string; email: string; perfil: Perfil };

export class AcessoNegadoError extends Error {
  constructor(mensagem = "Seu perfil não permite fazer isso.") {
    super(mensagem);
    this.name = "AcessoNegadoError";
  }
}

export const usuarioAtual = cache(async (): Promise<UsuarioLogado | null> => {
  const sessao = await obterSessao();
  if (!sessao) return null;
  const perfil = sessao.user.role as Perfil;
  // Perfil desconhecido (ex.: apagado da configuração) vale como "sem acesso".
  if (!(perfil in perfis)) return null;
  return { id: sessao.user.id, nome: sessao.user.name, email: sessao.user.email, perfil };
});

function permite(usuario: UsuarioLogado, permissoes: Permissoes): boolean {
  return perfis[usuario.perfil].authorize(permissoes).success;
}

/** Para mostrar ou esconder botões. Não substitui a conferência na action. */
export async function pode(permissoes: Permissoes): Promise<boolean> {
  const usuario = await usuarioAtual();
  return usuario !== null && permite(usuario, permissoes);
}

/** Para páginas: sem login vai para o login; sem permissão, para a tela de acesso negado. */
export async function exigirPermissaoPagina(permissoes?: Permissoes): Promise<UsuarioLogado> {
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/login");
  if (permissoes && !permite(usuario, permissoes)) redirect("/acesso-negado");
  return usuario;
}

/**
 * Para Server Actions. Toda action é um endereço que qualquer um pode chamar direto,
 * sem passar pela tela; por isso cada uma confere login e permissão logo na primeira linha.
 */
export async function exigirPermissaoAcao(permissoes: Permissoes): Promise<UsuarioLogado> {
  const usuario = await usuarioAtual();
  if (!usuario) throw new AcessoNegadoError("Sua sessão expirou. Entre novamente.");
  if (!permite(usuario, permissoes)) throw new AcessoNegadoError();
  return usuario;
}
