import { z } from "zod";

/** Motivo obrigatório de ações que desfazem algo (cancelamento, estorno): fica na auditoria. */
export function motivoSchema(acao: string) {
  return z.object({
    motivo: z
      .string({ error: `Informe o motivo do ${acao}.` })
      .trim()
      .min(10, { error: "Descreva o motivo com pelo menos 10 caracteres." })
      .max(300, { error: "Use no máximo 300 caracteres." }),
  });
}
