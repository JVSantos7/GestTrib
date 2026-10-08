"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type ItemMenu = {
  rotulo: string;
  href: string;
  // Módulos de fases futuras ficam visíveis, mas sem link, para não levar a 404.
  disponivel: boolean;
};

const ITENS: ItemMenu[] = [
  { rotulo: "Início", href: "/", disponivel: true },
  { rotulo: "Contribuintes", href: "/contribuintes", disponivel: true },
  { rotulo: "Imóveis", href: "/imoveis", disponivel: false },
  { rotulo: "IPTU", href: "/iptu", disponivel: false },
  { rotulo: "Guias", href: "/guias", disponivel: false },
  { rotulo: "Relatórios", href: "/relatorios", disponivel: false },
];

function estaAtivo(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MenuLateral() {
  const pathname = usePathname();
  const [aberto, setAberto] = useState(false);

  return (
    <aside className="shrink-0 border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 md:w-56 md:border-r md:border-b-0">
      <button
        type="button"
        onClick={() => setAberto((valor) => !valor)}
        aria-expanded={aberto}
        aria-controls="menu-principal"
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium md:hidden"
      >
        Menu
        <span aria-hidden="true">{aberto ? "▲" : "▼"}</span>
      </button>

      <nav
        id="menu-principal"
        aria-label="Menu principal"
        className={`${aberto ? "block" : "hidden"} px-2 pb-3 md:block md:py-4`}
      >
        <ul className="flex flex-col gap-1">
          {ITENS.map((item) => {
            if (!item.disponivel) {
              return (
                <li key={item.href}>
                  <span
                    aria-disabled="true"
                    className="flex cursor-not-allowed items-center justify-between rounded-md px-3 py-2 text-sm text-zinc-400 dark:text-zinc-600"
                  >
                    {item.rotulo}
                    <span className="text-[10px] uppercase tracking-wide">
                      Em breve
                    </span>
                  </span>
                </li>
              );
            }

            const ativo = estaAtivo(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={ativo ? "page" : undefined}
                  onClick={() => setAberto(false)}
                  className={`block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    ativo
                      ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                      : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
                  }`}
                >
                  {item.rotulo}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
