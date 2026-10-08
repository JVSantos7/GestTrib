import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { salvarContribuinte } from "@/app/contribuintes/actions";
import { FormContribuinte } from "@/components/contribuintes/FormContribuinte";
import { formatarDocumento } from "@/lib/documento";
import { formatarCep, formatarTelefone } from "@/lib/formatacao";
import { buscarContribuinte } from "@/server/services/contribuintes";

export const metadata: Metadata = { title: "Editar contribuinte" };

export default async function EditarContribuinte({
  params,
}: PageProps<"/contribuintes/[id]/editar">) {
  const { id } = await params;
  const contribuinte = await buscarContribuinte(id);
  if (!contribuinte) notFound();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Editar contribuinte</h1>
      <FormContribuinte
        acao={salvarContribuinte.bind(null, contribuinte.id)}
        valoresIniciais={{
          tipoPessoa: contribuinte.tipoPessoa,
          documento: formatarDocumento(contribuinte.documento),
          nome: contribuinte.nome,
          email: contribuinte.email ?? "",
          telefone: contribuinte.telefone ? formatarTelefone(contribuinte.telefone) : "",
          cep: formatarCep(contribuinte.cep),
          logradouro: contribuinte.logradouro,
          numero: contribuinte.numero,
          complemento: contribuinte.complemento ?? "",
          bairro: contribuinte.bairro,
          cidade: contribuinte.cidade,
          uf: contribuinte.uf,
        }}
        rotuloEnviar="Salvar alterações"
        hrefCancelar={`/contribuintes/${contribuinte.id}`}
      />
    </div>
  );
}
