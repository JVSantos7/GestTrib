"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { CampoContribuinte, EstadoFormulario } from "@/app/contribuintes/actions";
import { UFS } from "@/lib/schemas/contribuinte";

type Props = {
  acao: (estado: EstadoFormulario, formData: FormData) => Promise<EstadoFormulario>;
  valoresIniciais?: Partial<Record<CampoContribuinte, string>>;
  rotuloEnviar: string;
  hrefCancelar: string;
};

const CLASSE_CAMPO =
  "mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-xs outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 aria-invalid:border-red-500 dark:border-zinc-700 dark:bg-zinc-900";

export function FormContribuinte({ acao, valoresIniciais, rotuloEnviar, hrefCancelar }: Props) {
  const [estado, enviar, pendente] = useActionState(acao, {});
  const valores = estado.valores ?? valoresIniciais ?? {};
  const [tipoPessoa, setTipoPessoa] = useState(valores.tipoPessoa ?? "FISICA");
  const pessoaFisica = tipoPessoa === "FISICA";

  function campo(
    nome: CampoContribuinte,
    rotulo: string,
    opcoes: { obrigatorio?: boolean; tipo?: string; dica?: string; maximo?: number } = {},
  ) {
    const erro = estado.erros?.[nome];
    return (
      <div>
        <label htmlFor={nome} className="block text-sm font-medium">
          {rotulo}
          {opcoes.obrigatorio === false && (
            <span className="ml-1 font-normal text-zinc-500">(opcional)</span>
          )}
        </label>
        <input
          id={nome}
          name={nome}
          type={opcoes.tipo ?? "text"}
          defaultValue={valores[nome] ?? ""}
          placeholder={opcoes.dica}
          maxLength={opcoes.maximo}
          aria-invalid={erro ? true : undefined}
          aria-describedby={erro ? `${nome}-erro` : undefined}
          className={CLASSE_CAMPO}
        />
        {erro && (
          <p id={`${nome}-erro`} className="mt-1 text-sm text-red-600 dark:text-red-400">
            {erro}
          </p>
        )}
      </div>
    );
  }

  return (
    // noValidate: a validação é a do servidor (Zod), com mensagens em português.
    <form action={enviar} noValidate className="max-w-3xl space-y-8">
      {estado.mensagem && (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
        >
          {estado.mensagem}
        </p>
      )}

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-3 text-base font-semibold">Identificação</legend>
        <div>
          <label htmlFor="tipoPessoa" className="block text-sm font-medium">
            Tipo de pessoa
          </label>
          <select
            id="tipoPessoa"
            name="tipoPessoa"
            value={tipoPessoa}
            onChange={(evento) => setTipoPessoa(evento.target.value)}
            className={CLASSE_CAMPO}
          >
            <option value="FISICA">Pessoa física</option>
            <option value="JURIDICA">Pessoa jurídica</option>
          </select>
        </div>
        {campo("documento", pessoaFisica ? "CPF" : "CNPJ", {
          dica: pessoaFisica ? "000.000.000-00" : "00.000.000/0000-00",
          maximo: 18,
        })}
        <div className="sm:col-span-2">
          {campo("nome", pessoaFisica ? "Nome completo" : "Razão social", { maximo: 150 })}
        </div>
        {campo("email", "E-mail", { obrigatorio: false, tipo: "email", maximo: 150 })}
        {campo("telefone", "Telefone", { obrigatorio: false, dica: "(00) 00000-0000", maximo: 16 })}
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-6">
        <legend className="mb-3 text-base font-semibold">Endereço</legend>
        <div className="sm:col-span-2">{campo("cep", "CEP", { dica: "00000-000", maximo: 9 })}</div>
        <div className="sm:col-span-4">{campo("logradouro", "Logradouro", { maximo: 150 })}</div>
        <div className="sm:col-span-2">{campo("numero", "Número", { maximo: 10 })}</div>
        <div className="sm:col-span-4">
          {campo("complemento", "Complemento", { obrigatorio: false, maximo: 60 })}
        </div>
        <div className="sm:col-span-2">{campo("bairro", "Bairro", { maximo: 80 })}</div>
        <div className="sm:col-span-3">{campo("cidade", "Cidade", { maximo: 80 })}</div>
        <div className="sm:col-span-1">
          <label htmlFor="uf" className="block text-sm font-medium">
            UF
          </label>
          <select
            // A key recria o select quando o servidor devolve os valores do envio anterior.
            key={valores.uf ?? ""}
            id="uf"
            name="uf"
            defaultValue={valores.uf ?? ""}
            aria-invalid={estado.erros?.uf ? true : undefined}
            aria-describedby={estado.erros?.uf ? "uf-erro" : undefined}
            className={CLASSE_CAMPO}
          >
            <option value="">—</option>
            {UFS.map((uf) => (
              <option key={uf} value={uf}>
                {uf}
              </option>
            ))}
          </select>
          {estado.erros?.uf && (
            <p id="uf-erro" className="mt-1 text-sm text-red-600 dark:text-red-400">
              {estado.erros.uf}
            </p>
          )}
        </div>
      </fieldset>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pendente}
          className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
        >
          {pendente ? "Salvando…" : rotuloEnviar}
        </button>
        <Link
          href={hrefCancelar}
          className="rounded-md px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
