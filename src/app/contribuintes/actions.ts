"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { contribuinteSchema, type ContribuinteEntrada } from "@/lib/schemas/contribuinte";
import {
  atualizarContribuinte,
  ContribuinteNaoEncontradoError,
  criarContribuinte,
  DocumentoJaCadastradoError,
  excluirContribuinte,
} from "@/server/services/contribuintes";

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
      ? await atualizarContribuinte(id, resultado.data)
      : await criarContribuinte(resultado.data);
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

export async function removerContribuinte(id: string) {
  try {
    await excluirContribuinte(id);
  } catch (erro) {
    // Já excluído por outra pessoa: o resultado desejado é o mesmo, voltar à listagem.
    if (!(erro instanceof ContribuinteNaoEncontradoError)) throw erro;
  }

  revalidatePath("/contribuintes");
  redirect("/contribuintes");
}
