import "server-only";
import { Prisma, type TipoPessoa } from "@/generated/prisma/client";
import { limparDocumento } from "@/lib/documento";
import { calcularPaginacao } from "@/lib/paginacao";
import type { ContribuinteDados } from "@/lib/schemas/contribuinte";
import { CONTRIBUINTES_POR_PAGINA } from "@/lib/schemas/filtros-contribuintes";
import { ehUuid } from "@/lib/uuid";
import { prisma } from "@/server/db";
import { registrarAuditoria } from "@/server/services/auditoria";
import type { UsuarioLogado } from "@/server/sessao";

const ENTIDADE = "Contribuinte";

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

export class ContribuintePossuiImoveisError extends Error {
  constructor(quantidade: number) {
    super(
      `Este contribuinte é proprietário de ${quantidade} ${quantidade === 1 ? "imóvel" : "imóveis"}. ` +
        "Transfira ou exclua os imóveis antes de excluí-lo.",
    );
    this.name = "ContribuintePossuiImoveisError";
  }
}

// O documento é único no banco, inclusive entre contribuintes excluídos.
function traduzirErro(erro: unknown): never {
  if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002") {
    throw new DocumentoJaCadastradoError();
  }
  throw erro;
}

type OpcoesListagem = {
  busca?: string;
  tipo?: TipoPessoa;
  pagina?: number;
  porPagina?: number;
};

export async function listarContribuintes(opcoes: OpcoesListagem = {}) {
  const { busca = "", tipo, pagina = 1, porPagina = CONTRIBUINTES_POR_PAGINA } = opcoes;

  const where: Prisma.ContribuinteWhereInput = { excluidoEm: null };
  if (tipo) where.tipoPessoa = tipo;
  if (busca) {
    // O mesmo termo procura no nome e no documento (este, sem a pontuação digitada).
    const documento = limparDocumento(busca);
    // O Prisma não escapa os curingas do LIKE: sem isso, buscar "%" ou "_" traria todos.
    const nome = busca.replace(/[\\%_]/g, "\\$&");
    where.OR = [
      { nome: { contains: nome, mode: "insensitive" } },
      ...(documento ? [{ documento: { contains: documento } }] : []),
    ];
  }

  // Conta antes de buscar: uma página além da última é ajustada para a última.
  const total = await prisma.contribuinte.count({ where });
  const paginacao = calcularPaginacao(total, pagina, porPagina);
  const itens = await prisma.contribuinte.findMany({
    where,
    // O id desempata nomes iguais, para a ordem não variar entre páginas.
    orderBy: [{ nome: "asc" }, { id: "asc" }],
    skip: paginacao.pular,
    take: porPagina,
  });

  return { itens, paginacao };
}

export async function buscarContribuinte(id: string) {
  if (!ehUuid(id)) return null;
  return prisma.contribuinte.findFirst({ where: { id, excluidoEm: null } });
}

export async function criarContribuinte(dados: ContribuinteDados, responsavel: UsuarioLogado) {
  try {
    return await prisma.$transaction(async (tx) => {
      const contribuinte = await tx.contribuinte.create({ data: dados });
      await registrarAuditoria(tx, {
        entidade: ENTIDADE,
        entidadeId: contribuinte.id,
        acao: "CRIACAO",
        dados: contribuinte,
        responsavel,
      });
      return contribuinte;
    });
  } catch (erro) {
    traduzirErro(erro);
  }
}

export async function atualizarContribuinte(id: string, dados: ContribuinteDados, responsavel: UsuarioLogado) {
  if (!ehUuid(id)) throw new ContribuinteNaoEncontradoError();
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
        responsavel,
      });
      return contribuinte;
    });
  } catch (erro) {
    traduzirErro(erro);
  }
}

/** Exclusão lógica: o registro permanece no banco com `excluidoEm` preenchido. */
export async function excluirContribuinte(id: string, responsavel: UsuarioLogado) {
  if (!ehUuid(id)) throw new ContribuinteNaoEncontradoError();
  return prisma.$transaction(async (tx) => {
    const existente = await tx.contribuinte.findFirst({ where: { id, excluidoEm: null } });
    if (!existente) throw new ContribuinteNaoEncontradoError();

    // Um imóvel ativo não pode ficar sem proprietário ativo.
    const imoveis = await tx.imovel.count({ where: { contribuinteId: id, excluidoEm: null } });
    if (imoveis > 0) throw new ContribuintePossuiImoveisError(imoveis);

    const contribuinte = await tx.contribuinte.update({
      where: { id },
      data: { excluidoEm: new Date() },
    });
    await registrarAuditoria(tx, {
      entidade: ENTIDADE,
      entidadeId: id,
      acao: "EXCLUSAO",
      dados: contribuinte,
      responsavel,
    });
    return contribuinte;
  });
}
