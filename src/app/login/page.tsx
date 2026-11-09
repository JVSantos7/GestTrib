import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BotoesDemonstracao } from "@/components/BotoesDemonstracao";
import { FormLogin } from "@/components/FormLogin";
import { CONTAS_DEMO } from "@/lib/demo";
import { MUNICIPIO } from "@/lib/municipio";
import { PERFIS, ROTULOS_PERFIL } from "@/lib/permissoes";
import { demoHabilitada } from "@/server/demo";
import { destinoSeguro, obterSessao } from "@/server/sessao";

export const metadata: Metadata = { title: "Entrar" };

export default async function Login({ searchParams }: PageProps<"/login">) {
  // Para onde voltar depois de entrar (ex.: a página que o usuário tentou abrir).
  const destino = destinoSeguro((await searchParams).destino);

  // Quem já está logado não precisa ver a tela de login.
  if (await obterSessao()) redirect(destino);

  const demo = demoHabilitada();
  const opcoesDemo = PERFIS.map((perfil) => ({ perfil, rotulo: ROTULOS_PERFIL[perfil], descricao: CONTAS_DEMO[perfil].descricao }));

  return (
    <main className="flex flex-1 items-center justify-center bg-zinc-50 p-4 dark:bg-black">
      <div className="w-full max-w-sm">
        <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-lg font-semibold tracking-tight text-emerald-700 dark:text-emerald-400">GestTrib</p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Gestão Tributária · Município de {MUNICIPIO.nome}/{MUNICIPIO.uf}
          </p>

          <h1 className="mt-6 text-xl font-semibold">Entrar</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Acesso dos servidores da prefeitura.</p>
          <FormLogin destino={destino} />
          <p className="mt-3 text-xs text-zinc-500">
            Esqueceu a senha ou não tem acesso? Procure o administrador do sistema: as contas são criadas e
            redefinidas por ele.
          </p>

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
        </div>

        {/* Serviço público: quem recebeu uma certidão confere sem precisar de login. */}
        <div className="mt-4 rounded-lg border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-zinc-950">
          <p className="font-medium">Serviços ao cidadão</p>
          <Link href="/validar-certidao" className="mt-1 inline-block text-emerald-700 hover:underline dark:text-emerald-400">
            Validar a autenticidade de uma certidão →
          </Link>
        </div>

        <p className="mt-4 text-center text-xs text-zinc-500">
          Sistema de demonstração com dados fictícios. Toda alteração fica registrada, com o usuário responsável, para auditoria.
        </p>
      </div>
    </main>
  );
}
