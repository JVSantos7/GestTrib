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
import { formatarReais } from "@/lib/decimal";
import { formatarPercentual } from "@/lib/relatorios";
import { consultaUrl, lerFiltroExercicio } from "@/lib/schemas/filtros-relatorios";
import { ROTULOS_USO } from "@/lib/schemas/imovel";
import { listarExerciciosLancados, relatorioLancamentos } from "@/server/services/relatorios";
import { exigirPermissaoPagina } from "@/server/sessao";

export const metadata: Metadata = { title: "Relatório de lançamentos" };

export default async function RelatorioLancamentos({ searchParams }: PageProps<"/relatorios/lancamentos">) {
  const usuario = await exigirPermissaoPagina({ relatorio: ["ver"] });
  const exercicios = await listarExerciciosLancados();
  // Sem exercício na URL, mostra o mais recente que tem lançamentos.
  const exercicio = lerFiltroExercicio(await searchParams).exercicio ?? exercicios[0];

  if (exercicio === undefined) {
    return (
      <div className="max-w-5xl">
        <h1 className="text-2xl font-semibold tracking-tight">Lançamentos por exercício</h1>
        <SemDados>Nenhum IPTU lançado ainda. Os lançamentos são feitos na tela de IPTU.</SemDados>
      </div>
    );
  }

  const { linhas, total } = await relatorioLancamentos(exercicio);

  return (
    <div className="max-w-5xl">
      <AcoesRelatorio csv={`/relatorios/lancamentos/csv${consultaUrl({ exercicio })}`} />

      <FiltrosRelatorio acao="/relatorios/lancamentos">
        <div>
          <label htmlFor="exercicio" className="block text-sm font-medium">
            Exercício
          </label>
          <select id="exercicio" name="exercicio" defaultValue={exercicio} className={CLASSE_CAMPO}>
            {exercicios.map((opcao) => (
              <option key={opcao} value={opcao}>
                {opcao}
              </option>
            ))}
          </select>
        </div>
      </FiltrosRelatorio>

      <CabecalhoRelatorio
        titulo={`Lançamentos do IPTU ${exercicio}`}
        filtros="Lançamentos vigentes (os cancelados não entram). A receber inclui guias em aberto e IPTU ainda sem guia emitida."
        emitidoPor={usuario.nome}
      />

      {linhas.length === 0 ? (
        <SemDados>Nenhum lançamento vigente em {exercicio}.</SemDados>
      ) : (
        <QuadroTabela>
          <table className={CLASSE_TABELA}>
            <thead className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800">
              <tr>
                <th scope="col" className={CLASSE_TH}>Uso do imóvel</th>
                <th scope="col" className={`${CLASSE_TH} text-right`}>Lançamentos</th>
                <th scope="col" className={`${CLASSE_TH} text-right`}>Lançado</th>
                <th scope="col" className={`${CLASSE_TH} text-right`}>Arrecadado</th>
                <th scope="col" className={`${CLASSE_TH} text-right`}>A receber</th>
                <th scope="col" className={`${CLASSE_TH} text-right`}>% arrecadado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
              {linhas.map((linha) => (
                <tr key={linha.uso}>
                  <td className={CLASSE_TD}>{ROTULOS_USO[linha.uso]}</td>
                  <td className={`${CLASSE_TD} text-right tabular-nums`}>{linha.quantidade}</td>
                  <td className={`${CLASSE_TD} text-right whitespace-nowrap tabular-nums`}>{formatarReais(linha.lancado)}</td>
                  <td className={`${CLASSE_TD} text-right whitespace-nowrap tabular-nums`}>{formatarReais(linha.arrecadado)}</td>
                  <td className={`${CLASSE_TD} text-right whitespace-nowrap tabular-nums`}>{formatarReais(linha.aReceber)}</td>
                  <td className={`${CLASSE_TD} text-right tabular-nums`}>{formatarPercentual(linha.percentualArrecadado)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-zinc-300 font-semibold dark:border-zinc-700">
              <tr>
                <th scope="row" className={CLASSE_TD}>Total</th>
                <td className={`${CLASSE_TD} text-right tabular-nums`}>{total.quantidade}</td>
                <td className={`${CLASSE_TD} text-right whitespace-nowrap tabular-nums`}>{formatarReais(total.lancado)}</td>
                <td className={`${CLASSE_TD} text-right whitespace-nowrap tabular-nums`}>{formatarReais(total.arrecadado)}</td>
                <td className={`${CLASSE_TD} text-right whitespace-nowrap tabular-nums`}>{formatarReais(total.aReceber)}</td>
                <td className={`${CLASSE_TD} text-right tabular-nums`}>{formatarPercentual(total.percentualArrecadado)}</td>
              </tr>
            </tfoot>
          </table>
        </QuadroTabela>
      )}
    </div>
  );
}
