"use client";

import { useActionState } from "react";
import { criarConta } from "@/app/login/actions";
import { CLASSE_BOTAO_PRIMARIO, CLASSE_CAMPO } from "@/components/form/estilos";

type CampoProps = {
  nome: "nome" | "email" | "senha" | "confirmacao";
  rotulo: string;
  tipo: "text" | "email" | "password";
  autoComplete: string;
  valorInicial?: string;
  erro?: string;
  dica?: string;
};

function CampoConta({ nome, rotulo, tipo, autoComplete, valorInicial, erro, dica }: CampoProps) {
  const descricao = [erro && `${nome}-erro`, dica && `${nome}-dica`].filter(Boolean).join(" ") || undefined;
  return (
    <div>
      <label htmlFor={nome} className="block text-sm font-medium">
        {rotulo}
      </label>
      <input
        id={nome}
        name={nome}
        type={tipo}
        autoComplete={autoComplete}
        defaultValue={valorInicial}
        maxLength={nome === "senha" || nome === "confirmacao" ? 128 : 150}
        required
        aria-invalid={erro ? true : undefined}
        aria-describedby={descricao}
        className={CLASSE_CAMPO}
      />
      {dica && !erro && (
        <p id={`${nome}-dica`} className="mt-1 text-xs text-zinc-500">
          {dica}
        </p>
      )}
      {erro && (
        <p id={`${nome}-erro`} className="mt-1 text-sm text-red-600 dark:text-red-400">
          {erro}
        </p>
      )}
    </div>
  );
}

export function FormCriarConta({ destino }: { destino: string }) {
  const [estado, enviar, pendente] = useActionState(criarConta, {});
  const erros = estado.erros ?? {};

  return (
    // noValidate: as regras de verdade (e as mensagens em português) vêm do servidor.
    <form action={enviar} noValidate className="space-y-4">
      <input type="hidden" name="destino" value={destino} />
      {estado.erro && (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
        >
          {estado.erro}
        </p>
      )}
      {/* O formulário é limpo depois de cada envio; o servidor devolve o nome e o e-mail para não precisar redigitar. */}
      <CampoConta nome="nome" rotulo="Nome completo" tipo="text" autoComplete="name" valorInicial={estado.valores?.nome} erro={erros.nome} />
      <CampoConta nome="email" rotulo="E-mail" tipo="email" autoComplete="email" valorInicial={estado.valores?.email} erro={erros.email} />
      <CampoConta
        nome="senha"
        rotulo="Senha"
        tipo="password"
        autoComplete="new-password"
        erro={erros.senha}
        dica="De 10 a 128 caracteres. Uma frase curta é mais fácil de lembrar e difícil de adivinhar."
      />
      <CampoConta nome="confirmacao" rotulo="Repita a senha" tipo="password" autoComplete="new-password" erro={erros.confirmacao} />
      <button type="submit" disabled={pendente} className={`${CLASSE_BOTAO_PRIMARIO} w-full`}>
        {pendente ? "Criando a conta…" : "Criar conta e entrar"}
      </button>
    </form>
  );
}
