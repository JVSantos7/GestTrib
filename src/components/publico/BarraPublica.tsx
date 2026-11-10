import Link from "next/link";
import { MUNICIPIO } from "@/lib/municipio";

/**
 * Leva o `destino` (a página que o visitante tentou abrir antes do login) de uma tela pública
 * para a outra, para ele cair lá depois de entrar.
 */
export function comDestino(caminho: string, destino: string): string {
  return destino === "/" ? caminho : `${caminho}?destino=${encodeURIComponent(destino)}`;
}

type Props = {
  destino: string;
  /** Mostra o botão "Criar conta" (só com o cadastro aberto no .env). */
  cadastro: boolean;
};

/** Barra de navegação das telas públicas (apresentação, entrar e criar conta). */
export function BarraPublica({ destino, cadastro }: Props) {
  return (
    <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/90 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
      <nav aria-label="Principal" className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href={comDestino("/login", destino)} className="min-w-0 leading-tight">
          <span className="block text-lg font-semibold tracking-tight text-emerald-700 dark:text-emerald-400">GestTrib</span>
          <span className="block truncate text-xs text-zinc-500 sm:text-sm dark:text-zinc-400">
            Gestão Tributária · Município de {MUNICIPIO.nome}/{MUNICIPIO.uf}
          </span>
        </Link>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/validar-certidao"
            className="hidden rounded-md px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 md:inline-block dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            Validar certidão
          </Link>
          {cadastro && (
            <Link
              href={comDestino("/login/criar-conta", destino)}
              className="hidden rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium hover:bg-zinc-100 sm:inline-block dark:border-zinc-700 dark:hover:bg-zinc-900"
            >
              Criar conta
            </Link>
          )}
          <Link
            href={comDestino("/login/entrar", destino)}
            className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
          >
            Entrar
          </Link>
        </div>
      </nav>
    </header>
  );
}
