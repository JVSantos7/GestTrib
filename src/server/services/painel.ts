import "server-only";
import { descreverDetalhe } from "@/lib/auditoria";
import { hojeIso } from "@/lib/datas";
import { agruparAtividade, inicioDoMes, somarDias, somarPorMes, ultimosMeses } from "@/lib/painel";
import { calcularPercentual } from "@/lib/relatorios";
import { prisma } from "@/server/db";
import { relatorioArrecadacao, relatorioInadimplencia } from "@/server/services/relatorios";

// Painel de início: só leitura, como os relatórios (sem transação nem auditoria).
// As consultas rodam em paralelo e as somas são feitas no banco.

const dataDoBanco = (iso: string) => new Date(`${iso}T00:00:00Z`);

/** Quantos dias à frente entram em "vence nos próximos dias". */
export const DIAS_A_VENCER = 30;
/** Quantos meses o gráfico de arrecadação mostra. */
const MESES_NO_GRAFICO = 6;

/** Os números do painel: cadastro, IPTU do exercício atual, atraso, vencimentos e arrecadação mensal. */
export async function resumirPainel() {
  const hoje = hojeIso();
  const exercicio = Number(hoje.slice(0, 4));
  const meses = ultimosMeses(hoje, MESES_NO_GRAFICO);
  const lancamentosDoAno = { exercicio, vigente: true } as const;

  const [contribuintes, imoveis, lancado, arrecadado, inadimplencia, aVencer, arrecadacao] = await Promise.all([
    prisma.contribuinte.count({ where: { excluidoEm: null } }),
    prisma.imovel.count({ where: { excluidoEm: null } }),
    prisma.lancamentoIptu.aggregate({ where: lancamentosDoAno, _count: true, _sum: { valorImposto: true } }),
    // Mesmo critério do relatório "Lançamentos por exercício": guias pagas dos lançamentos do ano.
    prisma.guia.aggregate({ where: { situacao: "PAGA", lancamento: lancamentosDoAno }, _sum: { valor: true } }),
    // Mesmo critério do relatório de inadimplência (todas as guias vencidas, de qualquer exercício).
    relatorioInadimplencia({}),
    prisma.guia.aggregate({
      where: {
        situacao: "ABERTA",
        // Hoje entra: no dia do vencimento a guia ainda não está atrasada.
        vencimento: { gte: dataDoBanco(hoje), lte: dataDoBanco(somarDias(hoje, DIAS_A_VENCER)) },
        lancamento: { vigente: true },
      },
      _count: true,
      _sum: { valor: true },
    }),
    relatorioArrecadacao({ de: inicioDoMes(meses[0]), ate: hoje }),
  ]);

  const valorLancado = (lancado._sum.valorImposto ?? 0).toFixed(2);
  const valorArrecadado = (arrecadado._sum.valor ?? 0).toFixed(2);

  return {
    hoje,
    exercicio,
    contribuintes,
    imoveis,
    lancado: { quantidade: lancado._count, valor: valorLancado },
    arrecadado: { valor: valorArrecadado, percentual: calcularPercentual(valorArrecadado, valorLancado) },
    emAtraso: {
      valor: inadimplencia.total,
      devedores: inadimplencia.devedores.length,
      guias: inadimplencia.quantidadeGuias,
    },
    aVencer: { quantidade: aVencer._count, valor: (aVencer._sum.valor ?? 0).toFixed(2), ate: somarDias(hoje, DIAS_A_VENCER) },
    arrecadacaoMensal: somarPorMes(arrecadacao.dias, meses),
  };
}

/**
 * Últimas alterações do sistema, de qualquer módulo, com operações em lote agrupadas.
 * As de usuários (perfil, senha, desativação) só aparecem para quem administra usuários.
 * Como no histórico, o retrato completo (`dados`) não sai daqui: vira só o texto do detalhe.
 */
export async function listarAtividadeRecente({ incluirUsuarios, limite = 8 }: { incluirUsuarios: boolean; limite?: number }) {
  const registros = await prisma.registroAuditoria.findMany({
    where: incluirUsuarios ? {} : { entidade: { not: "Usuario" } },
    select: {
      id: true,
      entidade: true,
      entidadeId: true,
      acao: true,
      dados: true,
      criadoEm: true,
      usuarioId: true,
      usuario: { select: { name: true } },
    },
    orderBy: [{ criadoEm: "desc" }, { id: "desc" }],
    // Folga para os lotes: um lançamento do município inteiro ocupa centenas de registros seguidos.
    take: 500,
  });
  return agruparAtividade(
    registros.map(({ dados, usuario, ...registro }) => ({
      ...registro,
      detalhe: descreverDetalhe(dados),
      responsavel: usuario?.name ?? null,
    })),
    limite,
  );
}
