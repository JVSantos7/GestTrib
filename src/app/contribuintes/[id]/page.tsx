import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { removerContribuinte } from "@/app/contribuintes/actions";
import { BotaoExcluir } from "@/components/contribuintes/BotaoExcluir";
import { formatarDocumento } from "@/lib/documento";
import { formatarCep, formatarDataHora, formatarTelefone } from "@/lib/formatacao";
import { buscarContribuinte } from "@/server/services/contribuintes";

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
        <div className="flex gap-2">
          <Link
            href={`/contribuintes/${contribuinte.id}/editar`}
            className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
          >
            Editar
          </Link>
          <BotaoExcluir
            acao={removerContribuinte.bind(null, contribuinte.id)}
            nome={contribuinte.nome}
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
    </div>
  );
}
