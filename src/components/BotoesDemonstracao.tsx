"use client";

import { useActionState } from "react";
import { entrarDemonstracao } from "@/app/login/actions";

export type OpcaoDemonstracao = { perfil: string; rotulo: string; descricao: string };

/**
 * "Entrar como...": um botão por perfil. Cada botão envia o próprio perfil (name/value do botão).
 * As opções vêm prontas da página (servidor), para este componente de navegador não precisar
 * importar a configuração de permissões.
 */
export function BotoesDemonstracao({ destino, opcoes }: { destino: string; opcoes: OpcaoDemonstracao[] }) {
  const [estado, acao, pendente] = useActionState(entrarDemonstracao, {});

  return (
    <form action={acao} className="mt-3 space-y-2">
      <input type="hidden" name="destino" value={destino} />
      {estado.erro && (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {estado.erro}
        </p>
      )}
      {opcoes.map((opcao) => (
        <button
          key={opcao.perfil}
          type="submit"
          name="perfil"
          value={opcao.perfil}
          disabled={pendente}
          className="block w-full rounded-md border border-zinc-300 px-3 py-2 text-left hover:border-emerald-600 hover:bg-emerald-50 disabled:opacity-60 dark:border-zinc-700 dark:hover:border-emerald-500 dark:hover:bg-emerald-950"
        >
          <span className="block text-sm font-medium">Entrar como {opcao.rotulo}</span>
          <span className="block text-xs text-zinc-500 dark:text-zinc-400">{opcao.descricao}</span>
        </button>
      ))}
    </form>
  );
}
