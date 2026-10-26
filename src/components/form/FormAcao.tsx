"use client";

import { useActionState, type ReactNode } from "react";
import { CLASSE_BOTAO_PRIMARIO } from "@/components/form/estilos";

/** O que uma action devolve para o formulário quando não redireciona. */
export type EstadoAcao = { erro?: string; sucesso?: string; erros?: Record<string, string> };

type Props = {
  acao: (estado: EstadoAcao, formData: FormData) => Promise<EstadoAcao>;
  rotulo: string;
  rotuloPendente?: string;
  /** Pergunta de confirmação antes de enviar (ações difíceis de desfazer). */
  confirmacao?: string;
  perigo?: boolean;
  className?: string;
  /** Campos do formulário; recebe o estado para mostrar os erros de cada campo. */
  children?: (estado: EstadoAcao) => ReactNode;
};

/** Formulário pequeno ligado a uma Server Action, com mensagem de erro/sucesso e botão "enviando". */
export function FormAcao({ acao, rotulo, rotuloPendente, confirmacao, perigo, className, children }: Props) {
  const [estado, enviar, pendente] = useActionState(acao, {});

  return (
    <form
      action={enviar}
      noValidate
      className={className ?? "space-y-4"}
      onSubmit={(evento) => {
        if (confirmacao && !window.confirm(confirmacao)) evento.preventDefault();
      }}
    >
      {estado.erro && (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
        >
          {estado.erro}
        </p>
      )}
      {estado.sucesso && (
        <p
          role="status"
          className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
        >
          {estado.sucesso}
        </p>
      )}
      {children?.(estado)}
      <button
        type="submit"
        disabled={pendente}
        className={
          perigo
            ? "rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
            : CLASSE_BOTAO_PRIMARIO
        }
      >
        {pendente ? (rotuloPendente ?? "Salvando…") : rotulo}
      </button>
    </form>
  );
}
