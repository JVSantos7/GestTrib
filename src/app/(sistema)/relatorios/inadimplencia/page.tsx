import type { Metadata } from "next";
import Link from "next/link";
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
import { formatarDataIso } from "@/lib/datas";
import { formatarReais } from "@/lib/decimal";
import { mascararDocumento } from "@/lib/documento";
import { consultaUrl, lerFiltroExercicio } from "@/lib/schemas/filtros-relatorios";
import { listarExerciciosLancados, relatorioInadimplencia } from "@/server/services/relatorios";
import { exigirPermissaoPagina } from "@/server/sessao";

export const metadata: Metadata = { title: "Relatório de inadimplência" };

export default async function RelatorioInadimplencia({ searchParams }: PageProps<"/relatorios/inadimplencia">) {
  const usuario = await exigirPermissaoPagina({ relatorio: ["ver"] });
  const filtros = lerFiltroExercicio(await searchParams);
  const [{ hoje, devedores, quantidadeGuias, total }, exercicios] = await Promise.all([
    relatorioInadimplencia(filtros),
    listarExerciciosLancados(),
  ]);

  return (
    <div className="max-w-5xl">
      <AcoesRelatorio csv={`/relatorios/inadimplencia/csv${consultaUrl(filtros)}`} />

      <FiltrosRelatorio acao="/relatorios/inadimplencia">
        <div>
          <label htmlFor="exercicio" className="block text-sm font-medium">
            Exercício
          </label>
          <select id="exercicio" name="exercicio" defaultValue={filtros.exercicio ?? ""} className={CLASSE_CAMPO}>
            <option value="">Todos</option>
            {exercicios.map((exercicio) => (
              <option key={exercicio} value={exercicio}>
                {exercicio}
              </option>
            ))}
          </select>
        </div>
      </FiltrosRelatorio>

      <CabecalhoRelatorio
        titulo="Inadimplência do IPTU"
        filtros={`Guias vencidas e não pagas até ${formatarDataIso(hoje)} · ${
          filtros.exercicio ? `Exercício ${filtros.exercicio}` : "Todos os exercícios"
        } · Valores originais, sem juros nem multa.`}
        emitidoPor={usuario.nome}
      />

      {devedores.length === 0 ? (
        <SemDados>Nenhuma guia vencida. Ninguém em débito nesta seleção.</SemDados>
      ) : (
        <QuadroTabela>
          <table className={CLASSE_TABELA}>
            <thead className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800">
              <tr>
                <th scope="col" className={CLASSE_TH}>Contribuinte</th>
                <th scope="col" className={CLASSE_TH}>CPF/CNPJ</th>
                <th scope="col" className={`${CLASSE_TH} text-right`}>Guias vencidas</th>
                <th scope="col" className={CLASSE_TH}>Vencida desde</th>
                <th scope="col" className={`${CLASSE_TH} text-right`}>Total vencido</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
              {devedores.map((devedor) => (
                <tr key={devedor.contribuinteId}>
                  <td className={CLASSE_TD}>
                    <Link
                      href={`/contribuintes/${devedor.contribuinteId}`}
                      className="text-emerald-700 hover:underline dark:text-emerald-400 print:text-inherit"
                    >
                      {devedor.nome}
                    </Link>
                  </td>
                  <td className={`${CLASSE_TD} whitespace-nowrap tabular-nums`}>{mascararDocumento(devedor.documento)}</td>
                  <td className={`${CLASSE_TD} text-right tabular-nums`}>{devedor.quantidadeGuias}</td>
                  <td className={`${CLASSE_TD} tabular-nums`}>{formatarDataIso(devedor.vencimentoMaisAntigo)}</td>
                  <td className={`${CLASSE_TD} text-right whitespace-nowrap tabular-nums`}>{formatarReais(devedor.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-zinc-300 font-semibold dark:border-zinc-700">
              <tr>
                <th scope="row" className={CLASSE_TD} colSpan={2}>
                  Total ({devedores.length} {devedores.length === 1 ? "contribuinte" : "contribuintes"})
                </th>
                <td className={`${CLASSE_TD} text-right tabular-nums`}>{quantidadeGuias}</td>
                <td className={CLASSE_TD} />
                <td className={`${CLASSE_TD} text-right whitespace-nowrap tabular-nums`}>{formatarReais(total)}</td>
              </tr>
            </tfoot>
          </table>
        </QuadroTabela>
      )}
    </div>
  );
}
