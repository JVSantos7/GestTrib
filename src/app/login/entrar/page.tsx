import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BotoesDemonstracao } from "@/components/BotoesDemonstracao";
import { FormLogin } from "@/components/FormLogin";
import { AbasAcesso } from "@/components/publico/AbasAcesso";
import { comDestino } from "@/components/publico/BarraPublica";
import { CartaoAcesso } from "@/components/publico/CartaoAcesso";
import { CONTAS_DEMO } from "@/lib/demo";
import { PERFIS, ROTULOS_PERFIL } from "@/lib/permissoes";
import { cadastroAberto } from "@/server/cadastro";
import { demoHabilitada } from "@/server/demo";
import { destinoSeguro, obterSessao } from "@/server/sessao";

export const metadata: Metadata = { title: "Entrar" };

export default async function Entrar({ searchParams }: PageProps<"/login/entrar">) {
  // Para onde voltar depois de entrar (ex.: a página que o usuário tentou abrir).
  const destino = destinoSeguro((await searchParams).destino);

  // Quem já está logado não precisa ver a tela de login.
  if (await obterSessao()) redirect(destino);

  const cadastro = cadastroAberto();
  const demo = demoHabilitada();
  const opcoesDemo = PERFIS.map((perfil) => ({ perfil, rotulo: ROTULOS_PERFIL[perfil], descricao: CONTAS_DEMO[perfil].descricao }));

  return (
    <CartaoAcesso destino={destino} cadastro={cadastro}>
      <AbasAcesso ativa="entrar" destino={destino} cadastro={cadastro} />
      <h1 className="text-xl font-semibold">Entrar</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Use o e-mail e a senha da sua conta.</p>
      <FormLogin destino={destino} />

      {cadastro ? (
        <p className="mt-4 text-center text-sm text-zinc-600 dark:text-zinc-400">
          Não tem conta?{" "}
          <Link href={comDestino("/login/criar-conta", destino)} className="font-medium text-emerald-700 hover:underline dark:text-emerald-400">
            Criar conta
          </Link>
        </p>
      ) : (
        <p className="mt-3 text-xs text-zinc-500">
          Esqueceu a senha ou não tem acesso? Procure o administrador do sistema: as contas são criadas e redefinidas
          por ele.
        </p>
      )}

      {demo && (
        <section aria-labelledby="titulo-demo" className="mt-6 border-t border-zinc-200 pt-5 dark:border-zinc-800">
          <h2 id="titulo-demo" className="text-sm font-semibold">
            Acesso de demonstração
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Para conhecer o sistema sem cadastro. Cada perfil vê e pode fazer coisas diferentes.
          </p>
          <BotoesDemonstracao destino={destino} opcoes={opcoesDemo} />
        </section>
      )}
    </CartaoAcesso>
  );
}
