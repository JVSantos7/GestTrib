import "server-only";
import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import type { Perfil } from "@/lib/permissoes";
import type { NovoUsuario } from "@/lib/schemas/usuario";
import { ehUuid } from "@/lib/uuid";
import { auth } from "@/server/auth";
import { prisma } from "@/server/db";
import { registrarAuditoria } from "@/server/services/auditoria";
import type { UsuarioLogado } from "@/server/sessao";

const ENTIDADE = "Usuario";

export class UsuarioNaoEncontradoError extends Error {
  constructor() {
    super("Usuário não encontrado.");
    this.name = "UsuarioNaoEncontradoError";
  }
}

export class EmailJaCadastradoError extends Error {
  constructor() {
    super("Já existe um usuário com este e-mail.");
    this.name = "EmailJaCadastradoError";
  }
}

/** Regra de negócio que impede a operação (ex.: desativar o último administrador). */
export class OperacaoNaoPermitidaError extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = "OperacaoNaoPermitidaError";
  }
}

// Só o que as telas precisam. A senha nem está nesta tabela (fica, como hash, em "contas").
const CAMPOS_PUBLICOS = {
  id: true,
  name: true,
  email: true,
  role: true,
  banned: true,
  createdAt: true,
  updatedAt: true,
} as const;

export function listarUsuarios() {
  return prisma.user.findMany({ select: CAMPOS_PUBLICOS, orderBy: [{ name: "asc" }, { id: "asc" }] });
}

export async function buscarUsuario(id: string) {
  if (!ehUuid(id)) return null;
  return prisma.user.findUnique({ where: { id }, select: CAMPOS_PUBLICOS });
}

async function exigirUsuario(id: string) {
  const usuario = await buscarUsuario(id);
  if (!usuario) throw new UsuarioNaoEncontradoError();
  return usuario;
}

/** Sem pelo menos um administrador ativo, ninguém mais conseguiria gerenciar usuários. */
async function garantirOutroAdministrador(id: string) {
  const outros = await prisma.user.count({
    where: { role: "administrador", banned: { not: true }, id: { not: id } },
  });
  if (outros === 0) {
    throw new OperacaoNaoPermitidaError("Este é o único administrador ativo. Promova outro usuário antes.");
  }
}

function garantirQueNaoEhVoceMesmo(id: string, responsavel: UsuarioLogado, mensagem: string) {
  if (id === responsavel.id) {
    throw new OperacaoNaoPermitidaError(`${mensagem} Peça a outro administrador.`);
  }
}

/**
 * A alteração é feita pela biblioteca (que também confere a permissão de quem pede, pela sessão
 * nos headers) e a auditoria é gravada logo depois. Não dá para pôr as duas na mesma transação,
 * porque a biblioteca usa as conexões dela; se a auditoria falhar, o erro aparece para o usuário.
 */
async function auditar(entidadeId: string, acao: "CRIACAO" | "ALTERACAO", responsavel: UsuarioLogado, dados: object) {
  await prisma.$transaction((tx) => registrarAuditoria(tx, { entidade: ENTIDADE, entidadeId, acao, dados, responsavel }));
}

export async function criarUsuario(dados: NovoUsuario, responsavel: UsuarioLogado) {
  try {
    const { user } = await auth.api.createUser({
      body: { name: dados.nome, email: dados.email, password: dados.senha, role: dados.perfil as Perfil },
      headers: await headers(),
    });
    await auditar(user.id, "CRIACAO", responsavel, { nome: dados.nome, email: dados.email, perfil: dados.perfil });
    return user;
  } catch (erro) {
    if (erro instanceof APIError && erro.body?.code?.startsWith("USER_ALREADY_EXISTS")) {
      throw new EmailJaCadastradoError();
    }
    throw erro;
  }
}

export async function alterarPerfil(id: string, perfil: Perfil, responsavel: UsuarioLogado) {
  const usuario = await exigirUsuario(id);
  garantirQueNaoEhVoceMesmo(id, responsavel, "Você não pode alterar o seu próprio perfil.");
  if (usuario.role === "administrador" && perfil !== "administrador") await garantirOutroAdministrador(id);

  await auth.api.setRole({ body: { userId: id, role: perfil }, headers: await headers() });
  await auditar(id, "ALTERACAO", responsavel, { campo: "perfil", de: usuario.role, para: perfil });
}

export async function desativarUsuario(id: string, responsavel: UsuarioLogado) {
  const usuario = await exigirUsuario(id);
  garantirQueNaoEhVoceMesmo(id, responsavel, "Você não pode desativar a sua própria conta.");
  if (usuario.role === "administrador") await garantirOutroAdministrador(id);

  // A biblioteca marca o usuário como bloqueado e apaga as sessões dele: quem estava logado cai na hora.
  await auth.api.banUser({ body: { userId: id, banReason: "Desativado pelo administrador" }, headers: await headers() });
  await auditar(id, "ALTERACAO", responsavel, { campo: "situacao", para: "desativado" });
}

export async function reativarUsuario(id: string, responsavel: UsuarioLogado) {
  await exigirUsuario(id);
  await auth.api.unbanUser({ body: { userId: id }, headers: await headers() });
  await auditar(id, "ALTERACAO", responsavel, { campo: "situacao", para: "ativo" });
}

export async function redefinirSenha(id: string, novaSenha: string, responsavel: UsuarioLogado) {
  await exigirUsuario(id);
  const cabecalhos = await headers();
  await auth.api.setUserPassword({ body: { userId: id, newPassword: novaSenha }, headers: cabecalhos });
  // Quem estava logado com a senha antiga precisa entrar de novo (a biblioteca não faz isso sozinha).
  if (id !== responsavel.id) await auth.api.revokeUserSessions({ body: { userId: id }, headers: cabecalhos });
  // Nunca a senha na auditoria: só o fato de que foi trocada.
  await auditar(id, "ALTERACAO", responsavel, { campo: "senha", para: "redefinida" });
}
