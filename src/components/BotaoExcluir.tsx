"use client";

import { useActionState } from "react";

/** Resposta da action de exclusão quando ela não redireciona (ex.: exclusão bloqueada). */
export type EstadoExclusao = { erro?: string };

type Props = {
  acao: (estado: EstadoExclusao, formData: FormData) => Promise<EstadoExclusao>;
  /** Pergunta exibida na confirmação, ex.: 'Excluir o contribuinte "Maria"?'. */
  confirmacao: string;
};

export function BotaoExcluir({ acao, confirmacao }: Props) {
  const [estado, enviar, pendente] = useActionState(acao, {});

  return (
    <div className="flex flex-col items-end gap-2">
      <form
        action={enviar}
        onSubmit={(evento) => {
          if (!window.confirm(confirmacao)) evento.preventDefault();
        }}
      >
        <button
          type="submit"
          disabled={pendente}
          className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
        >
          {pendente ? "Excluindo…" : "Excluir"}
        </button>
      </form>
      {estado.erro && (
        <p
          role="alert"
          className="max-w-sm rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
        >
          {estado.erro}
        </p>
      )}
    </div>
  );
}
