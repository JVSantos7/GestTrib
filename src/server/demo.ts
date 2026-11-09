import "server-only";

/**
 * Modo demonstração: liga os botões "Entrar como..." na tela de login.
 * Precisa das duas variáveis no .env. Num uso real, basta não definir: os botões somem
 * e a action de entrada recusa qualquer chamada.
 *
 * A senha fica só no servidor: o navegador nunca a recebe, só escolhe o perfil.
 */
export function senhaDemo(): string | null {
  const senha = process.env.DEMO_SENHA ?? "";
  if (process.env.DEMO_HABILITADA !== "true" || senha.length < 10) return null;
  return senha;
}

export function demoHabilitada(): boolean {
  return senhaDemo() !== null;
}
