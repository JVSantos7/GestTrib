import { Cabecalho } from "@/components/layout/Cabecalho";
import { FaixaDemonstracao } from "@/components/layout/FaixaDemonstracao";
import { MenuLateral } from "@/components/layout/MenuLateral";
import { cadastroAberto } from "@/server/cadastro";
import { demoHabilitada } from "@/server/demo";
import { pode } from "@/server/sessao";

// Moldura das telas internas (cabeçalho + menu). A tela de login fica fora deste grupo.
// A proteção de verdade está em cada página e action: o layout não roda de novo a cada navegação.
export default async function LayoutSistema({ children }: LayoutProps<"/">) {
  const mostrarAdministracao = await pode({ user: ["list"] });
  // Aberto ao público (demo ou cadastro pela tela): quem entra precisa saber que os dados são compartilhados.
  const publico = demoHabilitada() || cadastroAberto();

  return (
    <>
      {publico && <FaixaDemonstracao />}
      <Cabecalho />
      <div className="flex flex-1 flex-col md:flex-row">
        <MenuLateral mostrarAdministracao={mostrarAdministracao} />
        <main className="flex-1 bg-zinc-50 p-4 dark:bg-black md:p-8 print:bg-white print:p-0">{children}</main>
      </div>
    </>
  );
}
