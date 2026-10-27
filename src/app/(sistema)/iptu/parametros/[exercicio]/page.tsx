import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { setoresDoFormulario } from "@/app/(sistema)/iptu/parametros/formulario";
import { CLASSE_BOTAO_PRIMARIO } from "@/components/form/estilos";
import { Historico } from "@/components/Historico";
import { formatarDecimalBr } from "@/lib/decimal";
import { formatarDataHora } from "@/lib/formatacao";
import { buscarParametros, contarLancamentosVigentes, listarSetoresComImoveis } from "@/server/services/parametros-iptu";
import { exigirPermissaoPagina, pode } from "@/server/sessao";

export const metadata: Metadata = { title: "Parâmetros do IPTU" };

function Dado({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-zinc-500">{rotulo}</dt>
      <dd className="mt-1 text-sm tabular-nums">{children}</dd>
    </div>
  );
}

const CARTAO = "mt-3 grid gap-5 rounded-md border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950";

export default async function DetalhesParametros({ params }: PageProps<"/iptu/parametros/[exercicio]">) {
  await exigirPermissaoPagina({ parametroIptu: ["ver"] });
  const { exercicio } = await params;
  const [parametros, comImoveis, podeEditar] = await Promise.all([
    buscarParametros(Number(exercicio)),
    listarSetoresComImoveis(),
    pode({ parametroIptu: ["editar"] }),
  ]);
  if (!parametros) notFound();
  const vigentes = await contarLancamentosVigentes(parametros.exercicio);

  const setores = setoresDoFormulario(comImoveis, parametros);
  const valorDoSetor = new Map(parametros.valoresTerreno.map((v) => [v.setor, v.valor]));
  const real = (valor: { toFixed(casas: number): string }) => `R$ ${formatarDecimalBr(valor)}`;
  const percentual = (valor: { toFixed(casas: number): string }) => `${formatarDecimalBr(valor)}%`;

  return (
    <div className="max-w-3xl">
      <Link href="/iptu/parametros" className="text-sm text-emerald-700 hover:underline dark:text-emerald-400">
        ← Parâmetros do IPTU
      </Link>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Exercício {parametros.exercicio}</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Última alteração em {formatarDataHora(parametros.atualizadoEm)}
          </p>
        </div>
        {podeEditar && vigentes === 0 && (
          <Link href={`/iptu/parametros/${parametros.exercicio}/editar`} className={CLASSE_BOTAO_PRIMARIO}>
            Editar
          </Link>
        )}
      </div>

      {vigentes > 0 && (
        <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          Este exercício tem {vigentes} {vigentes === 1 ? "lançamento vigente" : "lançamentos vigentes"}, calculados com estes
          valores. Para não haver imposto do mesmo ano com regras diferentes, os parâmetros só podem ser alterados
          depois que os lançamentos forem cancelados.
        </p>
      )}

      <section className="mt-6">
        <h2 className="text-lg font-semibold">Alíquotas</h2>
        <dl className={`${CARTAO} grid-cols-2 sm:grid-cols-4`}>
          <Dado rotulo="Residencial">{percentual(parametros.aliquotaResidencial)}</Dado>
          <Dado rotulo="Comercial">{percentual(parametros.aliquotaComercial)}</Dado>
          <Dado rotulo="Industrial">{percentual(parametros.aliquotaIndustrial)}</Dado>
          <Dado rotulo="Terreno">{percentual(parametros.aliquotaTerreno)}</Dado>
        </dl>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-semibold">Valor do m² de construção</h2>
        <dl className={`${CARTAO} sm:grid-cols-3`}>
          <Dado rotulo="Residencial">{real(parametros.valorM2Residencial)}</Dado>
          <Dado rotulo="Comercial">{real(parametros.valorM2Comercial)}</Dado>
          <Dado rotulo="Industrial">{real(parametros.valorM2Industrial)}</Dado>
        </dl>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-semibold">Valor do m² de terreno por setor</h2>
        <ul className="mt-3 divide-y divide-zinc-100 rounded-md border border-zinc-200 bg-white dark:divide-zinc-900 dark:border-zinc-800 dark:bg-zinc-950">
          {setores.map(({ setor, bairros }) => {
            const valor = valorDoSetor.get(setor);
            return (
              <li key={setor} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3 text-sm">
                <span>
                  <span className="font-medium">Setor {setor}</span>
                  {bairros && <span className="text-zinc-600 dark:text-zinc-400"> · {bairros}</span>}
                </span>
                {valor ? (
                  <span className="tabular-nums">{real(valor)}</span>
                ) : (
                  // Setor que ganhou imóveis depois que o exercício foi salvo.
                  <span className="font-medium text-amber-700 dark:text-amber-400">Sem valor: o IPTU não pode ser calculado</span>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <Historico entidade="ParametroIptu" entidadeId={parametros.id} />
    </div>
  );
}
