"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { consultarCepImovel, type CampoImovel, type EstadoFormularioImovel } from "@/app/(sistema)/imoveis/actions";
import { Aviso, useBuscaCep } from "@/components/form/BuscaCep";
import { CLASSE_BOTAO_PRIMARIO, CLASSE_BOTAO_SECUNDARIO, CLASSE_CAMPO } from "@/components/form/estilos";
import { MUNICIPIO } from "@/lib/municipio";
import { ROTULOS_USO, USOS_IMOVEL } from "@/lib/schemas/imovel";

type Props = {
  acao: (estado: EstadoFormularioImovel, formData: FormData) => Promise<EstadoFormularioImovel>;
  valoresIniciais?: Partial<Record<CampoImovel, string>>;
  /** Nome do proprietário atual, exibido como referência na edição. */
  nomeProprietario?: string;
  rotuloEnviar: string;
  hrefCancelar: string;
};

type OpcoesCampo = {
  opcional?: boolean;
  dica?: string;
  ajuda?: string;
  maximo?: number;
  desabilitado?: boolean;
  aoSair?: (campo: HTMLInputElement) => void;
};

export function FormImovel({ acao, valoresIniciais, nomeProprietario, rotuloEnviar, hrefCancelar }: Props) {
  const [estado, enviar, pendente] = useActionState(acao, {});
  const valores = estado.valores ?? valoresIniciais ?? {};
  const [uso, setUso] = useState(valores.uso ?? "RESIDENCIAL");
  const terreno = uso === "TERRENO";

  // O município do sistema é fictício e o CEP é real: do CEP só aproveitamos rua e bairro.
  // Cidade e UF do imóvel são sempre as de MUNICIPIO, nunca as que a BrasilAPI devolve.
  const buscaCep = useBuscaCep({
    cepInicial: valores.cep,
    consultar: consultarCepImovel,
    campos: ["logradouro", "bairro"],
    mensagem: ({ logradouro, cidade, uf }) => {
      const municipio = `${MUNICIPIO.nome}/${MUNICIPIO.uf}`;
      // O CEP é real e o município do sistema é fictício: deixar claro por que as cidades diferem.
      const origem = `Este CEP é de ${cidade}/${uf}, mas o imóvel fica em ${municipio} (município fictício do sistema).`;
      return logradouro
        ? `${origem} Aproveitamos só a rua e o bairro. Confira e informe o número.`
        : `${origem} É um CEP geral, sem rua: informe o logradouro e o bairro.`;
    },
  });

  function campo(nome: CampoImovel, rotulo: string, opcoes: OpcoesCampo = {}) {
    const erro = estado.erros?.[nome];
    const descricao = erro ? `${nome}-erro` : opcoes.ajuda ? `${nome}-ajuda` : undefined;
    return (
      <div>
        <label htmlFor={nome} className="block text-sm font-medium">
          {rotulo}
          {opcoes.opcional && <span className="ml-1 font-normal text-zinc-500">(opcional)</span>}
        </label>
        <input
          // A key recria o campo ao ser habilitado de novo, sem resto do valor anterior.
          key={opcoes.desabilitado ? `${nome}-desabilitado` : nome}
          id={nome}
          name={nome}
          type="text"
          defaultValue={opcoes.desabilitado ? "" : (valores[nome] ?? "")}
          placeholder={opcoes.dica}
          maxLength={opcoes.maximo}
          disabled={opcoes.desabilitado}
          onBlur={opcoes.aoSair ? (evento) => opcoes.aoSair?.(evento.currentTarget) : undefined}
          aria-invalid={erro ? true : undefined}
          aria-describedby={descricao}
          className={CLASSE_CAMPO}
        />
        {erro ? (
          <p id={`${nome}-erro`} className="mt-1 text-sm text-red-600 dark:text-red-400">
            {erro}
          </p>
        ) : (
          opcoes.ajuda && (
            <p id={`${nome}-ajuda`} className="mt-1 text-sm text-zinc-500">
              {opcoes.ajuda}
            </p>
          )
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
        {campo("inscricao", "Inscrição imobiliária", {
          dica: "00.000.0000.000",
          ajuda: "Setor, quadra, lote e unidade.",
          maximo: 15,
        })}
        <div>
          <label htmlFor="uso" className="block text-sm font-medium">
            Tipo de uso
          </label>
          <select
            id="uso"
            name="uso"
            value={uso}
            onChange={(evento) => setUso(evento.target.value)}
            className={CLASSE_CAMPO}
          >
            {USOS_IMOVEL.map((opcao) => (
              <option key={opcao} value={opcao}>
                {ROTULOS_USO[opcao]}
              </option>
            ))}
          </select>
        </div>
        {campo("areaTerreno", "Área do terreno (m²)", { dica: "360,00", maximo: 16 })}
        {campo("areaConstruida", "Área construída (m²)", {
          dica: terreno ? "Sem construção" : "120,00",
          maximo: 16,
          desabilitado: terreno,
        })}
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-3 text-base font-semibold">Proprietário</legend>
        {campo("documentoProprietario", "CPF/CNPJ do proprietário", {
          dica: "000.000.000-00",
          ajuda: nomeProprietario
            ? `Atual: ${nomeProprietario}. Para transferir, informe o documento do novo proprietário.`
            : "O proprietário precisa estar cadastrado como contribuinte.",
          maximo: 18,
        })}
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-6">
        <legend className="mb-3 text-base font-semibold">Endereço do imóvel</legend>
        <div className="sm:col-span-2">
          {campo("cep", "CEP", { dica: "00000-000", maximo: 9, aoSair: buscaCep.buscar })}
          <Aviso aviso={buscaCep.aviso} carregando={buscaCep.consultando ? "Buscando endereço…" : undefined} />
        </div>
        <div className="sm:col-span-4">{campo("logradouro", "Logradouro", { maximo: 150 })}</div>
        <div className="sm:col-span-2">{campo("numero", "Número", { maximo: 10 })}</div>
        <div className="sm:col-span-4">{campo("complemento", "Complemento", { opcional: true, maximo: 60 })}</div>
        <div className="sm:col-span-3">{campo("bairro", "Bairro", { maximo: 80 })}</div>
        <div className="sm:col-span-3">
          <p className="block text-sm font-medium">Município</p>
          <p className="mt-1 px-1 py-2 text-sm text-zinc-600 dark:text-zinc-400">
            {MUNICIPIO.nome}/{MUNICIPIO.uf}
          </p>
        </div>
      </fieldset>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={pendente} className={CLASSE_BOTAO_PRIMARIO}>
          {pendente ? "Salvando…" : rotuloEnviar}
        </button>
        <Link href={hrefCancelar} className={CLASSE_BOTAO_SECUNDARIO}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}
