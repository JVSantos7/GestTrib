import { ROTULOS_SITUACAO_GUIA, type SituacaoGuiaExibida } from "@/lib/guias";

const CORES: Record<SituacaoGuiaExibida, string> = {
  ABERTA: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  VENCIDA: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300",
  PAGA: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  CANCELADA: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
};

/** Etiqueta da situação de uma guia (já considerando se está vencida). */
export function SituacaoGuia({ situacao }: { situacao: SituacaoGuiaExibida }) {
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${CORES[situacao]}`}>{ROTULOS_SITUACAO_GUIA[situacao]}</span>;
}
