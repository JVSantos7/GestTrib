import Link from "next/link";

export function Cabecalho() {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-4 dark:border-zinc-800 dark:bg-zinc-950 md:px-6">
      <Link href="/" className="flex items-baseline gap-2">
        <span className="text-lg font-semibold tracking-tight text-emerald-700 dark:text-emerald-400">
          GestTrib
        </span>
        <span className="hidden text-sm text-zinc-500 sm:inline dark:text-zinc-400">
          Gestão Tributária Municipal
        </span>
      </Link>
      <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
        Dados fictícios
      </span>
    </header>
  );
}
