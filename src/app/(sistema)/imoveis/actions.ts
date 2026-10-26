"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { EstadoExclusao } from "@/components/BotaoExcluir";
import { imovelSchema, type ImovelEntrada } from "@/lib/schemas/imovel";
import {
  atualizarImovel,
  criarImovel,
  excluirImovel,
  ImovelNaoEncontradoError,
  InscricaoJaCadastradaError,
  ProprietarioNaoEncontradoError,
} from "@/server/services/imoveis";
import { AcessoNegadoError, exigirPermissaoAcao, type UsuarioLogado } from "@/server/sessao";

export type CampoImovel = keyof ImovelEntrada;

export type EstadoFormularioImovel = {
  mensagem?: string;
  erros?: Partial<Record<CampoImovel, string>>;
  // Devolvidos ao formulário para o usuário não perder o que digitou.
  valores?: Record<CampoImovel, string>;
};

const CAMPOS = Object.keys(imovelSchema.shape) as CampoImovel[];
const CORRIJA = "Corrija os campos destacados.";

/** Cria (id nulo) ou atualiza um imóvel. Usada com `useActionState`. */
export async function salvarImovel(
  id: string | null,
  _estadoAnterior: EstadoFormularioImovel,
  formData: FormData,
): Promise<EstadoFormularioImovel> {
  let responsavel: UsuarioLogado;
  try {
    responsavel = await exigirPermissaoAcao({ imovel: [id ? "editar" : "criar"] });
  } catch (erro) {
    if (erro instanceof AcessoNegadoError) return { mensagem: erro.message };
    throw erro;
  }

  const valores = Object.fromEntries(
    CAMPOS.map((campo) => [campo, String(formData.get(campo) ?? "")]),
  ) as Record<CampoImovel, string>;

  const resultado = imovelSchema.safeParse(valores);
  if (!resultado.success) {
    const erros: EstadoFormularioImovel["erros"] = {};
    for (const issue of resultado.error.issues) {
      erros[issue.path[0] as CampoImovel] ??= issue.message;
    }
    return { mensagem: CORRIJA, erros, valores };
  }

  let imovel: { id: string; contribuinteId: string };
  try {
    imovel = id ? await atualizarImovel(id, resultado.data, responsavel) : await criarImovel(resultado.data, responsavel);
  } catch (erro) {
    if (erro instanceof InscricaoJaCadastradaError) {
      return { mensagem: CORRIJA, erros: { inscricao: erro.message }, valores };
    }
    if (erro instanceof ProprietarioNaoEncontradoError) {
      return { mensagem: CORRIJA, erros: { documentoProprietario: erro.message }, valores };
    }
    if (erro instanceof ImovelNaoEncontradoError) {
      return { mensagem: erro.message, valores };
    }
    throw erro;
  }

  revalidatePath("/imoveis");
  // A página do proprietário lista os imóveis dele; na transferência, as duas mudam.
  revalidatePath("/contribuintes/[id]", "page");
  redirect(`/imoveis/${imovel.id}`);
}

export async function removerImovel(id: string): Promise<EstadoExclusao> {
  try {
    const responsavel = await exigirPermissaoAcao({ imovel: ["excluir"] });
    await excluirImovel(id, responsavel);
  } catch (erro) {
    if (erro instanceof AcessoNegadoError) return { erro: erro.message };
    // Já excluído por outra pessoa: o resultado desejado é o mesmo, voltar à listagem.
    if (!(erro instanceof ImovelNaoEncontradoError)) throw erro;
  }

  revalidatePath("/imoveis");
  revalidatePath("/contribuintes/[id]", "page");
  redirect("/imoveis");
}
