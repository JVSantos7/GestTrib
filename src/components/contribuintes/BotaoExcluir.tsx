"use client";

import { useFormStatus } from "react-dom";

type Props = {
  acao: () => Promise<void>;
  nome: string;
};

function Botao() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
    >
      {pending ? "Excluindo…" : "Excluir"}
    </button>
  );
}

export function BotaoExcluir({ acao, nome }: Props) {
  return (
    <form
      action={acao}
      onSubmit={(evento) => {
        if (!window.confirm(`Excluir o contribuinte "${nome}"?`)) evento.preventDefault();
      }}
    >
      <Botao />
    </form>
  );
}
