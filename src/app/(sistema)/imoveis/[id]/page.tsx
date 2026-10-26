import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { removerImovel } from "@/app/(sistema)/imoveis/actions";
import { BotaoExcluir } from "@/components/BotaoExcluir";
import { CLASSE_BOTAO_PRIMARIO } from "@/components/form/estilos";
import { Historico } from "@/components/Historico";
import { formatarDecimalBr } from "@/lib/decimal";
import { formatarDocumento } from "@/lib/documento";
import { formatarCep, formatarDataHora } from "@/lib/formatacao";
import { MUNICIPIO } from "@/lib/municipio";
import { formatarInscricao, ROTULOS_USO } from "@/lib/schemas/imovel";
import { buscarImovel } from "@/server/services/imoveis";
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
  const [podeEditar, podeExcluir] = await Promise.all([
    pode({ imovel: ["editar"] }),
    pode({ imovel: ["excluir"] }),
  ]);

  const { id } = await params;
  const imovel = await buscarImovel(id);
  if (!imovel) notFound();

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

      <Historico entidade="Imovel" entidadeId={imovel.id} />
    </div>
  );
}
