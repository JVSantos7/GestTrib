import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { formatarDocumento } from "@/lib/documento";
import { listarContribuintes } from "@/server/services/contribuintes";

export const metadata: Metadata = { title: "Contribuintes" };

export default async function Contribuintes() {
  // Sem isso a listagem seria gerada uma única vez, no build.
  await connection();
  const contribuintes = await listarContribuintes();

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

      {contribuintes.length === 0 ? (
        <p className="mt-6 rounded-md border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
          Nenhum contribuinte cadastrado.
        </p>
      ) : (
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
              {contribuintes.map((contribuinte) => (
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
      )}
    </div>
  );
}
