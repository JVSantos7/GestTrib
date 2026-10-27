"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CAMPOS_PARAMETROS, parametrosIptuSchema } from "@/lib/schemas/parametros-iptu";
import {
  atualizarParametros,
  criarParametros,
  ExercicioJaCadastradoError,
  ParametrosNaoEncontradosError,
  SetorSemValorError,
} from "@/server/services/parametros-iptu";
import { AcessoNegadoError, exigirPermissaoAcao, type UsuarioLogado } from "@/server/sessao";

export type EstadoFormularioParametros = {
  mensagem?: string;
  erros?: Record<string, string>;
  // Devolvidos ao formulário para o usuário não perder o que digitou.
  valores?: Record<string, string>;
};

const CORRIJA = "Corrija os campos destacados.";
const PREFIXO_TERRENO = "terreno.";

/** Cria (exercício nulo) ou atualiza os parâmetros de um exercício. Usada com `useActionState`. */
export async function salvarParametros(
  exercicio: number | null,
  _estadoAnterior: EstadoFormularioParametros,
  formData: FormData,
): Promise<EstadoFormularioParametros> {
  let responsavel: UsuarioLogado;
  try {
    responsavel = await exigirPermissaoAcao({ parametroIptu: ["editar"] });
  } catch (erro) {
    if (erro instanceof AcessoNegadoError) return { mensagem: erro.message };
    throw erro;
  }

  // Na edição, o exercício vem da página (bind), não do formulário: não dá para trocá-lo forjando o envio.
  const valores: Record<string, string> = {};
  for (const [nome, valor] of formData) {
    if (typeof valor === "string" && (CAMPOS_PARAMETROS.includes(nome as never) || nome.startsWith(PREFIXO_TERRENO))) {
      valores[nome] = valor;
    }
  }
  if (exercicio !== null) valores.exercicio = String(exercicio);

  const terrenos = Object.fromEntries(
    Object.entries(valores)
      .filter(([nome]) => nome.startsWith(PREFIXO_TERRENO))
      .map(([nome, valor]) => [nome.slice(PREFIXO_TERRENO.length), valor]),
  );
  const resultado = parametrosIptuSchema.safeParse({ ...valores, terrenos });
  if (!resultado.success) {
    const erros: Record<string, string> = {};
    for (const issue of resultado.error.issues) {
      const [campo, setor] = issue.path.map(String);
      erros[campo === "terrenos" ? `${PREFIXO_TERRENO}${setor}` : campo] ??= issue.message;
    }
    return { mensagem: CORRIJA, erros, valores };
  }

  try {
    if (exercicio === null) await criarParametros(resultado.data, responsavel);
    else await atualizarParametros(exercicio, resultado.data, responsavel);
  } catch (erro) {
    if (erro instanceof ExercicioJaCadastradoError) {
      return { mensagem: CORRIJA, erros: { exercicio: erro.message }, valores };
    }
    if (erro instanceof SetorSemValorError || erro instanceof ParametrosNaoEncontradosError) {
      return { mensagem: erro.message, valores };
    }
    throw erro;
  }

  revalidatePath("/iptu/parametros");
  redirect(`/iptu/parametros/${resultado.data.exercicio}`);
}
