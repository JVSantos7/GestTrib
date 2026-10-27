"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { EstadoAcao } from "@/components/form/FormAcao";
import {
  cancelarLancamento,
  lancarExercicio,
  lancarImovel,
  LancamentoJaCanceladoError,
  LancamentoJaExisteError,
  LancamentoNaoEncontradoError,
} from "@/server/services/lancamentos-iptu";
import { ImovelNaoEncontradoError } from "@/server/services/imoveis";
import { ParametrosNaoEncontradosError, SetorSemValorError } from "@/server/services/parametros-iptu";
import { AcessoNegadoError, exigirPermissaoAcao, type Permissoes, type UsuarioLogado } from "@/server/sessao";

const exercicioSchema = z.object({
  exercicio: z.coerce.number({ error: "Selecione o exercício." }).int().min(2000).max(2100),
});

const cancelamentoSchema = z.object({
  motivo: z
    .string({ error: "Informe o motivo do cancelamento." })
    .trim()
    .min(10, { error: "Descreva o motivo com pelo menos 10 caracteres." })
    .max(300, { error: "Use no máximo 300 caracteres." }),
});

// Erros de regra de negócio que viram mensagem na tela; o resto é falha inesperada.
const ERROS_CONHECIDOS = [
  AcessoNegadoError,
  ParametrosNaoEncontradosError,
  SetorSemValorError,
  ImovelNaoEncontradoError,
  LancamentoJaExisteError,
  LancamentoNaoEncontradoError,
  LancamentoJaCanceladoError,
];

/** Confere a permissão, roda a operação e traduz os erros conhecidos em mensagem para a tela. */
async function executar(
  permissoes: Permissoes,
  operacao: (responsavel: UsuarioLogado) => Promise<EstadoAcao>,
): Promise<EstadoAcao> {
  try {
    return await operacao(await exigirPermissaoAcao(permissoes));
  } catch (erro) {
    if (ERROS_CONHECIDOS.some((tipo) => erro instanceof tipo)) return { erro: (erro as Error).message };
    throw erro;
  }
}

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

export async function lancarExercicioAcao(_estado: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  return executar({ iptu: ["lancar"] }, async (responsavel) => {
    const resultado = exercicioSchema.safeParse(Object.fromEntries(formData));
    if (!resultado.success) return { erro: "Selecione o exercício." };
    const { exercicio } = resultado.data;

    const { lancados, jaLancados } = await lancarExercicio(exercicio, responsavel);
    revalidatePath("/iptu");
    if (lancados === 0) return { sucesso: `Nada a lançar: todos os imóveis já têm IPTU ${exercicio} vigente.` };
    const anteriores = jaLancados > 0 ? ` ${plural(jaLancados, "imóvel já tinha", "imóveis já tinham")} lançamento e não ${jaLancados === 1 ? "foi alterado" : "foram alterados"}.` : "";
    return { sucesso: `IPTU ${exercicio}: ${plural(lancados, "lançamento criado", "lançamentos criados")}.${anteriores}` };
  });
}

export async function lancarImovelAcao(imovelId: string, _estado: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  let lancamentoId: string | undefined;
  const estado = await executar({ iptu: ["lancar"] }, async (responsavel) => {
    const resultado = exercicioSchema.safeParse(Object.fromEntries(formData));
    if (!resultado.success) return { erro: "Selecione o exercício." };
    lancamentoId = (await lancarImovel(imovelId, resultado.data.exercicio, responsavel)).id;
    return {};
  });
  if (!lancamentoId) return estado;

  revalidatePath("/iptu");
  redirect(`/iptu/${lancamentoId}`);
}

export async function cancelarLancamentoAcao(id: string, _estado: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  return executar({ iptu: ["cancelar"] }, async (responsavel) => {
    const resultado = cancelamentoSchema.safeParse(Object.fromEntries(formData));
    if (!resultado.success) {
      const mensagem = resultado.error.issues[0].message;
      return { erro: mensagem, erros: { motivo: mensagem } };
    }
    await cancelarLancamento(id, resultado.data.motivo, responsavel);
    revalidatePath("/iptu");
    // A página volta mostrando o aviso de cancelado; o formulário de cancelamento deixa de aparecer.
    return {};
  });
}
