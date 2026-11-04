import Link from "next/link";
import { SituacaoGuia } from "@/components/guias/SituacaoGuia";
import { dataParaIso, formatarDataIso } from "@/lib/datas";
import { formatarReais } from "@/lib/decimal";
import { formatarNumeroGuia, rotuloParcela, situacaoExibida } from "@/lib/guias";
import { formatarInscricao } from "@/lib/schemas/imovel";
import { ROTULOS_SITUACAO_FISCAL, type SituacaoFiscal as Situacao } from "@/lib/situacao-fiscal";
import type { ConsultaSituacaoFiscal } from "@/server/services/situacao-fiscal";

const CORES: Record<Situacao, string> = {
  REGULAR: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  A_VENCER: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  IRREGULAR: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
};

const CLASSE_LINK = "text-emerald-700 hover:underline dark:text-emerald-400";

function Total({ rotulo, valor, quantidade, destaque = false }: { rotulo: string; valor: string; quantidade: number; destaque?: boolean }) {
  return (
    <div className="rounded-md border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <dt className="text-xs uppercase tracking-wide text-zinc-500">{rotulo}</dt>
      <dd className={`mt-1 text-lg font-semibold tabular-nums ${destaque ? "text-red-700 dark:text-red-400" : ""}`}>
        {formatarReais(valor)}
      </dd>
      <dd className="text-xs text-zinc-500">
        {quantidade} {quantidade === 1 ? "item" : "itens"}
      </dd>
    </div>
  );
}

/** Seção "Situação fiscal" da página do contribuinte. Só exibe; os dados vêm do service. */
export function SituacaoFiscal({ consulta }: { consulta: ConsultaSituacaoFiscal }) {
  const { hoje, resumo, guias, lancamentosAEmitir } = consulta;

  return (
    <section className="mt-8" aria-labelledby="titulo-situacao">
      <div className="flex flex-wrap items-center gap-3">
        <h2 id="titulo-situacao" className="text-lg font-semibold">
          Situação fiscal
        </h2>
        <span className={`rounded-full px-2.5 py-0.5 text-sm font-medium ${CORES[resumo.situacao]}`}>
          {ROTULOS_SITUACAO_FISCAL[resumo.situacao]}
        </span>
      </div>

      {resumo.situacao === "REGULAR" ? (
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">Nenhum débito em aberto em {formatarDataIso(hoje)}.</p>
      ) : (
        <>
          <dl className="mt-3 grid gap-3 sm:grid-cols-3">
            <Total rotulo="Vencido" valor={resumo.vencido} quantidade={resumo.quantidadeVencidas} destaque={resumo.quantidadeVencidas > 0} />
            <Total rotulo="A vencer" valor={resumo.aVencer} quantidade={resumo.quantidadeAVencer} />
            <Total rotulo="Guia a emitir" valor={resumo.aEmitir} quantidade={resumo.quantidadeAEmitir} />
          </dl>

          {guias.length > 0 && (
            <div className="mt-4 overflow-x-auto rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">Guias em aberto</caption>
                <thead className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-medium">Guia</th>
                    <th scope="col" className="px-4 py-3 font-medium">IPTU</th>
                    <th scope="col" className="px-4 py-3 font-medium">Parcela</th>
                    <th scope="col" className="px-4 py-3 font-medium">Vencimento</th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">Valor</th>
                    <th scope="col" className="px-4 py-3 font-medium">Situação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                  {guias.map((guia) => {
                    const vencimento = dataParaIso(guia.vencimento);
                    return (
                      <tr key={guia.id}>
                        <td className="px-4 py-3 font-medium tabular-nums">
                          <Link href={`/guias/${guia.id}`} className={CLASSE_LINK}>
                            {formatarNumeroGuia(guia.numero)}
                          </Link>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                          {guia.lancamento.exercicio} · {formatarInscricao(guia.lancamento.inscricao)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">{rotuloParcela(guia.parcela, guia.totalParcelas)}</td>
                        <td className="px-4 py-3 tabular-nums">{formatarDataIso(vencimento)}</td>
                        <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums">{formatarReais(guia.valor)}</td>
                        <td className="px-4 py-3">
                          <SituacaoGuia situacao={situacaoExibida("ABERTA", vencimento, hoje)} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {lancamentosAEmitir.length > 0 && (
            <ul className="mt-4 divide-y divide-zinc-100 rounded-md border border-zinc-200 bg-white dark:divide-zinc-900 dark:border-zinc-800 dark:bg-zinc-950">
              {lancamentosAEmitir.map((lancamento) => (
                <li key={lancamento.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                  <span className="tabular-nums">
                    IPTU {lancamento.exercicio} · {formatarInscricao(lancamento.inscricao)}
                    <span className="ml-2 text-zinc-500">sem guia emitida</span>
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="tabular-nums">{formatarReais(lancamento.valorImposto)}</span>
                    <Link href={`/iptu/${lancamento.id}`} className={CLASSE_LINK}>
                      Emitir guias
                    </Link>
                  </span>
                </li>
              ))}
            </ul>
          )}

          <p className="mt-3 text-xs text-zinc-500">
            Valores originais, sem juros, multa ou correção. Situação calculada em {formatarDataIso(hoje)}.
          </p>
        </>
      )}
    </section>
  );
}
