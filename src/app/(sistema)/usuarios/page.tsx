import type { Metadata } from "next";
import Link from "next/link";
import { CLASSE_BOTAO_PRIMARIO } from "@/components/form/estilos";
import { formatarDataHora } from "@/lib/formatacao";
import { ROTULOS_PERFIL, type Perfil } from "@/lib/permissoes";
import { listarUsuarios } from "@/server/services/usuarios";
import { exigirPermissaoPagina } from "@/server/sessao";

export const metadata: Metadata = { title: "Usuários" };

export default async function Usuarios() {
  const eu = await exigirPermissaoPagina({ user: ["list"] });
  const usuarios = await listarUsuarios();

  return (
    <div className="max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Usuários</h1>
        <Link href="/usuarios/novo" className={CLASSE_BOTAO_PRIMARIO}>
          Novo usuário
        </Link>
      </div>

      <div className="mt-6 overflow-x-auto rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">Nome</th>
              <th scope="col" className="px-4 py-3 font-medium">E-mail</th>
              <th scope="col" className="px-4 py-3 font-medium">Perfil</th>
              <th scope="col" className="px-4 py-3 font-medium">Situação</th>
              <th scope="col" className="px-4 py-3 font-medium">Criado em</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
            {usuarios.map((usuario) => (
              <tr key={usuario.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900">
                <td className="px-4 py-3 font-medium">
                  <Link href={`/usuarios/${usuario.id}`} className="text-emerald-700 hover:underline dark:text-emerald-400">
                    {usuario.name}
                  </Link>
                  {usuario.id === eu.id && <span className="ml-2 text-xs text-zinc-500">(você)</span>}
                </td>
                <td className="px-4 py-3">{usuario.email}</td>
                <td className="px-4 py-3">{ROTULOS_PERFIL[usuario.role as Perfil] ?? usuario.role}</td>
                <td className="px-4 py-3">
                  {usuario.banned ? (
                    <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                      Desativado
                    </span>
                  ) : (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      Ativo
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">{formatarDataHora(usuario.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
