import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FormLogin } from "@/components/FormLogin";
import { MUNICIPIO } from "@/lib/municipio";
import { destinoSeguro, obterSessao } from "@/server/sessao";

export const metadata: Metadata = { title: "Entrar" };

export default async function Login({ searchParams }: PageProps<"/login">) {
  // Para onde voltar depois de entrar (ex.: a página que o usuário tentou abrir).
  const destino = destinoSeguro((await searchParams).destino);

  // Quem já está logado não precisa ver a tela de login.
  if (await obterSessao()) redirect(destino);

  return (
    <main className="flex flex-1 items-center justify-center bg-zinc-50 p-4 dark:bg-black">
      <div className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <p className="text-lg font-semibold tracking-tight text-emerald-700 dark:text-emerald-400">GestTrib</p>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Gestão Tributária · Município de {MUNICIPIO.nome}/{MUNICIPIO.uf}
        </p>
        <h1 className="mt-6 text-xl font-semibold">Entrar</h1>
        <FormLogin destino={destino} />
        <p className="mt-6 text-xs text-zinc-500">
          Sistema de demonstração com dados fictícios. O acesso é criado pelo administrador.
        </p>
      </div>
    </main>
  );
}
