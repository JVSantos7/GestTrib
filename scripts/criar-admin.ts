// Cria um usuário Administrador pelo terminal: `npm run criar-admin`.
// A senha é digitada aqui (sem aparecer na tela) e vai para o banco só como hash.
import "dotenv/config";
import { createInterface } from "node:readline";
import { z } from "zod";
import { auth } from "@/server/auth";
import { prisma } from "@/server/db";

const terminal = createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: Boolean(process.stdin.isTTY),
});

// Enquanto `oculto` estiver ligado, o que a pessoa digita não é ecoado na tela.
let oculto = false;
const saida = terminal as unknown as { _writeToOutput: (texto: string) => void };
const escreverOriginal = saida._writeToOutput.bind(terminal);
saida._writeToOutput = (texto) => {
  if (!oculto || texto.includes("\n")) escreverOriginal(texto);
};

// Lê linha a linha; o iterador guarda as linhas que chegarem antes da pergunta.
const linhas = terminal[Symbol.asyncIterator]();

async function perguntar(pergunta: string, esconder = false): Promise<string> {
  process.stdout.write(pergunta);
  oculto = esconder;
  const { value } = await linhas.next();
  oculto = false;
  if (esconder) process.stdout.write("\n");
  return String(value ?? "").trim();
}

const dadosSchema = z
  .object({
    nome: z.string().min(3, { error: "Nome com pelo menos 3 caracteres." }),
    email: z.email({ error: "E-mail inválido." }),
    senha: z
      .string()
      .min(10, { error: "A senha precisa ter pelo menos 10 caracteres." })
      .max(128, { error: "A senha pode ter no máximo 128 caracteres." }),
    confirmacao: z.string(),
  })
  .refine((dados) => dados.senha === dados.confirmacao, {
    error: "As senhas não conferem.",
    path: ["confirmacao"],
  });

async function main() {
  console.log("Criar usuário administrador do GestTrib\n");
  const resultado = dadosSchema.safeParse({
    nome: await perguntar("Nome: "),
    email: (await perguntar("E-mail: ")).toLowerCase(),
    senha: await perguntar("Senha (não aparece ao digitar): ", true),
    confirmacao: await perguntar("Repita a senha: ", true),
  });

  if (!resultado.success) {
    for (const issue of resultado.error.issues) console.error(`✗ ${issue.message}`);
    process.exitCode = 1;
    return;
  }

  const { nome, email, senha } = resultado.data;
  if (await prisma.user.findUnique({ where: { email } })) {
    console.error(`✗ Já existe um usuário com o e-mail ${email}.`);
    process.exitCode = 1;
    return;
  }

  await auth.api.createUser({ body: { name: nome, email, password: senha, role: "administrador" } });
  console.log(`\n✓ Administrador ${email} criado. Entre em http://localhost:3000/login`);
}

main()
  .catch((erro) => {
    console.error("✗ Não foi possível criar o usuário:", erro instanceof Error ? erro.message : erro);
    process.exitCode = 1;
  })
  .finally(async () => {
    terminal.close();
    await prisma.$disconnect();
  });
