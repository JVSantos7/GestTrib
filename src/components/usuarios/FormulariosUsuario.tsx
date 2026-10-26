"use client";

// Os formulários da gestão de usuários. Ficam num componente de cliente porque recebem
// funções (a renderização dos campos), que não podem ser passadas por uma página do servidor.

import { Campo } from "@/components/form/Campo";
import { CLASSE_CAMPO } from "@/components/form/estilos";
import { FormAcao, type EstadoAcao } from "@/components/form/FormAcao";
import { PERFIS, ROTULOS_PERFIL, type Perfil } from "@/lib/permissoes";

type Acao = (estado: EstadoAcao, formData: FormData) => Promise<EstadoAcao>;

function SeletorPerfil({ valor, erro }: { valor?: Perfil; erro?: string }) {
  return (
    <div>
      <label htmlFor="perfil" className="block text-sm font-medium">
        Perfil
      </label>
      <select id="perfil" name="perfil" defaultValue={valor ?? "consulta"} className={CLASSE_CAMPO}>
        {PERFIS.map((perfil) => (
          <option key={perfil} value={perfil}>
            {ROTULOS_PERFIL[perfil]}
          </option>
        ))}
      </select>
      {erro && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{erro}</p>}
    </div>
  );
}

function CamposSenha({ erros }: { erros?: Record<string, string> }) {
  return (
    <>
      <Campo nome="senha" rotulo="Senha (mínimo 10 caracteres)" tipo="password" autoComplete="new-password" maximo={128} erro={erros?.senha} />
      <Campo nome="confirmacao" rotulo="Repita a senha" tipo="password" autoComplete="new-password" maximo={128} erro={erros?.confirmacao} />
    </>
  );
}

export function FormNovoUsuario({ acao }: { acao: Acao }) {
  return (
    <FormAcao acao={acao} rotulo="Criar usuário" className="max-w-md space-y-4">
      {({ erros }) => (
        <>
          <Campo nome="nome" rotulo="Nome" maximo={150} erro={erros?.nome} />
          <Campo nome="email" rotulo="E-mail (login)" tipo="email" autoComplete="off" maximo={150} erro={erros?.email} />
          <SeletorPerfil erro={erros?.perfil} />
          <CamposSenha erros={erros} />
        </>
      )}
    </FormAcao>
  );
}

export function FormPerfil({ acao, perfil }: { acao: Acao; perfil: Perfil }) {
  return (
    <FormAcao acao={acao} rotulo="Salvar perfil" className="space-y-3">
      {({ erros }) => <SeletorPerfil valor={perfil} erro={erros?.perfil} />}
    </FormAcao>
  );
}

export function FormSenha({ acao }: { acao: Acao }) {
  return (
    <FormAcao acao={acao} rotulo="Redefinir senha" className="space-y-3">
      {({ erros }) => <CamposSenha erros={erros} />}
    </FormAcao>
  );
}

export function BotaoSituacao({ acao, ativo, nome }: { acao: Acao; ativo: boolean; nome: string }) {
  return (
    <FormAcao
      acao={acao}
      rotulo={ativo ? "Desativar usuário" : "Reativar usuário"}
      rotuloPendente={ativo ? "Desativando…" : "Reativando…"}
      confirmacao={ativo ? `Desativar ${nome}? A pessoa será desconectada na hora.` : `Reativar ${nome}?`}
      perigo={ativo}
      className="space-y-3"
    />
  );
}
