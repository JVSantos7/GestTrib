import type { Metadata } from "next";
import Link from "next/link";
import { ROTULOS_PERFIL } from "@/lib/permissoes";
import { exigirPermissaoPagina } from "@/server/sessao";

export const metadata: Metadata = { title: "Acesso negado" };

export default async function AcessoNegado() {
  const usuario = await exigirPermissaoPagina();

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold tracking-tight">Acesso negado</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        O perfil <strong>{ROTULOS_PERFIL[usuario.perfil]}</strong> não tem permissão para acessar esta
        página. Se precisar desse acesso, fale com o administrador do sistema.
      </p>
      <Link href="/" className="mt-4 inline-block text-sm text-emerald-700 hover:underline dark:text-emerald-400">
        ← Voltar ao início
      </Link>
    </div>
  );
}
