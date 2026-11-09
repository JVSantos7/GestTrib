import Form from "next/form";
import Link from "next/link";
import type { ReactNode } from "react";
import { BotaoImprimir } from "@/components/BotaoImprimir";
import { formatarDataHora } from "@/lib/formatacao";
import { MUNICIPIO } from "@/lib/municipio";

// Peças comuns aos relatórios. A página do relatório é o próprio PDF: o que tem `print:hidden`
// (menu, filtros, botões) some na impressão, e o resto sai no papel.

export const CLASSE_TABELA = "w-full text-left text-sm";
export const CLASSE_TH = "px-4 py-3 font-medium";
export const CLASSE_TD = "px-4 py-2.5";

/** Voltar, imprimir/salvar PDF e baixar CSV. */
export function AcoesRelatorio({ csv }: { csv: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
      <Link href="/relatorios" className="text-sm text-emerald-700 hover:underline dark:text-emerald-400">
        ← Relatórios
      </Link>
      <div className="flex flex-wrap gap-2">
        <BotaoImprimir />
        {/* <a> comum, não <Link>: o endereço é um arquivo para baixar, não uma página para navegar. */}
        <a
          href={csv}
          download
          className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
        >
          Baixar CSV
        </a>
      </div>
    </div>
  );
}

/** Cabeçalho que identifica o relatório no papel: município, título, filtros, quando e por quem. */
export function CabecalhoRelatorio({
  titulo,
  filtros,
  emitidoPor,
}: {
  titulo: string;
  filtros: string;
  emitidoPor: string;
}) {
  return (
    <header className="mt-4 border-b border-zinc-200 pb-4 dark:border-zinc-800 print:mt-0">
      <p className="text-xs uppercase tracking-wide text-zinc-500">
        Município de {MUNICIPIO.nome}/{MUNICIPIO.uf} · Dados fictícios
      </p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">{titulo}</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{filtros}</p>
      <p className="mt-1 text-xs text-zinc-500">
        Emitido em {formatarDataHora(new Date())} por {emitidoPor}
      </p>
    </header>
  );
}

/** Formulário de filtros (some na impressão). Envia por GET: os filtros ficam na URL (dá para guardar o link). */
export function FiltrosRelatorio({ acao, children }: { acao: string; children: ReactNode }) {
  return (
    <Form action={acao} className="mt-4 flex flex-wrap items-end gap-3 print:hidden">
      {children}
      <button
        type="submit"
        className="rounded-md bg-zinc-800 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-white"
      >
        Gerar
      </button>
    </Form>
  );
}

export function SemDados({ children }: { children: ReactNode }) {
  return (
    <p className="mt-6 rounded-md border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
      {children}
    </p>
  );
}

export function QuadroTabela({ children }: { children: ReactNode }) {
  return (
    <div className="mt-6 overflow-x-auto rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 print:overflow-visible print:border-zinc-400">
      {children}
    </div>
  );
}
