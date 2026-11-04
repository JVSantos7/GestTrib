"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { EstadoAcao } from "@/components/form/FormAcao";
import { MAXIMO_PARCELAS, ParcelamentoInvalidoError } from "@/lib/parcelas";
import {
  emitirGuias,
  GuiasJaEmitidasError,
  LancamentoNaoVigenteError,
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

const ERROS_CONHECIDOS = [
  AcessoNegadoError,
  LancamentoNaoVigenteError,
  GuiasJaEmitidasError,
  VencimentoNoPassadoError,
  ParcelamentoInvalidoError,
];

export async function emitirGuiasAcao(lancamentoId: string, _estado: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  try {
    const responsavel = await exigirPermissaoAcao({ guia: ["emitir"] });
    const resultado = emissaoSchema.safeParse(Object.fromEntries(formData));
    if (!resultado.success) {
      const erros: Record<string, string> = {};
      for (const issue of resultado.error.issues) erros[String(issue.path[0])] ??= issue.message;
      return { erro: "Corrija os campos destacados.", erros };
    }

    const guias = await emitirGuias(lancamentoId, resultado.data, responsavel);
    revalidatePath("/iptu/[id]", "page");
    return { sucesso: guias.length === 1 ? "Guia de cota única emitida." : `${guias.length} guias emitidas.` };
  } catch (erro) {
    if (ERROS_CONHECIDOS.some((tipo) => erro instanceof tipo)) return { erro: (erro as Error).message };
    throw erro;
  }
}
