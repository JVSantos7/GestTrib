import "server-only";
import type { Perfil } from "@/lib/permissoes";

/**
 * Cadastro aberto: qualquer visitante cria a própria conta pela tela de login.
 *
 * Faz sentido na demonstração do portfólio; num sistema real de prefeitura, as contas
 * são criadas pelo administrador. Por isso fica desligado se a variável não for "true".
 */
export function cadastroAberto(): boolean {
  return process.env.CADASTRO_ABERTO === "true";
}

/**
 * Perfil de quem cria a própria conta. Operador usa o sistema de verdade (cadastra, lança,
 * emite e dá baixa), mas não gerencia usuários, não muda parâmetros do IPTU e não estorna.
 */
export const PERFIL_CADASTRO_ABERTO: Perfil = "operador";
