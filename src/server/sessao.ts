import "server-only";
import { headers } from "next/headers";
import { cache } from "react";
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
