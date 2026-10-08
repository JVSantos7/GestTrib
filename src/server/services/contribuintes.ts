import "server-only";
import { Prisma } from "@/generated/prisma/client";
import type { ContribuinteDados } from "@/lib/schemas/contribuinte";
import { prisma } from "@/server/db";
import { registrarAuditoria } from "@/server/services/auditoria";

const ENTIDADE = "Contribuinte";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class ContribuinteNaoEncontradoError extends Error {
  constructor() {
    super("Contribuinte não encontrado.");
    this.name = "ContribuinteNaoEncontradoError";
  }
}

export class DocumentoJaCadastradoError extends Error {
  constructor() {
    super("Já existe um contribuinte cadastrado com este documento.");
    this.name = "DocumentoJaCadastradoError";
  }
}

// O documento é único no banco, inclusive entre contribuintes excluídos.
function traduzirErro(erro: unknown): never {
  if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002") {
    throw new DocumentoJaCadastradoError();
  }
  throw erro;
}

export function listarContribuintes() {
  return prisma.contribuinte.findMany({
    where: { excluidoEm: null },
    orderBy: { nome: "asc" },
  });
}

export async function buscarContribuinte(id: string) {
  // Um id fora do formato UUID faria o banco rejeitar a consulta.
  if (!UUID.test(id)) return null;
  return prisma.contribuinte.findFirst({ where: { id, excluidoEm: null } });
}

export async function criarContribuinte(dados: ContribuinteDados) {
  try {
    return await prisma.$transaction(async (tx) => {
      const contribuinte = await tx.contribuinte.create({ data: dados });
      await registrarAuditoria(tx, {
        entidade: ENTIDADE,
        entidadeId: contribuinte.id,
        acao: "CRIACAO",
        dados: contribuinte,
      });
      return contribuinte;
    });
  } catch (erro) {
    traduzirErro(erro);
  }
}

export async function atualizarContribuinte(id: string, dados: ContribuinteDados) {
  if (!UUID.test(id)) throw new ContribuinteNaoEncontradoError();
  try {
    return await prisma.$transaction(async (tx) => {
      const existente = await tx.contribuinte.findFirst({ where: { id, excluidoEm: null } });
      if (!existente) throw new ContribuinteNaoEncontradoError();

      const contribuinte = await tx.contribuinte.update({ where: { id }, data: dados });
      await registrarAuditoria(tx, {
        entidade: ENTIDADE,
        entidadeId: id,
        acao: "ALTERACAO",
        dados: contribuinte,
      });
      return contribuinte;
    });
  } catch (erro) {
    traduzirErro(erro);
  }
}

/** Exclusão lógica: o registro permanece no banco com `excluidoEm` preenchido. */
export async function excluirContribuinte(id: string) {
  if (!UUID.test(id)) throw new ContribuinteNaoEncontradoError();
  return prisma.$transaction(async (tx) => {
    const existente = await tx.contribuinte.findFirst({ where: { id, excluidoEm: null } });
    if (!existente) throw new ContribuinteNaoEncontradoError();

    const contribuinte = await tx.contribuinte.update({
      where: { id },
      data: { excluidoEm: new Date() },
    });
    await registrarAuditoria(tx, {
      entidade: ENTIDADE,
      entidadeId: id,
      acao: "EXCLUSAO",
      dados: contribuinte,
    });
    return contribuinte;
  });
}
