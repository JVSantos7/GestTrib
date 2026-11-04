import "server-only";
import { calcularValidade, gerarCodigoValidacao, tipoCertidao, type DebitosCertidao } from "@/lib/certidao";
import { dataParaIso } from "@/lib/datas";
import { ehUuid } from "@/lib/uuid";
import { prisma } from "@/server/db";
import { registrarAuditoria } from "@/server/services/auditoria";
import { ContribuinteNaoEncontradoError } from "@/server/services/contribuintes";
import { consultarSituacaoFiscal } from "@/server/services/situacao-fiscal";
import type { UsuarioLogado } from "@/server/sessao";

const ENTIDADE = "Certidao";

/**
 * Emite a certidão com a situação fiscal deste momento. A consulta dos débitos e a gravação
 * acontecem na mesma transação, junto com a auditoria: ou fica tudo registrado, ou nada.
 */
export async function emitirCertidao(contribuinteId: string, responsavel: UsuarioLogado) {
  if (!ehUuid(contribuinteId)) throw new ContribuinteNaoEncontradoError();

  return prisma.$transaction(async (tx) => {
    const contribuinte = await tx.contribuinte.findFirst({ where: { id: contribuinteId, excluidoEm: null } });
    if (!contribuinte) throw new ContribuinteNaoEncontradoError();

    const { hoje, resumo, guias, lancamentosAEmitir } = await consultarSituacaoFiscal(contribuinteId, tx);
    const debitos: DebitosCertidao = {
      resumo,
      guias: guias.map((guia) => ({
        numero: guia.numero,
        exercicio: guia.lancamento.exercicio,
        inscricao: guia.lancamento.inscricao,
        parcela: guia.parcela,
        totalParcelas: guia.totalParcelas,
        vencimento: dataParaIso(guia.vencimento),
        valor: guia.valor.toFixed(2),
      })),
      aEmitir: lancamentosAEmitir.map((lancamento) => ({
        exercicio: lancamento.exercicio,
        inscricao: lancamento.inscricao,
        valor: lancamento.valorImposto.toFixed(2),
      })),
    };

    const certidao = await tx.certidao.create({
      data: {
        ano: Number(hoje.slice(0, 4)),
        codigo: gerarCodigoValidacao(),
        tipo: tipoCertidao(resumo.situacao),
        contribuinteId,
        nome: contribuinte.nome,
        documento: contribuinte.documento,
        debitos,
        validaAte: new Date(`${calcularValidade(hoje)}T00:00:00Z`),
      },
    });
    await registrarAuditoria(tx, { entidade: ENTIDADE, entidadeId: certidao.id, acao: "CRIACAO", dados: certidao, responsavel });
    return certidao;
  });
}

function comDebitos<T extends { debitos: unknown }>(certidao: T | null) {
  // A coluna JSON chega sem tipo; quem a grava é só `emitirCertidao`, com o formato acima.
  return certidao && { ...certidao, debitos: certidao.debitos as DebitosCertidao };
}

export async function buscarCertidao(id: string) {
  if (!ehUuid(id)) return null;
  return comDebitos(await prisma.certidao.findUnique({ where: { id } }));
}

/** Para a validação pública: recebe o código já normalizado ("ABCD-EFGH-JKLM-NPQR"). */
export function buscarCertidaoPorCodigo(codigo: string) {
  return prisma.certidao.findUnique({
    where: { codigo },
    // Só o necessário para conferir a autenticidade; os débitos não saem na consulta pública.
    select: { numero: true, ano: true, tipo: true, nome: true, documento: true, emitidaEm: true, validaAte: true },
  });
}

/** Últimas certidões do contribuinte, da mais recente para a mais antiga. */
export function listarCertidoesDoContribuinte(contribuinteId: string, limite = 10) {
  if (!ehUuid(contribuinteId)) return Promise.resolve([]);
  return prisma.certidao.findMany({
    where: { contribuinteId },
    select: { id: true, numero: true, ano: true, tipo: true, emitidaEm: true, validaAte: true },
    orderBy: { emitidaEm: "desc" },
    take: limite,
  });
}
