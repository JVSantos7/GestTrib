import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { salvarImovel } from "@/app/(sistema)/imoveis/actions";
import { FormImovel } from "@/components/imoveis/FormImovel";
import { decimalEhZero, formatarDecimalBr } from "@/lib/decimal";
import { formatarDocumento } from "@/lib/documento";
import { formatarCep } from "@/lib/formatacao";
import { formatarInscricao } from "@/lib/schemas/imovel";
import { buscarImovel } from "@/server/services/imoveis";

export const metadata: Metadata = { title: "Editar imóvel" };

export default async function EditarImovel({ params }: PageProps<"/imoveis/[id]/editar">) {
  const { id } = await params;
  const imovel = await buscarImovel(id);
  if (!imovel) notFound();

  const areaConstruida = imovel.areaConstruida.toFixed(2);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Editar imóvel</h1>
      <FormImovel
        acao={salvarImovel.bind(null, imovel.id)}
        valoresIniciais={{
          inscricao: formatarInscricao(imovel.inscricao),
          uso: imovel.uso,
          areaTerreno: formatarDecimalBr(imovel.areaTerreno),
          areaConstruida: decimalEhZero(areaConstruida) ? "" : formatarDecimalBr(areaConstruida),
          documentoProprietario: formatarDocumento(imovel.contribuinte.documento),
          cep: formatarCep(imovel.cep),
          logradouro: imovel.logradouro,
          numero: imovel.numero,
          complemento: imovel.complemento ?? "",
          bairro: imovel.bairro,
        }}
        nomeProprietario={imovel.contribuinte.nome}
        rotuloEnviar="Salvar alterações"
        hrefCancelar={`/imoveis/${imovel.id}`}
      />
    </div>
  );
}
