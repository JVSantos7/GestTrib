"use client";

import type { MouseEvent } from "react";
import { ID_ACESSO } from "@/components/publico/ids";

/** Contorno verde que acende e apaga em volta de "Criar conta | Entrar". */
const QUADROS_DESTAQUE: Keyframe[] = [
  { boxShadow: "0 0 0 2px var(--background), 0 0 0 4px var(--color-emerald-500)", offset: 0 },
  { boxShadow: "0 0 0 2px var(--background), 0 0 0 4px var(--color-emerald-500)", offset: 0.7 },
  { boxShadow: "0 0 0 2px var(--background), 0 0 0 4px transparent", offset: 1 },
];

/**
 * Botão do fim da apresentação: sobe até a barra e destaca "Criar conta | Entrar".
 *
 * É um link `#acesso` de propósito: se o JavaScript não carregar, o navegador ainda leva até a
 * barra. Com JavaScript, o clique é tratado aqui e o endereço não ganha `#acesso`, então
 * recarregar a página não acende o destaque, e cada clique toca a animação de novo.
 */
export function BotaoIrParaAcesso({ children }: { children: React.ReactNode }) {
  function irParaAcesso(evento: MouseEvent<HTMLAnchorElement>) {
    const acesso = document.getElementById(ID_ACESSO);
    if (!acesso) return; // deixa o link agir sozinho

    evento.preventDefault();
    const reduzir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduzir ? "auto" : "smooth" });

    // Web Animations API: cancela a animação anterior (se o clique vier no meio dela) e toca do início.
    acesso.getAnimations().forEach((animacao) => animacao.cancel());
    acesso.animate(QUADROS_DESTAQUE, { duration: reduzir ? 0 : 2000, easing: "ease-out" });
  }

  return (
    <a
      href={`#${ID_ACESSO}`}
      onClick={irParaAcesso}
      className="mt-4 inline-block rounded-md bg-white px-4 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-50"
    >
      {children}
    </a>
  );
}
