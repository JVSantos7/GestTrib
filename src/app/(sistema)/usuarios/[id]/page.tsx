import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { alterarPerfilAcao, alterarSituacaoAcao, redefinirSenhaAcao } from "@/app/(sistema)/usuarios/actions";
import { Historico } from "@/components/Historico";
import { BotaoSituacao, FormPerfil, FormSenha } from "@/components/usuarios/FormulariosUsuario";
import { formatarDataHora } from "@/lib/formatacao";
import { ROTULOS_PERFIL, type Perfil } from "@/lib/permissoes";
import { buscarUsuario } from "@/server/services/usuarios";
import { exigirPermissaoPagina } from "@/server/sessao";

export const metadata: Metadata = { title: "Usuário" };

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="rounded-md border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="mb-3 text-base font-semibold">{titulo}</h2>
      {children}
    </section>
  );
}

export default async function DetalhesUsuario({ params }: PageProps<"/usuarios/[id]">) {
  const eu = await exigirPermissaoPagina({ user: ["get"] });
  const { id } = await params;
  const usuario = await buscarUsuario(id);
  if (!usuario) notFound();

  const souEu = usuario.id === eu.id;
  const perfil = usuario.role as Perfil;
  const ativo = !usuario.banned;

  return (
    <div className="max-w-3xl">
      <Link href="/usuarios" className="text-sm text-emerald-700 hover:underline dark:text-emerald-400">
        ← Usuários
      </Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">{usuario.name}</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        {usuario.email} · {ROTULOS_PERFIL[perfil] ?? perfil} · {ativo ? "Ativo" : "Desativado"} · criado em{" "}
        {formatarDataHora(usuario.createdAt)}
      </p>

      {souEu && (
        <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          Esta é a sua conta. Para não correr o risco de perder o acesso, o seu perfil e a sua situação só podem ser
          alterados por outro administrador.
        </p>
      )}

      <div className="mt-6 grid gap-4">
        {!souEu && (
          <Secao titulo="Perfil de acesso">
            <FormPerfil acao={alterarPerfilAcao.bind(null, usuario.id)} perfil={perfil} />
          </Secao>
        )}
        <Secao titulo="Redefinir senha">
          <FormSenha acao={redefinirSenhaAcao.bind(null, usuario.id)} />
        </Secao>
        {!souEu && (
          <Secao titulo="Situação">
            <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
              {ativo
                ? "Desativar impede o acesso e encerra as sessões abertas. O usuário não é apagado: o histórico da auditoria continua apontando para ele."
                : "Este usuário está desativado e não consegue entrar no sistema."}
            </p>
            <BotaoSituacao acao={alterarSituacaoAcao.bind(null, usuario.id, !ativo)} ativo={ativo} nome={usuario.name} />
          </Secao>
        )}
      </div>

      <Historico entidade="Usuario" entidadeId={usuario.id} />
    </div>
  );
}
