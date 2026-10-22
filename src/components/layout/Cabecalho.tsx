import Link from "next/link";
import { sair } from "@/app/login/actions";
import { MUNICIPIO } from "@/lib/municipio";
import { ROTULOS_PERFIL, type Perfil } from "@/lib/permissoes";
import { obterSessao } from "@/server/sessao";

export async function Cabecalho() {
  const sessao = await obterSessao();
  const perfil = sessao?.user.role as Perfil | undefined;

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-zinc-200 bg-white px-4 dark:border-zinc-800 dark:bg-zinc-950 md:px-6">
      <Link href="/" className="flex items-baseline gap-2">
        <span className="text-lg font-semibold tracking-tight text-emerald-700 dark:text-emerald-400">
          GestTrib
        </span>
        <span className="hidden text-sm text-zinc-500 lg:inline dark:text-zinc-400">
          Gestão Tributária · Município de {MUNICIPIO.nome}/{MUNICIPIO.uf}
        </span>
      </Link>

      <div className="flex items-center gap-3">
        <span className="hidden rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 sm:inline dark:bg-amber-950 dark:text-amber-300">
          Dados fictícios
        </span>
        {sessao ? (
          <>
            <span className="text-right text-sm leading-tight">
              <span className="block font-medium">{sessao.user.name}</span>
              {perfil && (
                <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                  {ROTULOS_PERFIL[perfil] ?? perfil}
                </span>
              )}
            </span>
            <form action={sair}>
              <button
                type="submit"
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
              >
                Sair
              </button>
            </form>
          </>
        ) : (
          <Link href="/login" className="text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400">
            Entrar
          </Link>
        )}
      </div>
    </header>
  );
}
