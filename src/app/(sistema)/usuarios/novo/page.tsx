import type { Metadata } from "next";
import Link from "next/link";
import { criarUsuarioAcao } from "@/app/(sistema)/usuarios/actions";
import { FormNovoUsuario } from "@/components/usuarios/FormulariosUsuario";
import { exigirPermissaoPagina } from "@/server/sessao";

export const metadata: Metadata = { title: "Novo usuário" };

export default async function NovoUsuario() {
  await exigirPermissaoPagina({ user: ["create"] });

  return (
    <div>
      <Link href="/usuarios" className="text-sm text-emerald-700 hover:underline dark:text-emerald-400">
        ← Usuários
      </Link>
      <h1 className="mt-2 mb-2 text-2xl font-semibold tracking-tight">Novo usuário</h1>
      <p className="mb-6 max-w-md text-sm text-zinc-600 dark:text-zinc-400">
        Passe a senha inicial à pessoa por um canal seguro. Ela não fica visível para ninguém depois de salva.
      </p>
      <FormNovoUsuario acao={criarUsuarioAcao} />
    </div>
  );
}
