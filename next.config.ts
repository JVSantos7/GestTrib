import type { NextConfig } from "next";

// Cabeçalhos de segurança para todas as respostas.
const SEGURANCA = [
  // Impede que o sistema seja embutido em outro site (clickjacking).
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  // O navegador não tenta adivinhar o tipo do arquivo.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Links externos não recebem o endereço da página (que traz ids de contribuintes).
  { key: "Referrer-Policy", value: "same-origin" },
  // Recursos que o sistema não usa ficam bloqueados.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // Buscadores não indexam nada: são dados de contribuintes.
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
];

// Páginas com dados pessoais não ficam guardadas no cache do navegador nem de proxies.
const SEM_CACHE = [{ key: "Cache-Control", value: "private, no-store" }];

const nextConfig: NextConfig = {
  // Não anuncia a tecnologia do servidor.
  poweredByHeader: false,
  headers() {
    return [
      { source: "/:caminho*", headers: SEGURANCA },
      { source: "/contribuintes/:caminho*", headers: SEM_CACHE },
      { source: "/imoveis/:caminho*", headers: SEM_CACHE },
    ];
  },
};

export default nextConfig;
