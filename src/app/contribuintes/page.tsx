import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { formatarDocumento } from "@/lib/documento";
import { lerFiltrosContribuintes, urlContribuintes } from "@/lib/schemas/filtros-contribuintes";
import { listarContribuintes } from "@/server/services/contribuintes";

export const metadata: Metadata = { title: "Contribuintes" };

const CLASSE_CAMPO =
  "mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-xs outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 dark:border-zinc-700 dark:bg-zinc-900";
const CLASSE_PAGINA =
  "rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium dark:border-zinc-700";

export default async function Contribuintes({ searchParams }: PageProps<"/contribuintes">) {
  const filtros = lerFiltrosContribuintes(await searchParams);
  const { itens, paginacao } = await listarContribuintes(filtros);
  const filtrando = Boolean(filtros.busca || filtros.tipo);

  return (
    <div className="max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Contribuintes</h1>
        <Link
          href="/contribuintes/novo"
          className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
        >
          Novo contribuinte
        </Link>
      </div>

      <Form
        // A key recria os campos quando os filtros mudam por link (ex.: "Limpar").
        key={`${filtros.busca}|${filtros.tipo ?? ""}`}
        action="/contribuintes"
        role="search"
        className="mt-6 flex flex-wrap items-end gap-3"
      >
        <div className="min-w-56 flex-1">
          <label htmlFor="busca" className="block text-sm font-medium">
            Buscar por nome ou CPF/CNPJ
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
          <label htmlFor="tipo" className="block text-sm font-medium">
            Tipo de pessoa
          </label>
          <select id="tipo" name="tipo" defaultValue={filtros.tipo ?? ""} className={CLASSE_CAMPO}>
            <option value="">Todos</option>
            <option value="FISICA">Física</option>
            <option value="JURIDICA">Jurídica</option>
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
            href="/contribuintes"
            className="rounded-md px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Limpar
          </Link>
        )}
      </Form>

      {itens.length === 0 ? (
        <p className="mt-6 rounded-md border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
          {filtrando
            ? "Nenhum contribuinte encontrado com esses filtros."
            : "Nenhum contribuinte cadastrado."}
        </p>
      ) : (
        <>
          <div className="mt-6 overflow-x-auto rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">Nome / Razão social</th>
                  <th scope="col" className="px-4 py-3 font-medium">CPF / CNPJ</th>
                  <th scope="col" className="px-4 py-3 font-medium">Tipo</th>
                  <th scope="col" className="px-4 py-3 font-medium">Cidade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                {itens.map((contribuinte) => (
                  <tr key={contribuinte.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900">
                    <td className="px-4 py-3 font-medium">
                      <Link
                        href={`/contribuintes/${contribuinte.id}`}
                        className="text-emerald-700 hover:underline dark:text-emerald-400"
                      >
                        {contribuinte.nome}
                      </Link>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                      {formatarDocumento(contribuinte.documento)}
                    </td>
                    <td className="px-4 py-3">
                      {contribuinte.tipoPessoa === "FISICA" ? "Física" : "Jurídica"}
                    </td>
                    <td className="px-4 py-3">
                      {contribuinte.cidade}/{contribuinte.uf}
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
                  href={urlContribuintes({ ...filtros, pagina: paginacao.pagina - 1 })}
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
                  href={urlContribuintes({ ...filtros, pagina: paginacao.pagina + 1 })}
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
