import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { salvarParametros } from "@/app/(sistema)/iptu/parametros/actions";
import { setoresDoFormulario, valoresDoFormulario } from "@/app/(sistema)/iptu/parametros/formulario";
import { FormParametrosIptu } from "@/components/iptu/FormParametrosIptu";
import { buscarParametros, listarSetoresComImoveis } from "@/server/services/parametros-iptu";
import { exigirPermissaoPagina } from "@/server/sessao";

export const metadata: Metadata = { title: "Editar parâmetros do IPTU" };

export default async function EditarParametros({ params }: PageProps<"/iptu/parametros/[exercicio]/editar">) {
  await exigirPermissaoPagina({ parametroIptu: ["editar"] });
  const { exercicio } = await params;
  const [parametros, comImoveis] = await Promise.all([buscarParametros(Number(exercicio)), listarSetoresComImoveis()]);
  if (!parametros) notFound();

  const setores = setoresDoFormulario(comImoveis, parametros);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Parâmetros do IPTU {parametros.exercicio}</h1>
      <FormParametrosIptu
        acao={salvarParametros.bind(null, parametros.exercicio)}
        valoresIniciais={valoresDoFormulario(parametros, setores)}
        setores={setores}
        exercicioFixo={parametros.exercicio}
        rotuloEnviar="Salvar"
        hrefCancelar={`/iptu/parametros/${parametros.exercicio}`}
      />
    </div>
  );
}
