import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { removerContribuinte } from "@/app/contribuintes/actions";
import { BotaoExcluir } from "@/components/BotaoExcluir";
import { CLASSE_BOTAO_PRIMARIO } from "@/components/form/estilos";
import { formatarDocumento } from "@/lib/documento";
import { formatarCep, formatarDataHora, formatarTelefone } from "@/lib/formatacao";
import { formatarInscricao, ROTULOS_USO } from "@/lib/schemas/imovel";
import { buscarContribuinte } from "@/server/services/contribuintes";
import { listarImoveisDoContribuinte } from "@/server/services/imoveis";

export const metadata: Metadata = { title: "Contribuinte" };

function Dado({ rotulo, valor }: { rotulo: string; valor: string | null }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-zinc-500">{rotulo}</dt>
      <dd className="mt-1 text-sm">{valor ?? "—"}</dd>
    </div>
  );
}

export default async function DetalhesContribuinte({ params }: PageProps<"/contribuintes/[id]">) {
  const { id } = await params;
  const contribuinte = await buscarContribuinte(id);
  if (!contribuinte) notFound();
  const imoveis = await listarImoveisDoContribuinte(contribuinte.id);

  const pessoaFisica = contribuinte.tipoPessoa === "FISICA";
  const endereco = [
    `${contribuinte.logradouro}, ${contribuinte.numero}`,
    contribuinte.complemento,
    contribuinte.bairro,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="max-w-3xl">
      <Link href="/contribuintes" className="text-sm text-emerald-700 hover:underline dark:text-emerald-400">
        ← Contribuintes
      </Link>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{contribuinte.nome}</h1>
        <div className="flex items-start gap-2">
          <Link href={`/contribuintes/${contribuinte.id}/editar`} className={CLASSE_BOTAO_PRIMARIO}>
            Editar
          </Link>
          <BotaoExcluir
            acao={removerContribuinte.bind(null, contribuinte.id)}
            confirmacao={`Excluir o contribuinte "${contribuinte.nome}"?`}
          />
        </div>
      </div>

      <dl className="mt-6 grid gap-5 rounded-md border border-zinc-200 bg-white p-5 sm:grid-cols-2 dark:border-zinc-800 dark:bg-zinc-950">
        <Dado rotulo="Tipo de pessoa" valor={pessoaFisica ? "Física" : "Jurídica"} />
        <Dado rotulo={pessoaFisica ? "CPF" : "CNPJ"} valor={formatarDocumento(contribuinte.documento)} />
        <Dado rotulo="E-mail" valor={contribuinte.email} />
        <Dado
          rotulo="Telefone"
          valor={contribuinte.telefone && formatarTelefone(contribuinte.telefone)}
        />
        <div className="sm:col-span-2">
          <Dado rotulo="Endereço" valor={endereco} />
        </div>
        <Dado rotulo="Cidade" valor={`${contribuinte.cidade}/${contribuinte.uf}`} />
        <Dado rotulo="CEP" valor={formatarCep(contribuinte.cep)} />
        <Dado rotulo="Cadastrado em" valor={formatarDataHora(contribuinte.criadoEm)} />
        <Dado rotulo="Última alteração" valor={formatarDataHora(contribuinte.atualizadoEm)} />
      </dl>

      <section className="mt-8" aria-labelledby="titulo-imoveis">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="titulo-imoveis" className="text-lg font-semibold">
            Imóveis <span className="font-normal text-zinc-500">({imoveis.length})</span>
          </h2>
          <Link
            href={`/imoveis/novo?contribuinte=${contribuinte.id}`}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
          >
            Novo imóvel
          </Link>
        </div>

        {imoveis.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
            Nenhum imóvel em nome deste contribuinte.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-zinc-100 rounded-md border border-zinc-200 bg-white dark:divide-zinc-900 dark:border-zinc-800 dark:bg-zinc-950">
            {imoveis.map((imovel) => (
              <li key={imovel.id} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3 text-sm">
                <Link
                  href={`/imoveis/${imovel.id}`}
                  className="font-medium tabular-nums text-emerald-700 hover:underline dark:text-emerald-400"
                >
                  {formatarInscricao(imovel.inscricao)}
                </Link>
                <span className="text-zinc-600 dark:text-zinc-400">
                  {imovel.logradouro}, {imovel.numero} · {imovel.bairro} · {ROTULOS_USO[imovel.uso]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
