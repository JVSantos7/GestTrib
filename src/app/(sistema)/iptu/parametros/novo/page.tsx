import type { Metadata } from "next";
import { salvarParametros } from "@/app/(sistema)/iptu/parametros/actions";
import { setoresDoFormulario, valoresDoFormulario } from "@/app/(sistema)/iptu/parametros/formulario";
import { FormParametrosIptu } from "@/components/iptu/FormParametrosIptu";
import { MUNICIPIO } from "@/lib/municipio";
import { buscarUltimosParametros, listarSetoresComImoveis } from "@/server/services/parametros-iptu";
import { exigirPermissaoPagina } from "@/server/sessao";

export const metadata: Metadata = { title: "Novo exercício do IPTU" };

export default async function NovoExercicio() {
  await exigirPermissaoPagina({ parametroIptu: ["editar"] });
  const [ultimo, comImoveis] = await Promise.all([buscarUltimosParametros(), listarSetoresComImoveis()]);

  const setores = setoresDoFormulario(comImoveis, ultimo);
  const valores = valoresDoFormulario(ultimo, setores);
  // Sugere o ano seguinte ao último cadastrado (ou o ano corrente, no primeiro).
  valores.exercicio = String(ultimo ? ultimo.exercicio + 1 : new Date().getFullYear());

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Novo exercício do IPTU</h1>
      <p className="mt-1 mb-6 text-sm text-zinc-600 dark:text-zinc-400">
        {ultimo
          ? `Os valores vieram do exercício ${ultimo.exercicio}; ajuste o que mudou.`
          : `Valores sugeridos (fictícios) para ${MUNICIPIO.nome}/${MUNICIPIO.uf}; ajuste antes de salvar.`}
      </p>
      <FormParametrosIptu
        acao={salvarParametros.bind(null, null)}
        valoresIniciais={valores}
        setores={setores}
        rotuloEnviar="Cadastrar"
        hrefCancelar="/iptu/parametros"
      />
    </div>
  );
}
