import type { Metadata } from "next";
import Link from "next/link";
import { CLASSE_BOTAO_PRIMARIO } from "@/components/form/estilos";
import { formatarDecimalBr } from "@/lib/decimal";
import { formatarDataHora } from "@/lib/formatacao";
import { listarParametros } from "@/server/services/parametros-iptu";
import { exigirPermissaoPagina, pode } from "@/server/sessao";

export const metadata: Metadata = { title: "Parâmetros do IPTU" };

const percentual = (valor: { toFixed(casas: number): string }) => `${formatarDecimalBr(valor)}%`;

export default async function ParametrosIptu() {
  await exigirPermissaoPagina({ parametroIptu: ["ver"] });
  const [exercicios, podeEditar] = await Promise.all([listarParametros(), pode({ parametroIptu: ["editar"] })]);

  return (
    <div className="max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Parâmetros do IPTU</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Alíquotas e valores do m² usados no cálculo de cada exercício.
          </p>
        </div>
        {podeEditar && (
          <Link href="/iptu/parametros/novo" className={CLASSE_BOTAO_PRIMARIO}>
            Novo exercício
          </Link>
        )}
      </div>

      {exercicios.length === 0 ? (
        <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">Nenhum exercício cadastrado.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">Exercício</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Residencial</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Comercial</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Industrial</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Terreno</th>
                <th scope="col" className="px-4 py-3 font-medium">Última alteração</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 tabular-nums dark:divide-zinc-900">
              {exercicios.map((p) => (
                <tr key={p.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900">
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/iptu/parametros/${p.exercicio}`} className="text-emerald-700 hover:underline dark:text-emerald-400">
                      {p.exercicio}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right">{percentual(p.aliquotaResidencial)}</td>
                  <td className="px-4 py-3 text-right">{percentual(p.aliquotaComercial)}</td>
                  <td className="px-4 py-3 text-right">{percentual(p.aliquotaIndustrial)}</td>
                  <td className="px-4 py-3 text-right">{percentual(p.aliquotaTerreno)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatarDataHora(p.atualizadoEm)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
