"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { EstadoExclusao } from "@/components/BotaoExcluir";
import type { DadosCnpj, EnderecoCep } from "@/lib/brasilapi";
import { contribuinteSchema, type ContribuinteEntrada } from "@/lib/schemas/contribuinte";
import { executarConsulta, type ResultadoConsulta } from "@/server/consulta-acao";
import { buscarDadosPorCnpj, buscarEnderecoPorCep } from "@/server/services/consultas-externas";
import {
  atualizarContribuinte,
  ContribuinteNaoEncontradoError,
  ContribuintePossuiImoveisError,
  criarContribuinte,
  DocumentoJaCadastradoError,
  excluirContribuinte,
} from "@/server/services/contribuintes";
import { AcessoNegadoError, exigirPermissaoAcao, type Permissoes, type UsuarioLogado } from "@/server/sessao";

export type CampoContribuinte = keyof ContribuinteEntrada;

export type EstadoFormulario = {
  mensagem?: string;
  erros?: Partial<Record<CampoContribuinte, string>>;
  // Devolvidos ao formulário para o usuário não perder o que digitou.
  valores?: Record<CampoContribuinte, string>;
};

const CAMPOS = Object.keys(contribuinteSchema.shape) as CampoContribuinte[];

/** Cria (id nulo) ou atualiza um contribuinte. Usada com `useActionState`. */
export async function salvarContribuinte(
  id: string | null,
  _estadoAnterior: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  let responsavel: UsuarioLogado;
  try {
    responsavel = await exigirPermissaoAcao({ contribuinte: [id ? "editar" : "criar"] });
  } catch (erro) {
    if (erro instanceof AcessoNegadoError) return { mensagem: erro.message };
    throw erro;
  }

  const valores = Object.fromEntries(
    CAMPOS.map((campo) => [campo, String(formData.get(campo) ?? "")]),
  ) as Record<CampoContribuinte, string>;

  const resultado = contribuinteSchema.safeParse(valores);
  if (!resultado.success) {
    const erros: EstadoFormulario["erros"] = {};
    for (const issue of resultado.error.issues) {
      erros[issue.path[0] as CampoContribuinte] ??= issue.message;
    }
    return { mensagem: "Corrija os campos destacados.", erros, valores };
  }

  let contribuinteId: string;
  try {
    const contribuinte = id
      ? await atualizarContribuinte(id, resultado.data, responsavel)
      : await criarContribuinte(resultado.data, responsavel);
    contribuinteId = contribuinte.id;
  } catch (erro) {
    if (erro instanceof DocumentoJaCadastradoError) {
      return {
        mensagem: "Corrija os campos destacados.",
        erros: { documento: erro.message },
        valores,
      };
    }
    if (erro instanceof ContribuinteNaoEncontradoError) {
      return { mensagem: erro.message, valores };
    }
    throw erro;
  }

  revalidatePath("/contribuintes");
  redirect(`/contribuintes/${contribuinteId}`);
}

// ---------------------------------------------------------------------------
// Consultas de CEP e CNPJ (BrasilAPI) para preencher o formulário.
// ---------------------------------------------------------------------------

// Consultar só faz sentido para quem pode cadastrar ou editar contribuintes.
const PODE_CADASTRAR: Permissoes[] = [{ contribuinte: ["criar"] }, { contribuinte: ["editar"] }];

export async function consultarCep(cep: string): Promise<ResultadoConsulta<EnderecoCep>> {
  return executarConsulta(PODE_CADASTRAR, () => buscarEnderecoPorCep(String(cep)));
}

export async function consultarCnpj(cnpj: string): Promise<ResultadoConsulta<DadosCnpj>> {
  return executarConsulta(PODE_CADASTRAR, () => buscarDadosPorCnpj(String(cnpj)));
}

export async function removerContribuinte(id: string): Promise<EstadoExclusao> {
  try {
    const responsavel = await exigirPermissaoAcao({ contribuinte: ["excluir"] });
    await excluirContribuinte(id, responsavel);
  } catch (erro) {
    if (erro instanceof AcessoNegadoError) return { erro: erro.message };
    if (erro instanceof ContribuintePossuiImoveisError) return { erro: erro.message };
    // Já excluído por outra pessoa: o resultado desejado é o mesmo, voltar à listagem.
    if (!(erro instanceof ContribuinteNaoEncontradoError)) throw erro;
  }

  revalidatePath("/contribuintes");
  redirect("/contribuintes");
}
