import type { Perfil } from "@/lib/permissoes";

// Contas de demonstração: uma por perfil, para quem visita o portfólio entrar sem cadastro.
// Só funcionam com o modo demonstração ligado no .env (ver `src/server/demo.ts`).
// O domínio ".example" é reservado para exemplos: nunca será um e-mail de verdade.

export const CONTAS_DEMO: Record<Perfil, { email: string; nome: string; descricao: string }> = {
  administrador: {
    email: "administrador@demo.gesttrib.example",
    nome: "Demonstração · Administrador",
    descricao: "Tudo, inclusive gestão de usuários e parâmetros do IPTU.",
  },
  operador: {
    email: "operador@demo.gesttrib.example",
    nome: "Demonstração · Operador",
    descricao: "Cadastros, lançamentos, guias e baixas. Sem estorno nem usuários.",
  },
  consulta: {
    email: "consulta@demo.gesttrib.example",
    nome: "Demonstração · Consulta",
    descricao: "Só consulta: vê tudo, não altera nada.",
  },
};

const EMAILS_DEMO = new Set(Object.values(CONTAS_DEMO).map((conta) => conta.email));

/** As contas demo são compartilhadas por todos os visitantes: ninguém pode alterá-las. */
export function ehEmailDemo(email: string): boolean {
  return EMAILS_DEMO.has(email.trim().toLowerCase());
}
