import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { lancarImovelAcao } from "@/app/(sistema)/iptu/actions";
import { removerImovel } from "@/app/(sistema)/imoveis/actions";
import { BotaoExcluir } from "@/components/BotaoExcluir";
import { CLASSE_BOTAO_PRIMARIO } from "@/components/form/estilos";
import { Historico } from "@/components/Historico";
import { FormLancarImovel } from "@/components/iptu/FormulariosIptu";
import { SituacaoLancamento } from "@/components/iptu/SituacaoLancamento";
import { formatarDecimalBr, formatarReais } from "@/lib/decimal";
import { formatarDocumento } from "@/lib/documento";
import { formatarCep, formatarDataHora } from "@/lib/formatacao";
import { MUNICIPIO } from "@/lib/municipio";
import { formatarInscricao, ROTULOS_USO } from "@/lib/schemas/imovel";
import { buscarImovel } from "@/server/services/imoveis";
import { listarLancamentosDoImovel } from "@/server/services/lancamentos-iptu";
import { listarParametros } from "@/server/services/parametros-iptu";
import { exigirPermissaoPagina, pode } from "@/server/sessao";

export const metadata: Metadata = { title: "Imóvel" };

function Dado({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-zinc-500">{rotulo}</dt>
      <dd className="mt-1 text-sm">{children}</dd>
    </div>
  );
}

export default async function DetalhesImovel({ params }: PageProps<"/imoveis/[id]">) {
  await exigirPermissaoPagina({ imovel: ["ver"] });
  const [podeEditar, podeExcluir, podeVerIptu, podeLancar] = await Promise.all([
    pode({ imovel: ["editar"] }),
    pode({ imovel: ["excluir"] }),
    pode({ iptu: ["ver"] }),
    pode({ iptu: ["lancar"] }),
  ]);

  const { id } = await params;
  const imovel = await buscarImovel(id);
  if (!imovel) notFound();
  const [lancamentos, parametros] = await Promise.all([listarLancamentosDoImovel(imovel.id), listarParametros()]);
  // Exercícios com parâmetros em que o imóvel ainda não tem lançamento vigente.
  const comVigente = new Set(lancamentos.filter((l) => l.vigente).map((l) => l.exercicio));
  const exerciciosParaLancar = parametros.map((p) => p.exercicio).filter((e) => !comVigente.has(e));

  const inscricao = formatarInscricao(imovel.inscricao);
  const endereco = [`${imovel.logradouro}, ${imovel.numero}`, imovel.complemento, imovel.bairro]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="max-w-3xl">
      <Link href="/imoveis" className="text-sm text-emerald-700 hover:underline dark:text-emerald-400">
        ← Imóveis
      </Link>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight tabular-nums">Imóvel {inscricao}</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{ROTULOS_USO[imovel.uso]}</p>
        </div>
        <div className="flex items-start gap-2">
          {podeEditar && (
            <Link href={`/imoveis/${imovel.id}/editar`} className={CLASSE_BOTAO_PRIMARIO}>
              Editar
            </Link>
          )}
          {podeExcluir && (
            <BotaoExcluir
              acao={removerImovel.bind(null, imovel.id)}
              confirmacao={`Excluir o imóvel ${inscricao}?`}
            />
          )}
        </div>
      </div>

      <dl className="mt-6 grid gap-5 rounded-md border border-zinc-200 bg-white p-5 sm:grid-cols-2 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="sm:col-span-2">
          <Dado rotulo="Proprietário">
            <Link
              href={`/contribuintes/${imovel.contribuinte.id}`}
              className="font-medium text-emerald-700 hover:underline dark:text-emerald-400"
            >
              {imovel.contribuinte.nome}
            </Link>
            <span className="text-zinc-500"> · {formatarDocumento(imovel.contribuinte.documento)}</span>
          </Dado>
        </div>
        <Dado rotulo="Área do terreno">{formatarDecimalBr(imovel.areaTerreno)} m²</Dado>
        <Dado rotulo="Área construída">
          {imovel.uso === "TERRENO" ? "Sem construção" : `${formatarDecimalBr(imovel.areaConstruida)} m²`}
        </Dado>
        <div className="sm:col-span-2">
          <Dado rotulo="Endereço">{endereco}</Dado>
        </div>
        <Dado rotulo="Município">
          {MUNICIPIO.nome}/{MUNICIPIO.uf}
        </Dado>
        <Dado rotulo="CEP">{formatarCep(imovel.cep)}</Dado>
        <Dado rotulo="Cadastrado em">{formatarDataHora(imovel.criadoEm)}</Dado>
        <Dado rotulo="Última alteração">{formatarDataHora(imovel.atualizadoEm)}</Dado>
      </dl>

      {podeVerIptu && (
        <section className="mt-8" aria-labelledby="titulo-iptu">
          <h2 id="titulo-iptu" className="text-lg font-semibold">
            IPTU
          </h2>
          {podeLancar && exerciciosParaLancar.length > 0 && (
            <div className="mt-3">
              <FormLancarImovel acao={lancarImovelAcao.bind(null, imovel.id)} exercicios={exerciciosParaLancar} />
            </div>
          )}
          {lancamentos.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">Nenhum IPTU lançado para este imóvel.</p>
          ) : (
            <ul className="mt-3 divide-y divide-zinc-100 rounded-md border border-zinc-200 bg-white dark:divide-zinc-900 dark:border-zinc-800 dark:bg-zinc-950">
              {lancamentos.map((lancamento) => (
                <li key={lancamento.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                  <Link href={`/iptu/${lancamento.id}`} className="font-medium text-emerald-700 hover:underline dark:text-emerald-400">
                    IPTU {lancamento.exercicio}
                  </Link>
                  <span className="flex items-center gap-3">
                    <span className="tabular-nums">{formatarReais(lancamento.valorImposto)}</span>
                    <SituacaoLancamento vigente={Boolean(lancamento.vigente)} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <Historico entidade="Imovel" entidadeId={imovel.id} />
    </div>
  );
}
