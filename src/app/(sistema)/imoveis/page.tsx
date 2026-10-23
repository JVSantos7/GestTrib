import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { CLASSE_BOTAO_PRIMARIO, CLASSE_CAMPO } from "@/components/form/estilos";
import { formatarDecimalBr } from "@/lib/decimal";
import { lerFiltrosImoveis, urlImoveis } from "@/lib/schemas/filtros-imoveis";
import { formatarInscricao, ROTULOS_USO, USOS_IMOVEL } from "@/lib/schemas/imovel";
import { listarImoveis } from "@/server/services/imoveis";
import { exigirPermissaoPagina, pode } from "@/server/sessao";

export const metadata: Metadata = { title: "Imóveis" };

const CLASSE_PAGINA =
  "rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium dark:border-zinc-700";

export default async function Imoveis({ searchParams }: PageProps<"/imoveis">) {
  await exigirPermissaoPagina({ imovel: ["ver"] });
  const podeCriar = await pode({ imovel: ["criar"] });
  const filtros = lerFiltrosImoveis(await searchParams);
  const { itens, paginacao } = await listarImoveis(filtros);
  const filtrando = Boolean(filtros.busca || filtros.uso);

  return (
    <div className="max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Imóveis</h1>
        {podeCriar && (
          <Link href="/imoveis/novo" className={CLASSE_BOTAO_PRIMARIO}>
            Novo imóvel
          </Link>
        )}
      </div>

      <Form
        // A key recria os campos quando os filtros mudam por link (ex.: "Limpar").
        key={`${filtros.busca}|${filtros.uso ?? ""}`}
        action="/imoveis"
        role="search"
        className="mt-6 flex flex-wrap items-end gap-3"
      >
        <div className="min-w-56 flex-1">
          <label htmlFor="busca" className="block text-sm font-medium">
            Buscar por inscrição, endereço ou proprietário
          </label>
          <input
            id="busca"
            name="busca"
            type="search"
            defaultValue={filtros.busca}
            maxLength={100}
            className={CLASSE_CAMPO}
          />
        </div>
        <div>
          <label htmlFor="uso" className="block text-sm font-medium">
            Tipo de uso
          </label>
          <select id="uso" name="uso" defaultValue={filtros.uso ?? ""} className={CLASSE_CAMPO}>
            <option value="">Todos</option>
            {USOS_IMOVEL.map((uso) => (
              <option key={uso} value={uso}>
                {ROTULOS_USO[uso]}
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
            href="/imoveis"
            className="rounded-md px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Limpar
          </Link>
        )}
      </Form>

      {itens.length === 0 ? (
        <p className="mt-6 rounded-md border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
          {filtrando ? "Nenhum imóvel encontrado com esses filtros." : "Nenhum imóvel cadastrado."}
        </p>
      ) : (
        <>
          <div className="mt-6 overflow-x-auto rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">Inscrição</th>
                  <th scope="col" className="px-4 py-3 font-medium">Endereço</th>
                  <th scope="col" className="px-4 py-3 font-medium">Uso</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Área constr. (m²)</th>
                  <th scope="col" className="px-4 py-3 font-medium">Proprietário</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                {itens.map((imovel) => (
                  <tr key={imovel.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900">
                    <td className="px-4 py-3 font-medium whitespace-nowrap tabular-nums">
                      <Link
                        href={`/imoveis/${imovel.id}`}
                        className="text-emerald-700 hover:underline dark:text-emerald-400"
                      >
                        {formatarInscricao(imovel.inscricao)}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {imovel.logradouro}, {imovel.numero}
                      <span className="text-zinc-500"> · {imovel.bairro}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{ROTULOS_USO[imovel.uso]}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {imovel.uso === "TERRENO" ? "—" : formatarDecimalBr(imovel.areaConstruida)}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/contribuintes/${imovel.contribuinte.id}`}
                        className="hover:underline"
                      >
                        {imovel.contribuinte.nome}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <nav
            aria-label="Paginação"
            className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm"
          >
            <p className="text-zinc-600 dark:text-zinc-400">
              Mostrando {paginacao.inicio}–{paginacao.fim} de {paginacao.total}
            </p>
            <div className="flex items-center gap-2">
              {paginacao.pagina > 1 ? (
                <Link
                  href={urlImoveis({ ...filtros, pagina: paginacao.pagina - 1 })}
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
                  href={urlImoveis({ ...filtros, pagina: paginacao.pagina + 1 })}
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
