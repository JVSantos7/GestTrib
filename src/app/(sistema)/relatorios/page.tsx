import type { Metadata } from "next";
import Link from "next/link";
import { exigirPermissaoPagina } from "@/server/sessao";

export const metadata: Metadata = { title: "Relatórios" };

const RELATORIOS = [
  {
    href: "/relatorios/arrecadacao",
    titulo: "Arrecadação",
    descricao: "Quanto foi pago em um período, dia a dia. Os estornos não entram.",
  },
  {
    href: "/relatorios/inadimplencia",
    titulo: "Inadimplência",
    descricao: "Quem tem guias vencidas e não pagas, do maior devedor para o menor.",
  },
  {
    href: "/relatorios/lancamentos",
    titulo: "Lançamentos por exercício",
    descricao: "IPTU lançado, arrecadado e a receber em um exercício, por uso do imóvel.",
  },
];

export default async function Relatorios() {
  await exigirPermissaoPagina({ relatorio: ["ver"] });

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-semibold tracking-tight">Relatórios</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Cada relatório pode ser impresso (ou salvo em PDF pela impressão do navegador) e baixado em CSV para o Excel.
      </p>

      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        {RELATORIOS.map((relatorio) => (
          <li key={relatorio.href}>
            <Link
              href={relatorio.href}
              className="block h-full rounded-md border border-zinc-200 bg-white p-5 hover:border-emerald-600 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-emerald-500"
            >
              <h2 className="font-semibold">{relatorio.titulo}</h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{relatorio.descricao}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
