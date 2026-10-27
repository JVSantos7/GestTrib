import "server-only";
import type { AcaoAuditoria, Prisma } from "@/generated/prisma/client";
import { descreverDetalhe } from "@/lib/auditoria";
import { ehUuid } from "@/lib/uuid";
import { prisma } from "@/server/db";
import type { UsuarioLogado } from "@/server/sessao";

type NovoRegistro = {
  entidade: string;
  entidadeId: string;
  acao: AcaoAuditoria;
  /** Retrato do registro após a ação. */
  dados: object;
  /** Obrigatório: nenhuma alteração entra no histórico sem dizer quem a fez. */
  responsavel: UsuarioLogado;
};

/**
 * Grava o registro de auditoria. Recebe o client da transação para que a
 * auditoria seja confirmada ou desfeita junto com a alteração que ela descreve.
 */
export async function registrarAuditoria(tx: Prisma.TransactionClient, registro: NovoRegistro) {
  await tx.registroAuditoria.create({ data: paraGravar(registro) });
}

/** Vários registros num só comando ao banco (ex.: lançamento do IPTU de todos os imóveis). */
export async function registrarAuditorias(tx: Prisma.TransactionClient, registros: NovoRegistro[]) {
  await tx.registroAuditoria.createMany({ data: registros.map(paraGravar) });
}

function paraGravar(registro: NovoRegistro) {
  return {
    entidade: registro.entidade,
    entidadeId: registro.entidadeId,
    acao: registro.acao,
    usuarioId: registro.responsavel.id,
    // Converte datas em texto ISO; a coluna JSON não aceita Date.
    dados: JSON.parse(JSON.stringify(registro.dados)) as Prisma.InputJsonValue,
  };
}

/**
 * Histórico de um registro, do mais recente para o mais antigo. Devolve só quem, quando e o quê:
 * o retrato completo (`dados`) fica no banco e não vai para a tela, para não espalhar CPF e endereço.
 */
export async function listarHistorico(entidade: string, entidadeId: string, limite = 20) {
  if (!ehUuid(entidadeId)) return [];
  const registros = await prisma.registroAuditoria.findMany({
    where: { entidade, entidadeId },
    select: { id: true, acao: true, criadoEm: true, dados: true, usuario: { select: { name: true } } },
    orderBy: [{ criadoEm: "desc" }, { id: "desc" }],
    take: limite,
  });
  return registros.map((registro) => ({
    id: registro.id,
    acao: registro.acao,
    criadoEm: registro.criadoEm,
    responsavel: registro.usuario?.name ?? null,
    detalhe: descreverDetalhe(registro.dados),
  }));
}
