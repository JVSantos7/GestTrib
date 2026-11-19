"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import {
  consultarCep,
  consultarCnpj,
  type CampoContribuinte,
  type EstadoFormulario,
} from "@/app/(sistema)/contribuintes/actions";
import { Aviso, preencherCampos, useBuscaCep, type AvisoConsulta } from "@/components/form/BuscaCep";
import { CLASSE_CAMPO } from "@/components/form/estilos";
import { UFS } from "@/lib/schemas/contribuinte";

type Props = {
  acao: (estado: EstadoFormulario, formData: FormData) => Promise<EstadoFormulario>;
  valoresIniciais?: Partial<Record<CampoContribuinte, string>>;
  rotuloEnviar: string;
  hrefCancelar: string;
};

export function FormContribuinte({ acao, valoresIniciais, rotuloEnviar, hrefCancelar }: Props) {
  const [estado, enviar, pendente] = useActionState(acao, {});
  const valores = estado.valores ?? valoresIniciais ?? {};
  const [tipoPessoa, setTipoPessoa] = useState(valores.tipoPessoa ?? "FISICA");
  const pessoaFisica = tipoPessoa === "FISICA";

  const buscaCep = useBuscaCep({
    cepInicial: valores.cep,
    consultar: consultarCep,
    campos: ["logradouro", "bairro", "cidade", "uf"],
    mensagem: ({ logradouro, cidade, uf }) =>
      logradouro
        ? "Endereço preenchido pelo CEP. Confira e informe o número."
        : `CEP geral de ${cidade}/${uf}: ele não indica a rua. Informe o logradouro e o bairro.`,
  });
  const [consultandoCnpj, iniciarConsultaCnpj] = useTransition();
  const [avisoCnpj, setAvisoCnpj] = useState<AvisoConsulta | null>(null);

  function buscarCnpj(botao: HTMLButtonElement) {
    const formulario = botao.form;
    const documento = formulario?.elements.namedItem("documento");
    if (!formulario || !(documento instanceof HTMLInputElement)) return;

    iniciarConsultaCnpj(async () => {
      setAvisoCnpj(null);
      const resultado = await consultarCnpj(documento.value);
      if (resultado.erro !== undefined) {
        setAvisoCnpj({ tipo: "erro", texto: resultado.erro });
        return;
      }
      const { situacaoCadastral, ...dados } = resultado.dados;
      preencherCampos(formulario, dados);
      // O endereço já veio da Receita: não precisa buscar o CEP de novo ao sair do campo.
      buscaCep.marcarConsultado(dados.cep);
      setAvisoCnpj(
        situacaoCadastral && situacaoCadastral !== "ATIVA"
          ? { tipo: "atencao", texto: `Dados preenchidos, mas a situação deste CNPJ na Receita é ${situacaoCadastral}.` }
          : { tipo: "sucesso", texto: "Dados preenchidos com o cadastro da Receita Federal. Confira antes de salvar." },
      );
    });
  }

  function campo(
    nome: CampoContribuinte,
    rotulo: string,
    opcoes: {
      obrigatorio?: boolean;
      tipo?: string;
      dica?: string;
      maximo?: number;
      aoSair?: (campo: HTMLInputElement) => void;
    } = {},
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
          onBlur={opcoes.aoSair ? (evento) => opcoes.aoSair?.(evento.currentTarget) : undefined}
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
            onChange={(evento) => {
              setTipoPessoa(evento.target.value);
              setAvisoCnpj(null);
            }}
            className={CLASSE_CAMPO}
          >
            <option value="FISICA">Pessoa física</option>
            <option value="JURIDICA">Pessoa jurídica</option>
          </select>
        </div>
        <div>
          {campo("documento", pessoaFisica ? "CPF" : "CNPJ", {
            dica: pessoaFisica ? "000.000.000-00" : "00.000.000/0000-00",
            maximo: 18,
          })}
          {/* Só para CNPJ: CPF é dado pessoal e não é consultado fora do sistema. */}
          {!pessoaFisica && (
            <>
              <button
                type="button"
                onClick={(evento) => buscarCnpj(evento.currentTarget)}
                disabled={consultandoCnpj}
                className="mt-2 rounded-md border border-emerald-700 px-3 py-1.5 text-sm font-medium text-emerald-800 hover:bg-emerald-50 disabled:opacity-60 dark:border-emerald-500 dark:text-emerald-300 dark:hover:bg-emerald-950"
              >
                {consultandoCnpj ? "Buscando…" : "Buscar dados do CNPJ"}
              </button>
              <Aviso aviso={avisoCnpj} />
            </>
          )}
        </div>
        <div className="sm:col-span-2">
          {campo("nome", pessoaFisica ? "Nome completo" : "Razão social", { maximo: 150 })}
        </div>
        {campo("email", "E-mail", { obrigatorio: false, tipo: "email", maximo: 150 })}
        {campo("telefone", "Telefone", { obrigatorio: false, dica: "(00) 00000-0000", maximo: 16 })}
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-6">
        <legend className="mb-3 text-base font-semibold">Endereço</legend>
        <div className="sm:col-span-2">
          {campo("cep", "CEP", { dica: "00000-000", maximo: 9, aoSair: buscaCep.buscar })}
          <Aviso aviso={buscaCep.aviso} carregando={buscaCep.consultando ? "Buscando endereço…" : undefined} />

        </div>
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
