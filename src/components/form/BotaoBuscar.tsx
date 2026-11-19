"use client";

import { useFormStatus } from "react-dom";

// Botão "Buscar" dos filtros de listagem. O `loading.tsx` só aparece ao abrir uma tela;
// numa nova busca a tela é a mesma e só os filtros mudam, então sem isto nada indicaria a espera.
// `useFormStatus` lê o estado do <Form> em volta (o do next/form também): pending = buscando.
export function BotaoBuscar() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="inline-flex items-center gap-2 rounded-md bg-zinc-800 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:cursor-wait disabled:opacity-80 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-white"
    >
      {pending && (
        // Círculo girando; aria-hidden porque o texto do botão já diz o que acontece.
        <span
          aria-hidden="true"
          className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent"
        />
      )}
      {pending ? "Buscando…" : "Buscar"}
    </button>
  );
}
