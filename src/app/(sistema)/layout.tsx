import { Cabecalho } from "@/components/layout/Cabecalho";
import { MenuLateral } from "@/components/layout/MenuLateral";

// Moldura das telas internas (cabeçalho + menu). A tela de login fica fora deste grupo.
export default function LayoutSistema({ children }: LayoutProps<"/">) {
  return (
    <>
      <Cabecalho />
      <div className="flex flex-1 flex-col md:flex-row">
        <MenuLateral />
        <main className="flex-1 bg-zinc-50 p-4 dark:bg-black md:p-8">{children}</main>
      </div>
    </>
  );
}
