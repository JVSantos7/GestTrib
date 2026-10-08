import "server-only";
import type { AcaoAuditoria, Prisma } from "@/generated/prisma/client";

type NovoRegistro = {
  entidade: string;
  entidadeId: string;
  acao: AcaoAuditoria;
  /** Retrato do registro após a ação. */
  dados: object;
};

/**
 * Grava o registro de auditoria. Recebe o client da transação para que a
 * auditoria seja confirmada ou desfeita junto com a alteração que ela descreve.
 */
export async function registrarAuditoria(tx: Prisma.TransactionClient, registro: NovoRegistro) {
  await tx.registroAuditoria.create({
    data: {
      entidade: registro.entidade,
      entidadeId: registro.entidadeId,
      acao: registro.acao,
      // Converte datas em texto ISO; a coluna JSON não aceita Date.
      dados: JSON.parse(JSON.stringify(registro.dados)) as Prisma.InputJsonValue,
    },
  });
}
