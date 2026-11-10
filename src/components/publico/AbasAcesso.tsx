import Link from "next/link";
import { comDestino } from "@/components/publico/BarraPublica";

type Props = {
  ativa: "entrar" | "criar-conta";
  destino: string;
  /** Sem cadastro aberto, só existe a aba "Entrar". */
  cadastro: boolean;
};

/** Abas "Entrar | Criar conta" no topo do cartão de acesso. Cada aba é uma página. */
export function AbasAcesso({ ativa, destino, cadastro }: Props) {
  if (!cadastro) return null;

  const abas = [
    { id: "entrar", rotulo: "Entrar", href: comDestino("/login/entrar", destino) },
    { id: "criar-conta", rotulo: "Criar conta", href: comDestino("/login/criar-conta", destino) },
  ] as const;

  return (
    <nav aria-label="Acesso" className="mb-6 grid grid-cols-2 rounded-md bg-zinc-100 p-1 text-sm font-medium dark:bg-zinc-900">
      {abas.map((aba) => (
        <Link
          key={aba.id}
          href={aba.href}
          aria-current={aba.id === ativa ? "page" : undefined}
          className={
            aba.id === ativa
              ? "rounded bg-white px-3 py-1.5 text-center text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100"
              : "rounded px-3 py-1.5 text-center text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          }
        >
          {aba.rotulo}
        </Link>
      ))}
    </nav>
  );
}
