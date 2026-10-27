import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cancelarLancamentoAcao } from "@/app/(sistema)/iptu/actions";
import { Historico } from "@/components/Historico";
import { FormCancelarLancamento } from "@/components/iptu/FormulariosIptu";
import { SituacaoLancamento } from "@/components/iptu/SituacaoLancamento";
import { formatarDecimalBr, formatarReais } from "@/lib/decimal";
import { formatarDocumento } from "@/lib/documento";
import { formatarDataHora } from "@/lib/formatacao";
import { formatarInscricao, ROTULOS_USO } from "@/lib/schemas/imovel";
import { buscarLancamento } from "@/server/services/lancamentos-iptu";
import { exigirPermissaoPagina, pode } from "@/server/sessao";

export const metadata: Metadata = { title: "Lançamento de IPTU" };

/** Uma linha da conta: descrição à esquerda, valor à direita. */
function Linha({ rotulo, conta, valor, destaque }: { rotulo: string; conta?: string; valor: string; destaque?: boolean }) {
  return (
    <div className={`flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-5 py-3 ${destaque ? "bg-zinc-50 dark:bg-zinc-900" : ""}`}>
      <div>
        <p className={destaque ? "font-semibold" : "font-medium"}>{rotulo}</p>
        {conta && <p className="text-xs text-zinc-500 tabular-nums">{conta}</p>}
      </div>
      <p className={`tabular-nums ${destaque ? "text-lg font-semibold" : ""}`}>{valor}</p>
    </div>
  );
}

export default async function DetalhesLancamento({ params }: PageProps<"/iptu/[id]">) {
  await exigirPermissaoPagina({ iptu: ["ver"] });
  const { id } = await params;
  const [lancamento, podeCancelar] = await Promise.all([buscarLancamento(id), pode({ iptu: ["cancelar"] })]);
  if (!lancamento) notFound();

  const m2 = (valor: { toFixed(casas: number): string }) => `${formatarDecimalBr(valor)} m²`;
  const fracao =
    lancamento.unidadesNoLote > 1
      ? ` (${m2(lancamento.areaTerreno)} do lote ÷ ${lancamento.unidadesNoLote} unidades)`
      : "";
  const { imovel } = lancamento;

  return (
    <div className="max-w-3xl">
      <Link href="/iptu" className="text-sm text-emerald-700 hover:underline dark:text-emerald-400">
        ← IPTU
      </Link>

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight tabular-nums">
          IPTU {lancamento.exercicio} · {formatarInscricao(lancamento.inscricao)}
        </h1>
        <SituacaoLancamento vigente={Boolean(lancamento.vigente)} />
      </div>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Lançado em {formatarDataHora(lancamento.criadoEm)}</p>

      {lancamento.canceladoEm && (
        <p className="mt-4 rounded-md border border-zinc-300 bg-zinc-100 px-4 py-3 text-sm dark:border-zinc-700 dark:bg-zinc-900">
          Cancelado em {formatarDataHora(lancamento.canceladoEm)}. Motivo: {lancamento.motivoCancelamento}
          <span className="mt-1 block text-zinc-600 dark:text-zinc-400">
            Não é mais devido. O imóvel pode receber um novo lançamento de {lancamento.exercicio}.
          </span>
        </p>
      )}

      <dl className="mt-6 grid gap-5 rounded-md border border-zinc-200 bg-white p-5 sm:grid-cols-2 dark:border-zinc-800 dark:bg-zinc-950">
        <div>
          <dt className="text-xs uppercase tracking-wide text-zinc-500">Contribuinte (no lançamento)</dt>
          <dd className="mt-1 text-sm">
            <Link href={`/contribuintes/${lancamento.contribuinte.id}`} className="font-medium text-emerald-700 hover:underline dark:text-emerald-400">
              {lancamento.contribuinte.nome}
            </Link>
            <span className="block text-zinc-500 tabular-nums">{formatarDocumento(lancamento.contribuinte.documento)}</span>
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-zinc-500">Imóvel</dt>
          <dd className="mt-1 text-sm">
            {imovel.excluidoEm ? (
              <span>{formatarInscricao(lancamento.inscricao)} (excluído)</span>
            ) : (
              <Link href={`/imoveis/${imovel.id}`} className="font-medium text-emerald-700 hover:underline dark:text-emerald-400">
                {imovel.logradouro}, {imovel.numero}
                {imovel.complemento && ` · ${imovel.complemento}`}
              </Link>
            )}
            <span className="block text-zinc-500">
              {imovel.bairro} · {ROTULOS_USO[lancamento.uso]}
            </span>
          </dd>
        </div>
      </dl>

      <section className="mt-8" aria-labelledby="titulo-calculo">
        <h2 id="titulo-calculo" className="text-lg font-semibold">
          Memória de cálculo
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Valores do imóvel e dos parâmetros de {lancamento.exercicio} no momento do lançamento.
        </p>
        <div className="mt-3 divide-y divide-zinc-100 rounded-md border border-zinc-200 bg-white text-sm dark:divide-zinc-900 dark:border-zinc-800 dark:bg-zinc-950">
          <Linha
            rotulo="Valor venal do terreno"
            conta={`${m2(lancamento.areaTerrenoConsiderada)}${fracao} × ${formatarReais(lancamento.valorM2Terreno)}/m² do setor ${lancamento.inscricao.slice(0, 2)}`}
            valor={formatarReais(lancamento.valorVenalTerreno)}
          />
          <Linha
            rotulo="Valor venal da construção"
            conta={
              lancamento.uso === "TERRENO"
                ? "Terreno sem construção"
                : `${m2(lancamento.areaConstruida)} × ${formatarReais(lancamento.valorM2Construcao)}/m² (${ROTULOS_USO[lancamento.uso].toLowerCase()})`
            }
            valor={formatarReais(lancamento.valorVenalConstrucao)}
          />
          <Linha rotulo="Valor venal do imóvel" valor={formatarReais(lancamento.valorVenal)} />
          <Linha
            rotulo={`IPTU ${lancamento.exercicio}`}
            conta={`${formatarReais(lancamento.valorVenal)} × alíquota de ${formatarDecimalBr(lancamento.aliquota)}%`}
            valor={formatarReais(lancamento.valorImposto)}
            destaque
          />
        </div>
      </section>

      {lancamento.vigente && podeCancelar && (
        <section className="mt-8 rounded-md border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="mb-1 text-base font-semibold">Cancelar lançamento</h2>
          <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
            Use quando o lançamento foi feito com dados errados. Ele fica registrado como cancelado, com o motivo, e o
            imóvel pode ser lançado de novo.
          </p>
          <FormCancelarLancamento acao={cancelarLancamentoAcao.bind(null, lancamento.id)} />
        </section>
      )}

      <Historico entidade="LancamentoIptu" entidadeId={lancamento.id} />
    </div>
  );
}
