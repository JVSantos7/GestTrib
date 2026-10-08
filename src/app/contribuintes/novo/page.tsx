import type { Metadata } from "next";
import { salvarContribuinte } from "@/app/contribuintes/actions";
import { FormContribuinte } from "@/components/contribuintes/FormContribuinte";

export const metadata: Metadata = { title: "Novo contribuinte" };

export default function NovoContribuinte() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Novo contribuinte</h1>
      <FormContribuinte
        acao={salvarContribuinte.bind(null, null)}
        rotuloEnviar="Cadastrar"
        hrefCancelar="/contribuintes"
      />
    </div>
  );
}
