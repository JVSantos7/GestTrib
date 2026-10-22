import type { Metadata } from "next";
import { salvarImovel } from "@/app/(sistema)/imoveis/actions";
import { FormImovel } from "@/components/imoveis/FormImovel";
import { formatarDocumento } from "@/lib/documento";
import { buscarContribuinte } from "@/server/services/contribuintes";

export const metadata: Metadata = { title: "Novo imóvel" };

export default async function NovoImovel({ searchParams }: PageProps<"/imoveis/novo">) {
  // Vindo da página do contribuinte (?contribuinte=<id>), o proprietário já vem preenchido.
  const { contribuinte: contribuinteId } = await searchParams;
  const proprietario =
    typeof contribuinteId === "string" ? await buscarContribuinte(contribuinteId) : null;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Novo imóvel</h1>
      <FormImovel
        acao={salvarImovel.bind(null, null)}
        valoresIniciais={
          proprietario ? { documentoProprietario: formatarDocumento(proprietario.documento) } : undefined
        }
        nomeProprietario={proprietario?.nome}
        rotuloEnviar="Cadastrar"
        hrefCancelar={proprietario ? `/contribuintes/${proprietario.id}` : "/imoveis"}
      />
    </div>
  );
}
