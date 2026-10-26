import { Cabecalho } from "@/components/layout/Cabecalho";
import { MenuLateral } from "@/components/layout/MenuLateral";
import { pode } from "@/server/sessao";

// Moldura das telas internas (cabeçalho + menu). A tela de login fica fora deste grupo.
// A proteção de verdade está em cada página e action: o layout não roda de novo a cada navegação.
export default async function LayoutSistema({ children }: LayoutProps<"/">) {
  const mostrarAdministracao = await pode({ user: ["list"] });

  return (
    <>
      <Cabecalho />
      <div className="flex flex-1 flex-col md:flex-row">
        <MenuLateral mostrarAdministracao={mostrarAdministracao} />
        <main className="flex-1 bg-zinc-50 p-4 dark:bg-black md:p-8">{children}</main>
      </div>
    </>
  );
}
