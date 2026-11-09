"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { CLASSE_BOTAO_PRIMARIO, CLASSE_CAMPO } from "@/components/form/estilos";
import { authCliente } from "@/lib/auth-cliente";

type ErroLogin = { status: number; code?: string; message?: string };

function mensagemDeErro(erro: ErroLogin): string {
  if (erro.status === 429) return "Muitas tentativas. Aguarde um minuto e tente de novo.";
  // Usuário desativado: a mensagem vem da configuração do servidor (bannedUserMessage).
  if (erro.code === "BANNED_USER" && erro.message) return erro.message;
  // De propósito, não diz se o erro foi no e-mail ou na senha: isso ajudaria quem tenta adivinhar.
  return "E-mail ou senha incorretos.";
}

export function FormLogin({ destino }: { destino: string }) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, setPendente] = useState(false);
  const [senhaVisivel, setSenhaVisivel] = useState(false);

  async function entrar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    setPendente(true);
    setErro(null);

    const { error } = await authCliente.signIn.email({
      email: String(dados.get("email") ?? "").trim(),
      password: String(dados.get("senha") ?? ""),
    });

    if (error) {
      setErro(mensagemDeErro(error));
      setPendente(false);
      return;
    }
    // O cookie de sessão já foi gravado; replace evita voltar ao login pelo botão "voltar".
    router.replace(destino);
    router.refresh();
  }

  return (
    <form onSubmit={entrar} className="mt-4 space-y-4">
      {erro && (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
        >
          {erro}
        </p>
      )}
      <div>
        <label htmlFor="email" className="block text-sm font-medium">
          E-mail
        </label>
        <input id="email" name="email" type="email" autoComplete="username" required className={CLASSE_CAMPO} />
      </div>
      <div>
        <label htmlFor="senha" className="block text-sm font-medium">
          Senha
        </label>
        <div className="relative">
          <input
            id="senha"
            name="senha"
            type={senhaVisivel ? "text" : "password"}
            autoComplete="current-password"
            required
            className={`${CLASSE_CAMPO} pr-20`}
          />
          {/* Ajuda a conferir a senha digitada (útil no celular). type="button" para não enviar o formulário;
              aria-pressed avisa ao leitor de tela se a senha está visível. */}
          <button
            type="button"
            onClick={() => setSenhaVisivel((valor) => !valor)}
            aria-pressed={senhaVisivel}
            aria-controls="senha"
            className="absolute inset-y-0 right-0 mt-1 rounded-r-md px-3 text-xs font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            {senhaVisivel ? "Ocultar" : "Mostrar"}
          </button>
        </div>
      </div>
      <button type="submit" disabled={pendente} className={`${CLASSE_BOTAO_PRIMARIO} w-full`}>
        {pendente ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
