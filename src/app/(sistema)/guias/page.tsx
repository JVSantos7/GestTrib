import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { CLASSE_CAMPO } from "@/components/form/estilos";
import { SituacaoGuia } from "@/components/guias/SituacaoGuia";
import { dataParaIso, formatarDataIso, hojeIso } from "@/lib/datas";
import { formatarReais } from "@/lib/decimal";
import { mascararDocumento } from "@/lib/documento";
import { formatarNumeroGuia, rotuloParcela, situacaoExibida } from "@/lib/guias";
import { lerFiltrosGuias, ROTULOS_FILTRO_GUIA, SITUACOES_FILTRO_GUIA, urlGuias } from "@/lib/schemas/filtros-guias";
import { formatarInscricao } from "@/lib/schemas/imovel";
import { listarGuias } from "@/server/services/guias";
import { exigirPermissaoPagina } from "@/server/sessao";

export const metadata: Metadata = { title: "Guias" };

const CLASSE_PAGINA = "rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium dark:border-zinc-700";

export default async function Guias({ searchParams }: PageProps<"/guias">) {
  await exigirPermissaoPagina({ guia: ["ver"] });
  const filtros = lerFiltrosGuias(await searchParams);
  const { itens, paginacao, emAberto } = await listarGuias(filtros);
  const hoje = hojeIso();
  const filtrando = Boolean(filtros.busca || filtros.situacao || filtros.vencimentoDe || filtros.vencimentoAte);

  return (
    <div className="max-w-6xl">
      <h1 className="text-2xl font-semibold tracking-tight">Guias</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Guias de pagamento emitidas a partir dos lançamentos de IPTU.
      </p>

      <Form
        // A key recria os campos quando os filtros mudam por link (ex.: "Limpar").
        key={`${filtros.busca}|${filtros.situacao ?? ""}|${filtros.vencimentoDe ?? ""}|${filtros.vencimentoAte ?? ""}`}
        action="/guias"
        role="search"
        className="mt-6 flex flex-wrap items-end gap-3"
      >
        <div className="min-w-56 flex-1">
          <label htmlFor="busca" className="block text-sm font-medium">
            Buscar por nº da guia, inscrição ou contribuinte
          </label>
          <input id="busca" name="busca" type="search" defaultValue={filtros.busca} maxLength={100} className={CLASSE_CAMPO} />
        </div>
        <div>
          <label htmlFor="situacao" className="block text-sm font-medium">
            Situação
          </label>
          <select id="situacao" name="situacao" defaultValue={filtros.situacao ?? ""} className={CLASSE_CAMPO}>
            <option value="">Todas</option>
            {SITUACOES_FILTRO_GUIA.map((situacao) => (
              <option key={situacao} value={situacao}>
                {ROTULOS_FILTRO_GUIA[situacao]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="vencimentoDe" className="block text-sm font-medium">
            Vencimento de
          </label>
          <input id="vencimentoDe" name="vencimentoDe" type="date" defaultValue={filtros.vencimentoDe} className={CLASSE_CAMPO} />
        </div>
        <div>
          <label htmlFor="vencimentoAte" className="block text-sm font-medium">
            até
          </label>
          <input id="vencimentoAte" name="vencimentoAte" type="date" defaultValue={filtros.vencimentoAte} className={CLASSE_CAMPO} />
        </div>
        <button
          type="submit"
          className="rounded-md bg-zinc-800 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-white"
        >
          Buscar
        </button>
        {filtrando && (
          <Link
            href="/guias"
            className="rounded-md px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Limpar
          </Link>
        )}
      </Form>

      {itens.length === 0 ? (
        <p className="mt-6 rounded-md border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
          {filtrando ? "Nenhuma guia encontrada com esses filtros." : "Nenhuma guia emitida ainda. As guias são emitidas na página de cada lançamento de IPTU."}
        </p>
      ) : (
        <>
          {/* Ao filtrar pagas ou canceladas não há o que receber; a frase sairia "0 guias… R$ 0,00". */}
          {emAberto.quantidade > 0 && (
            <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">
              {emAberto.quantidade} {emAberto.quantidade === 1 ? "guia a receber" : "guias a receber"} nesta seleção
              (abertas e vencidas), somando{" "}
              <span className="font-semibold text-zinc-900 tabular-nums dark:text-zinc-100">{formatarReais(emAberto.valor)}</span>
            </p>
          )}
          <div className="mt-6 overflow-x-auto rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">Guia</th>
                  <th scope="col" className="px-4 py-3 font-medium">Contribuinte</th>
                  <th scope="col" className="px-4 py-3 font-medium">IPTU</th>
                  <th scope="col" className="px-4 py-3 font-medium">Parcela</th>
                  <th scope="col" className="px-4 py-3 font-medium">Vencimento</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Valor</th>
                  <th scope="col" className="px-4 py-3 font-medium">Situação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                {itens.map((guia) => {
                  const vencimento = dataParaIso(guia.vencimento);
                  return (
                    <tr key={guia.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900">
                      <td className="px-4 py-3 font-medium tabular-nums">
                        <Link href={`/guias/${guia.id}`} className="text-emerald-700 hover:underline dark:text-emerald-400">
                          {formatarNumeroGuia(guia.numero)}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        {guia.lancamento.contribuinte.nome}
                        {/* Mesma regra das outras listagens: CPF mascarado, CNPJ completo. */}
                        <span className="block text-xs text-zinc-500 tabular-nums">
                          {mascararDocumento(guia.lancamento.contribuinte.documento)}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                        {guia.lancamento.exercicio} · {formatarInscricao(guia.lancamento.inscricao)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">{rotuloParcela(guia.parcela, guia.totalParcelas)}</td>
                      <td className="px-4 py-3 tabular-nums">{formatarDataIso(vencimento)}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums">{formatarReais(guia.valor)}</td>
                      <td className="px-4 py-3">
                        <SituacaoGuia situacao={situacaoExibida(guia.situacao, vencimento, hoje)} />
                      </td>
                    </tr>
                  );
                })}
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
                  href={urlGuias({ ...filtros, pagina: paginacao.pagina - 1 })}
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
                  href={urlGuias({ ...filtros, pagina: paginacao.pagina + 1 })}
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
