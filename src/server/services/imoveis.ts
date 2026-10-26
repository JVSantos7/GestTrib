import "server-only";
import { Prisma, type UsoImovel } from "@/generated/prisma/client";
import { limparDocumento } from "@/lib/documento";
import { calcularPaginacao } from "@/lib/paginacao";
import { IMOVEIS_POR_PAGINA } from "@/lib/schemas/filtros-imoveis";
import type { ImovelDados } from "@/lib/schemas/imovel";
import { ehUuid } from "@/lib/uuid";
import { prisma } from "@/server/db";
import { registrarAuditoria } from "@/server/services/auditoria";
import type { UsuarioLogado } from "@/server/sessao";

const ENTIDADE = "Imovel";

export class ImovelNaoEncontradoError extends Error {
  constructor() {
    super("Imóvel não encontrado.");
    this.name = "ImovelNaoEncontradoError";
  }
}

export class InscricaoJaCadastradaError extends Error {
  constructor() {
    super("Já existe um imóvel cadastrado com esta inscrição.");
    this.name = "InscricaoJaCadastradaError";
  }
}

export class ProprietarioNaoEncontradoError extends Error {
  constructor() {
    super("Nenhum contribuinte ativo cadastrado com este CPF/CNPJ.");
    this.name = "ProprietarioNaoEncontradoError";
  }
}

// A inscrição é única no banco, inclusive entre imóveis excluídos.
function traduzirErro(erro: unknown): never {
  if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002") {
    throw new InscricaoJaCadastradaError();
  }
  throw erro;
}

const PROPRIETARIO = { select: { id: true, nome: true, documento: true, tipoPessoa: true } };

/** Troca o CPF/CNPJ digitado pelo id do contribuinte, dentro da mesma transação da escrita. */
async function montarDados(tx: Prisma.TransactionClient, dados: ImovelDados) {
  const { documentoProprietario, ...imovel } = dados;
  const proprietario = await tx.contribuinte.findFirst({
    where: { documento: documentoProprietario, excluidoEm: null },
    select: { id: true },
  });
  if (!proprietario) throw new ProprietarioNaoEncontradoError();
  return { ...imovel, contribuinteId: proprietario.id };
}

type OpcoesListagem = {
  busca?: string;
  uso?: UsoImovel;
  pagina?: number;
  porPagina?: number;
};

export async function listarImoveis(opcoes: OpcoesListagem = {}) {
  const { busca = "", uso, pagina = 1, porPagina = IMOVEIS_POR_PAGINA } = opcoes;

  const where: Prisma.ImovelWhereInput = { excluidoEm: null };
  if (uso) where.uso = uso;
  if (busca) {
    // O mesmo termo procura na inscrição, no endereço e no proprietário (nome ou documento).
    // O Prisma não escapa os curingas do LIKE: sem isso, buscar "%" ou "_" traria todos.
    const texto = busca.replace(/[\\%_]/g, "\\$&");
    const digitos = busca.replace(/\D/g, "");
    const documento = limparDocumento(busca);
    where.OR = [
      { logradouro: { contains: texto, mode: "insensitive" } },
      { bairro: { contains: texto, mode: "insensitive" } },
      { contribuinte: { nome: { contains: texto, mode: "insensitive" } } },
      ...(digitos ? [{ inscricao: { contains: digitos } }] : []),
      ...(documento ? [{ contribuinte: { documento: { contains: documento } } }] : []),
    ];
  }

  // Conta antes de buscar: uma página além da última é ajustada para a última.
  const total = await prisma.imovel.count({ where });
  const paginacao = calcularPaginacao(total, pagina, porPagina);
  const itens = await prisma.imovel.findMany({
    where,
    include: { contribuinte: PROPRIETARIO },
    orderBy: { inscricao: "asc" },
    skip: paginacao.pular,
    take: porPagina,
  });

  return { itens, paginacao };
}

/** Imóveis ativos de um contribuinte, para a página de detalhes dele. */
export async function listarImoveisDoContribuinte(contribuinteId: string) {
  if (!ehUuid(contribuinteId)) return [];
  return prisma.imovel.findMany({
    where: { contribuinteId, excluidoEm: null },
    orderBy: { inscricao: "asc" },
  });
}

export async function buscarImovel(id: string) {
  if (!ehUuid(id)) return null;
  return prisma.imovel.findFirst({
    where: { id, excluidoEm: null },
    include: { contribuinte: PROPRIETARIO },
  });
}

export async function criarImovel(dados: ImovelDados, responsavel: UsuarioLogado) {
  try {
    return await prisma.$transaction(async (tx) => {
      const imovel = await tx.imovel.create({ data: await montarDados(tx, dados) });
      await registrarAuditoria(tx, {
        entidade: ENTIDADE,
        entidadeId: imovel.id,
        acao: "CRIACAO",
        dados: imovel,
        responsavel,
      });
      return imovel;
    });
  } catch (erro) {
    traduzirErro(erro);
  }
}

/** Também é como se transfere o imóvel: basta informar o documento do novo proprietário. */
export async function atualizarImovel(id: string, dados: ImovelDados, responsavel: UsuarioLogado) {
  if (!ehUuid(id)) throw new ImovelNaoEncontradoError();
  try {
    return await prisma.$transaction(async (tx) => {
      const existente = await tx.imovel.findFirst({ where: { id, excluidoEm: null } });
      if (!existente) throw new ImovelNaoEncontradoError();

      const imovel = await tx.imovel.update({ where: { id }, data: await montarDados(tx, dados) });
      await registrarAuditoria(tx, {
        entidade: ENTIDADE,
        entidadeId: id,
        acao: "ALTERACAO",
        dados: imovel,
        responsavel,
      });
      return imovel;
    });
  } catch (erro) {
    traduzirErro(erro);
  }
}

/** Exclusão lógica: o registro permanece no banco com `excluidoEm` preenchido. */
export async function excluirImovel(id: string, responsavel: UsuarioLogado) {
  if (!ehUuid(id)) throw new ImovelNaoEncontradoError();
  return prisma.$transaction(async (tx) => {
    const existente = await tx.imovel.findFirst({ where: { id, excluidoEm: null } });
    if (!existente) throw new ImovelNaoEncontradoError();

    const imovel = await tx.imovel.update({ where: { id }, data: { excluidoEm: new Date() } });
    await registrarAuditoria(tx, {
      entidade: ENTIDADE,
      entidadeId: id,
      acao: "EXCLUSAO",
      dados: imovel,
      responsavel,
    });
    return imovel;
  });
}
