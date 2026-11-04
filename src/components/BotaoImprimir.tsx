"use client";

import { CLASSE_BOTAO_SECUNDARIO } from "@/components/form/estilos";

/** Abre a impressão do navegador (que também permite salvar em PDF). */
export function BotaoImprimir() {
  return (
    <button type="button" onClick={() => window.print()} className={`${CLASSE_BOTAO_SECUNDARIO} border border-zinc-300 dark:border-zinc-700 print:hidden`}>
      Imprimir
    </button>
  );
}
