import Link from "next/link";
import type { ReactNode } from "react";
import { BarraPublica } from "@/components/publico/BarraPublica";

type Props = {
  destino: string;
  cadastro: boolean;
  children: ReactNode;
};

/** Moldura das telas "Entrar" e "Criar conta": barra no topo e o cartão centralizado. */
export function CartaoAcesso({ destino, cadastro, children }: Props) {
  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <BarraPublica destino={destino} cadastro={cadastro} />
      <main className="flex flex-1 items-start justify-center px-4 py-10 sm:items-center">
        <div className="w-full max-w-sm">
          <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            {children}
          </div>
          <p className="mt-4 text-center text-xs text-zinc-500">
            Sistema de demonstração com dados fictícios. Toda alteração fica registrada, com o usuário responsável, para
            auditoria. <Link href="/validar-certidao" className="underline">Validar uma certidão</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
