import type { Metadata } from "next";
import { CLASSE_CAMPO } from "@/components/form/estilos";
import {
  AcoesRelatorio,
  CabecalhoRelatorio,
  CLASSE_TABELA,
  CLASSE_TD,
  CLASSE_TH,
  FiltrosRelatorio,
  QuadroTabela,
  SemDados,
} from "@/components/relatorios/EstruturaRelatorio";
import { formatarDataIso, hojeIso } from "@/lib/datas";
import { formatarReais } from "@/lib/decimal";
import { consultaUrl, lerFiltrosArrecadacao } from "@/lib/schemas/filtros-relatorios";
import { relatorioArrecadacao } from "@/server/services/relatorios";
import { exigirPermissaoPagina } from "@/server/sessao";

export const metadata: Metadata = { title: "Relatório de arrecadação" };

export default async function RelatorioArrecadacao({ searchParams }: PageProps<"/relatorios/arrecadacao">) {
  const usuario = await exigirPermissaoPagina({ relatorio: ["ver"] });
  const filtros = lerFiltrosArrecadacao(await searchParams, hojeIso());
  const { dias, quantidade, total } = await relatorioArrecadacao(filtros);

  return (
    <div className="max-w-3xl">
      <AcoesRelatorio csv={`/relatorios/arrecadacao/csv${consultaUrl(filtros)}`} />

      <FiltrosRelatorio acao="/relatorios/arrecadacao">
        <div>
          <label htmlFor="de" className="block text-sm font-medium">
            Pagamentos de
          </label>
          <input id="de" name="de" type="date" defaultValue={filtros.de} className={CLASSE_CAMPO} />
        </div>
        <div>
          <label htmlFor="ate" className="block text-sm font-medium">
            até
          </label>
          <input id="ate" name="ate" type="date" defaultValue={filtros.ate} className={CLASSE_CAMPO} />
        </div>
      </FiltrosRelatorio>

      <CabecalhoRelatorio
        titulo="Arrecadação do IPTU"
        filtros={`Pagamentos de ${formatarDataIso(filtros.de)} a ${formatarDataIso(filtros.ate)}, pela data do pagamento. Estornos não entram.`}
        emitidoPor={usuario.nome}
      />

      {dias.length === 0 ? (
        <SemDados>Nenhum pagamento neste período.</SemDados>
      ) : (
        <QuadroTabela>
          <table className={CLASSE_TABELA}>
            <thead className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800">
              <tr>
                <th scope="col" className={CLASSE_TH}>Data do pagamento</th>
                <th scope="col" className={`${CLASSE_TH} text-right`}>Pagamentos</th>
                <th scope="col" className={`${CLASSE_TH} text-right`}>Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
              {dias.map((dia) => (
                <tr key={dia.data}>
                  <td className={`${CLASSE_TD} tabular-nums`}>{formatarDataIso(dia.data)}</td>
                  <td className={`${CLASSE_TD} text-right tabular-nums`}>{dia.quantidade}</td>
                  <td className={`${CLASSE_TD} text-right tabular-nums`}>{formatarReais(dia.valor)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-zinc-300 font-semibold dark:border-zinc-700">
              <tr>
                <th scope="row" className={CLASSE_TD}>Total</th>
                <td className={`${CLASSE_TD} text-right tabular-nums`}>{quantidade}</td>
                <td className={`${CLASSE_TD} text-right tabular-nums`}>{formatarReais(total)}</td>
              </tr>
            </tfoot>
          </table>
        </QuadroTabela>
      )}

      <p className="mt-4 text-xs text-zinc-500 print:hidden">
        Na tela, os pagamentos aparecem somados por dia. O CSV traz um pagamento por linha, com guia e contribuinte.
      </p>
    </div>
  );
}
