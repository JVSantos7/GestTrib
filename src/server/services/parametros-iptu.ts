import "server-only";
import { Prisma } from "@/generated/prisma/client";
import type { ParametrosIptuDados } from "@/lib/schemas/parametros-iptu";
import { prisma } from "@/server/db";
import { registrarAuditoria } from "@/server/services/auditoria";
import type { UsuarioLogado } from "@/server/sessao";

const ENTIDADE = "ParametroIptu";

export class ParametrosNaoEncontradosError extends Error {
  constructor() {
    super("Parâmetros do exercício não encontrados.");
    this.name = "ParametrosNaoEncontradosError";
  }
}

export class ExercicioJaCadastradoError extends Error {
  constructor() {
    super("Este exercício já tem parâmetros cadastrados.");
    this.name = "ExercicioJaCadastradoError";
  }
}

export class SetorSemValorError extends Error {
  constructor(setores: string[]) {
    super(`Informe o valor do m² do terreno para ${setores.length === 1 ? "o setor" : "os setores"} ${setores.join(", ")}.`);
    this.name = "SetorSemValorError";
  }
}

const COM_TERRENOS = { valoresTerreno: { orderBy: { setor: "asc" } } } as const;

export function listarParametros() {
  return prisma.parametroIptu.findMany({ orderBy: { exercicio: "desc" } });
}

export function buscarParametros(exercicio: number) {
  // Fora da faixa aceita no cadastro não existe; e evita estourar a coluna smallint com "/99999".
  if (!Number.isInteger(exercicio) || exercicio < 2000 || exercicio > 2100) return null;
  return prisma.parametroIptu.findUnique({ where: { exercicio }, include: COM_TERRENOS });
}

/** O exercício mais recente, usado para pré-preencher o próximo. */
export function buscarUltimosParametros() {
  return prisma.parametroIptu.findFirst({ orderBy: { exercicio: "desc" }, include: COM_TERRENOS });
}

export type SetorComImoveis = { setor: string; bairros: string; imoveis: number };

/**
 * Setores que têm imóveis ativos, com os bairros de cada um (para orientar quem preenche).
 * `$queryRaw` com template: os valores viram parâmetros da consulta, nunca texto colado no SQL.
 */
export function listarSetoresComImoveis(): Promise<SetorComImoveis[]> {
  return prisma.$queryRaw<SetorComImoveis[]>`
    SELECT substring(inscricao, 1, 2) AS setor,
           string_agg(DISTINCT bairro, ', ' ORDER BY bairro) AS bairros,
           count(*)::int AS imoveis
      FROM imoveis
     WHERE excluido_em IS NULL
     GROUP BY 1
     ORDER BY 1`;
}

/** Todo setor com imóvel precisa de valor; senão o lançamento do IPTU não teria como calcular. */
async function garantirTodosOsSetores(tx: Prisma.TransactionClient, dados: ParametrosIptuDados) {
  const setores = await tx.$queryRaw<{ setor: string }[]>`
    SELECT DISTINCT substring(inscricao, 1, 2) AS setor FROM imoveis WHERE excluido_em IS NULL ORDER BY 1`;
  const faltando = setores.map((s) => s.setor).filter((setor) => !(setor in dados.terrenos));
  if (faltando.length > 0) throw new SetorSemValorError(faltando);
}

function separar(dados: ParametrosIptuDados) {
  const { exercicio, terrenos, ...valores } = dados;
  const valoresTerreno = Object.entries(terrenos).map(([setor, valor]) => ({ setor, valor }));
  return { exercicio, valores, valoresTerreno };
}

export async function criarParametros(dados: ParametrosIptuDados, responsavel: UsuarioLogado) {
  const { exercicio, valores, valoresTerreno } = separar(dados);
  try {
    return await prisma.$transaction(async (tx) => {
      await garantirTodosOsSetores(tx, dados);
      const parametros = await tx.parametroIptu.create({
        data: { exercicio, ...valores, valoresTerreno: { create: valoresTerreno } },
        include: COM_TERRENOS,
      });
      await registrarAuditoria(tx, { entidade: ENTIDADE, entidadeId: parametros.id, acao: "CRIACAO", dados: parametros, responsavel });
      return parametros;
    });
  } catch (erro) {
    if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002") throw new ExercicioJaCadastradoError();
    throw erro;
  }
}

/** O exercício é a identidade do registro e não muda; os valores dos setores são substituídos pelos novos. */
export async function atualizarParametros(exercicio: number, dados: ParametrosIptuDados, responsavel: UsuarioLogado) {
  const { valores, valoresTerreno } = separar(dados);
  return prisma.$transaction(async (tx) => {
    const existente = await tx.parametroIptu.findUnique({ where: { exercicio } });
    if (!existente) throw new ParametrosNaoEncontradosError();
    await garantirTodosOsSetores(tx, dados);

    await tx.valorM2Terreno.deleteMany({ where: { parametroId: existente.id } });
    const parametros = await tx.parametroIptu.update({
      where: { id: existente.id },
      data: { ...valores, valoresTerreno: { create: valoresTerreno } },
      include: COM_TERRENOS,
    });
    await registrarAuditoria(tx, { entidade: ENTIDADE, entidadeId: parametros.id, acao: "ALTERACAO", dados: parametros, responsavel });
    return parametros;
  });
}
