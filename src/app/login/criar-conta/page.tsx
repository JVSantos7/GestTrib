import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AbasAcesso } from "@/components/publico/AbasAcesso";
import { comDestino } from "@/components/publico/BarraPublica";
import { CartaoAcesso } from "@/components/publico/CartaoAcesso";
import { FormCriarConta } from "@/components/publico/FormCriarConta";
import { ROTULOS_PERFIL } from "@/lib/permissoes";
import { cadastroAberto, PERFIL_CADASTRO_ABERTO } from "@/server/cadastro";
import { destinoSeguro, obterSessao } from "@/server/sessao";

export const metadata: Metadata = { title: "Criar conta" };

export default async function CriarConta({ searchParams }: PageProps<"/login/criar-conta">) {
  const destino = destinoSeguro((await searchParams).destino);
  if (await obterSessao()) redirect(destino);

  const cadastro = cadastroAberto();

  return (
    <CartaoAcesso destino={destino} cadastro={cadastro}>
      <AbasAcesso ativa="criar-conta" destino={destino} cadastro={cadastro} />
      {cadastro ? (
        <>
          <h1 className="text-xl font-semibold">Criar conta</h1>
          <p className="mt-1 mb-5 text-sm text-zinc-600 dark:text-zinc-400">
            Sua conta entra com o perfil <strong className="font-medium">{ROTULOS_PERFIL[PERFIL_CADASTRO_ABERTO]}</strong>:
            cadastra contribuintes e imóveis, lança o IPTU, emite guias, dá baixa em pagamentos e emite certidões. Gerenciar
            usuários e estornar pagamentos fica com o administrador.
          </p>
          <FormCriarConta destino={destino} />
          <p className="mt-4 text-center text-sm text-zinc-600 dark:text-zinc-400">
            Já tem conta?{" "}
            <Link href={comDestino("/login/entrar", destino)} className="font-medium text-emerald-700 hover:underline dark:text-emerald-400">
              Entrar
            </Link>
          </p>
        </>
      ) : (
        <>
          <h1 className="text-xl font-semibold">Cadastro fechado</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Neste sistema as contas são criadas pelo administrador. Procure-o para receber o seu acesso.
          </p>
          <Link
            href={comDestino("/login/entrar", destino)}
            className="mt-5 inline-block font-medium text-emerald-700 hover:underline dark:text-emerald-400"
          >
            Ir para a tela de entrar →
          </Link>
        </>
      )}
    </CartaoAcesso>
  );
}
