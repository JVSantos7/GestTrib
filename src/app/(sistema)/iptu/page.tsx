import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { lancarExercicioAcao } from "@/app/(sistema)/iptu/actions";
import { CLASSE_CAMPO } from "@/components/form/estilos";
import { FormLancarExercicio } from "@/components/iptu/FormulariosIptu";
import { SituacaoLancamento } from "@/components/iptu/SituacaoLancamento";
import { Prisma } from "@/generated/prisma/client";
import { formatarReais } from "@/lib/decimal";
import { mascararDocumento } from "@/lib/documento";
import { lerFiltrosLancamentos, ROTULOS_SITUACAO, SITUACOES_LANCAMENTO, urlLancamentos } from "@/lib/schemas/filtros-lancamentos";
import { formatarInscricao, ROTULOS_USO } from "@/lib/schemas/imovel";
import { listarLancamentos, resumirExercicio } from "@/server/services/lancamentos-iptu";
import { listarParametros } from "@/server/services/parametros-iptu";
import { exigirPermissaoPagina, pode } from "@/server/sessao";

export const metadata: Metadata = { title: "IPTU" };

const CLASSE_PAGINA = "rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium dark:border-zinc-700";

export default async function Lancamentos({ searchParams }: PageProps<"/iptu">) {
  await exigirPermissaoPagina({ iptu: ["ver"] });
  const filtros = lerFiltrosLancamentos(await searchParams);
  const [{ itens, paginacao, vigentes }, resumo, parametros, podeLancar, podeVerParametros] = await Promise.all([
    listarLancamentos(filtros),
    filtros.exercicio ? resumirExercicio(filtros.exercicio) : [],
    listarParametros(),
    pode({ iptu: ["lancar"] }),
    pode({ parametroIptu: ["ver"] }),
  ]);
  const exercicios = parametros.map((p) => p.exercicio);
  const filtrando = Boolean(filtros.busca || filtros.exercicio || filtros.situacao);

  return (
    <div className="max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">IPTU</h1>
        {podeVerParametros && (
          <Link
            href="/iptu/parametros"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
          >
            Parâmetros do cálculo
          </Link>
        )}
      </div>

      {podeLancar && (
        <section className="mt-6 rounded-md border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-base font-semibold">Lançar exercício</h2>
          {exercicios.length === 0 ? (
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Cadastre os parâmetros de um exercício antes de lançar o IPTU.
            </p>
          ) : (
            <>
              <p className="mt-1 mb-3 text-sm text-zinc-600 dark:text-zinc-400">
                Calcula o imposto de todos os imóveis ativos que ainda não têm lançamento vigente no ano. Quem já tem
                não é alterado.
              </p>
              <FormLancarExercicio acao={lancarExercicioAcao} exercicios={exercicios} />
            </>
          )}
        </section>
      )}

      <Form
        // A key recria os campos quando os filtros mudam por link (ex.: "Limpar").
        key={`${filtros.busca}|${filtros.exercicio ?? ""}|${filtros.situacao ?? ""}`}
        action="/iptu"
        role="search"
        className="mt-6 flex flex-wrap items-end gap-3"
      >
        <div className="min-w-56 flex-1">
          <label htmlFor="busca" className="block text-sm font-medium">
            Buscar por inscrição ou contribuinte
          </label>
          <input id="busca" name="busca" type="search" defaultValue={filtros.busca} maxLength={100} className={CLASSE_CAMPO} />
        </div>
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
        <div>
          <label htmlFor="situacao" className="block text-sm font-medium">
            Situação
          </label>
          <select id="situacao" name="situacao" defaultValue={filtros.situacao ?? ""} className={CLASSE_CAMPO}>
            <option value="">Todas</option>
            {SITUACOES_LANCAMENTO.map((situacao) => (
              <option key={situacao} value={situacao}>
                {ROTULOS_SITUACAO[situacao]}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="rounded-md bg-zinc-800 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-white"
        >
          Buscar
        </button>
        {filtrando && (
          <Link
            href="/iptu"
            className="rounded-md px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Limpar
          </Link>
        )}
      </Form>

      {resumo.length > 0 && (
        <section className="mt-6" aria-labelledby="titulo-resumo">
          <h2 id="titulo-resumo" className="text-base font-semibold">
            Resumo de {filtros.exercicio} <span className="font-normal text-zinc-500">(lançamentos vigentes)</span>
          </h2>
          <div className="mt-3 overflow-x-auto rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
            <table className="w-full text-left text-sm tabular-nums">
              <thead className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">Uso</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Imóveis</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Valor venal</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">IPTU</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                {resumo.map((grupo) => (
                  <tr key={grupo.uso}>
                    <td className="px-4 py-2.5">{ROTULOS_USO[grupo.uso]}</td>
                    <td className="px-4 py-2.5 text-right">{grupo.quantidade}</td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">{formatarReais(grupo.valorVenal)}</td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">{formatarReais(grupo.valorImposto)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-zinc-200 font-semibold dark:border-zinc-800">
                <tr>
                  <th scope="row" className="px-4 py-2.5 text-left">Total</th>
                  <td className="px-4 py-2.5 text-right">{resumo.reduce((total, g) => total + g.quantidade, 0)}</td>
                  <td className="px-4 py-2.5 text-right whitespace-nowrap">
                    {formatarReais(resumo.reduce((total, g) => total.plus(g.valorVenal), new Prisma.Decimal(0)))}
                  </td>
                  <td className="px-4 py-2.5 text-right whitespace-nowrap">
                    {formatarReais(resumo.reduce((total, g) => total.plus(g.valorImposto), new Prisma.Decimal(0)))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      )}

      {itens.length === 0 ? (
        <p className="mt-6 rounded-md border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
          {filtrando ? "Nenhum lançamento encontrado com esses filtros." : "Nenhum IPTU lançado ainda."}
        </p>
      ) : (
        <>
          <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">
            {vigentes.quantidade} {vigentes.quantidade === 1 ? "lançamento vigente" : "lançamentos vigentes"} nesta
            seleção, somando <span className="font-semibold text-zinc-900 tabular-nums dark:text-zinc-100">{formatarReais(vigentes.valor)}</span>
          </p>
          <div className="mt-3 overflow-x-auto rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">Exercício</th>
                  <th scope="col" className="px-4 py-3 font-medium">Inscrição</th>
                  <th scope="col" className="px-4 py-3 font-medium">Contribuinte</th>
                  <th scope="col" className="px-4 py-3 font-medium">Uso</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Valor venal</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">IPTU</th>
                  <th scope="col" className="px-4 py-3 font-medium">Situação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                {itens.map((lancamento) => (
                  <tr key={lancamento.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900">
                    <td className="px-4 py-3 tabular-nums">{lancamento.exercicio}</td>
                    <td className="px-4 py-3 font-medium whitespace-nowrap tabular-nums">
                      <Link href={`/iptu/${lancamento.id}`} className="text-emerald-700 hover:underline dark:text-emerald-400">
                        {formatarInscricao(lancamento.inscricao)}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {lancamento.contribuinte.nome}
                      {/* Mesma regra da listagem de contribuintes: CPF mascarado, CNPJ completo. */}
                      <span className="block text-xs text-zinc-500 tabular-nums">{mascararDocumento(lancamento.contribuinte.documento)}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{ROTULOS_USO[lancamento.uso]}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums">{formatarReais(lancamento.valorVenal)}</td>
                    <td className="px-4 py-3 text-right font-medium whitespace-nowrap tabular-nums">{formatarReais(lancamento.valorImposto)}</td>
                    <td className="px-4 py-3">
                      <SituacaoLancamento vigente={Boolean(lancamento.vigente)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <nav aria-label="Paginação" className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
            <p className="text-zinc-600 dark:text-zinc-400">
              Mostrando {paginacao.inicio}–{paginacao.fim} de {paginacao.total}
            </p>
            <div className="flex items-center gap-2">
              {paginacao.pagina > 1 ? (
                <Link
                  href={urlLancamentos({ ...filtros, pagina: paginacao.pagina - 1 })}
                  className={`${CLASSE_PAGINA} hover:bg-zinc-100 dark:hover:bg-zinc-900`}
                >
                  Anterior
                </Link>
              ) : (
                <span aria-disabled="true" className={`${CLASSE_PAGINA} cursor-not-allowed opacity-40`}>
                  Anterior
                </span>
              )}
              <span className="px-1 text-zinc-600 dark:text-zinc-400">
                Página {paginacao.pagina} de {paginacao.totalPaginas}
              </span>
              {paginacao.pagina < paginacao.totalPaginas ? (
                <Link
                  href={urlLancamentos({ ...filtros, pagina: paginacao.pagina + 1 })}
                  className={`${CLASSE_PAGINA} hover:bg-zinc-100 dark:hover:bg-zinc-900`}
                >
                  Próxima
                </Link>
              ) : (
                <span aria-disabled="true" className={`${CLASSE_PAGINA} cursor-not-allowed opacity-40`}>
                  Próxima
                </span>
              )}
            </div>
          </nav>
        </>
      )}
    </div>
  );
}
