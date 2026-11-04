"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { EstadoAcao } from "@/components/form/FormAcao";
import { lerDecimalBr } from "@/lib/decimal";
import { MAXIMO_PARCELAS, ParcelamentoInvalidoError } from "@/lib/parcelas";
import { motivoSchema } from "@/lib/schemas/motivo";
import {
  DataPagamentoInvalidaError,
  emitirGuias,
  estornarPagamento,
  GuiaNaoEncontradaError,
  GuiaNaoPagaError,
  GuiaNaoPagavelError,
  GuiasJaEmitidasError,
  LancamentoNaoVigenteError,
  registrarPagamento,
  ValorDivergenteError,
  VencimentoNoPassadoError,
} from "@/server/services/guias";
import { AcessoNegadoError, exigirPermissaoAcao } from "@/server/sessao";

const emissaoSchema = z.object({
  quantidade: z.coerce
    .number({ error: "Escolha a forma de pagamento." })
    .int()
    .min(1, { error: "Escolha a forma de pagamento." })
    .max(MAXIMO_PARCELAS, { error: `Escolha até ${MAXIMO_PARCELAS} parcelas.` }),
  primeiroVencimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Informe a data do primeiro vencimento." }),
});

const pagamentoSchema = z.object({
  dataPagamento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Informe a data do pagamento." }),
  valorPago: z
    .string({ error: "Informe o valor pago." })
    .trim()
    .min(1, { error: "Informe o valor pago." })
    .transform((texto, contexto) => {
      const valor = lerDecimalBr(texto);
      if (valor === null) {
        contexto.addIssue({ code: "custom", message: "Use o formato 1.234,56 (vírgula nos decimais)." });
        return z.NEVER;
      }
      return valor;
    }),
});

const ERROS_CONHECIDOS = [
  AcessoNegadoError,
  LancamentoNaoVigenteError,
  GuiasJaEmitidasError,
  VencimentoNoPassadoError,
  ParcelamentoInvalidoError,
  GuiaNaoEncontradaError,
  GuiaNaoPagavelError,
  ValorDivergenteError,
  DataPagamentoInvalidaError,
  GuiaNaoPagaError,
];

function errosDeCampo(erro: z.ZodError): EstadoAcao {
  const erros: Record<string, string> = {};
  for (const issue of erro.issues) erros[String(issue.path[0])] ??= issue.message;
  return { erro: "Corrija os campos destacados.", erros };
}

export async function registrarPagamentoAcao(guiaId: string, _estado: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  try {
    const responsavel = await exigirPermissaoAcao({ guia: ["baixar"] });
    const resultado = pagamentoSchema.safeParse(Object.fromEntries(formData));
    if (!resultado.success) return errosDeCampo(resultado.error);

    await registrarPagamento(guiaId, resultado.data, responsavel);
    revalidatePath("/guias", "layout");
    revalidatePath("/iptu/[id]", "page");
    return { sucesso: "Pagamento registrado." };
  } catch (erro) {
    if (ERROS_CONHECIDOS.some((tipo) => erro instanceof tipo)) return { erro: (erro as Error).message };
    throw erro;
  }
}

const estornoSchema = motivoSchema("estorno");

export async function estornarPagamentoAcao(guiaId: string, _estado: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  try {
    const responsavel = await exigirPermissaoAcao({ guia: ["estornar"] });
    const resultado = estornoSchema.safeParse(Object.fromEntries(formData));
    if (!resultado.success) {
      const mensagem = resultado.error.issues[0].message;
      return { erro: mensagem, erros: { motivo: mensagem } };
    }

    await estornarPagamento(guiaId, resultado.data.motivo, responsavel);
    revalidatePath("/guias", "layout");
    revalidatePath("/iptu/[id]", "page");
    // A página volta com a guia aberta e o estorno listado; o formulário de estorno deixa de aparecer.
    return {};
  } catch (erro) {
    if (ERROS_CONHECIDOS.some((tipo) => erro instanceof tipo)) return { erro: (erro as Error).message };
    throw erro;
  }
}

export async function emitirGuiasAcao(lancamentoId: string, _estado: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  try {
    const responsavel = await exigirPermissaoAcao({ guia: ["emitir"] });
    const resultado = emissaoSchema.safeParse(Object.fromEntries(formData));
    if (!resultado.success) return errosDeCampo(resultado.error);

    const guias = await emitirGuias(lancamentoId, resultado.data, responsavel);
    revalidatePath("/iptu/[id]", "page");
    return { sucesso: guias.length === 1 ? "Guia de cota única emitida." : `${guias.length} guias emitidas.` };
  } catch (erro) {
    if (ERROS_CONHECIDOS.some((tipo) => erro instanceof tipo)) return { erro: (erro as Error).message };
    throw erro;
  }
}
