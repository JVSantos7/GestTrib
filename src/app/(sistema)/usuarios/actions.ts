"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { z } from "zod";
import type { EstadoAcao } from "@/components/form/FormAcao";
import type { Perfil } from "@/lib/permissoes";
import { novaSenhaSchema, novoUsuarioSchema, perfilSchema } from "@/lib/schemas/usuario";
import {
  alterarPerfil,
  criarUsuario,
  desativarUsuario,
  EmailJaCadastradoError,
  OperacaoNaoPermitidaError,
  reativarUsuario,
  redefinirSenha,
  UsuarioNaoEncontradoError,
} from "@/server/services/usuarios";
import { AcessoNegadoError, exigirPermissaoAcao, type Permissoes, type UsuarioLogado } from "@/server/sessao";

function errosPorCampo(erro: z.ZodError): EstadoAcao {
  const erros: Record<string, string> = {};
  for (const issue of erro.issues) erros[String(issue.path[0])] ??= issue.message;
  return { erro: "Corrija os campos destacados.", erros };
}

/** Confere a permissão, roda a operação e traduz os erros conhecidos em mensagem para a tela. */
async function executar(
  permissoes: Permissoes,
  operacao: (responsavel: UsuarioLogado) => Promise<EstadoAcao | void>,
): Promise<EstadoAcao> {
  try {
    const responsavel = await exigirPermissaoAcao(permissoes);
    return (await operacao(responsavel)) ?? {};
  } catch (erro) {
    if (
      erro instanceof AcessoNegadoError ||
      erro instanceof OperacaoNaoPermitidaError ||
      erro instanceof UsuarioNaoEncontradoError
    ) {
      return { erro: erro.message };
    }
    throw erro;
  }
}

export async function criarUsuarioAcao(_estado: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  let novoId: string | undefined;
  const estado = await executar({ user: ["create"] }, async (responsavel) => {
    const resultado = novoUsuarioSchema.safeParse(Object.fromEntries(formData));
    if (!resultado.success) return errosPorCampo(resultado.error);
    try {
      novoId = (await criarUsuario(resultado.data, responsavel)).id;
    } catch (erro) {
      if (erro instanceof EmailJaCadastradoError) return { erro: erro.message, erros: { email: erro.message } };
      throw erro;
    }
  });
  if (!novoId) return estado;

  revalidatePath("/usuarios");
  redirect(`/usuarios/${novoId}`);
}

export async function alterarPerfilAcao(id: string, _estado: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  return executar({ user: ["set-role"] }, async (responsavel) => {
    const resultado = perfilSchema.safeParse(Object.fromEntries(formData));
    if (!resultado.success) return errosPorCampo(resultado.error);
    await alterarPerfil(id, resultado.data.perfil as Perfil, responsavel);
    revalidatePath("/usuarios");
    return { sucesso: "Perfil alterado. Vale a partir do próximo clique do usuário." };
  });
}

export async function alterarSituacaoAcao(id: string, ativar: boolean): Promise<EstadoAcao> {
  return executar({ user: ["ban"] }, async (responsavel) => {
    if (ativar) await reativarUsuario(id, responsavel);
    else await desativarUsuario(id, responsavel);
    revalidatePath("/usuarios");
    return { sucesso: ativar ? "Usuário reativado." : "Usuário desativado e desconectado." };
  });
}

export async function redefinirSenhaAcao(id: string, _estado: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  return executar({ user: ["set-password"] }, async (responsavel) => {
    const resultado = novaSenhaSchema.safeParse(Object.fromEntries(formData));
    if (!resultado.success) return errosPorCampo(resultado.error);
    await redefinirSenha(id, resultado.data.senha, responsavel);
    return { sucesso: "Senha redefinida. O usuário precisa entrar de novo com a senha nova." };
  });
}
