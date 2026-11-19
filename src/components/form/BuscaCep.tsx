"use client";

import { useState, useTransition } from "react";
import type { ResultadoConsulta } from "@/server/consulta-acao";

// Peças compartilhadas pelos formulários que consultam a BrasilAPI (contribuinte e imóvel).
// O `import type` acima some na compilação: nada do servidor vai para o navegador.

/** Resultado da última consulta externa, mostrado logo abaixo do campo que a disparou. */
export type AvisoConsulta = { tipo: "erro" | "sucesso" | "atencao"; texto: string };

const CORES_AVISO: Record<AvisoConsulta["tipo"], string> = {
  erro: "text-red-600 dark:text-red-400",
  sucesso: "text-emerald-700 dark:text-emerald-400",
  atencao: "text-amber-700 dark:text-amber-400",
};

/** `carregando`: texto mostrado enquanto a consulta está em andamento, no lugar do aviso. */
export function Aviso({ aviso, carregando }: { aviso: AvisoConsulta | null; carregando?: string }) {
  // role="status": leitores de tela anunciam a mensagem sem tirar o foco do campo.
  // Um só elemento para carregando e resultado, para o leitor de tela anunciar a troca.
  const cor = carregando ? "text-zinc-500" : aviso ? CORES_AVISO[aviso.tipo] : "";
  return (
    <p role="status" className={`mt-1 text-sm ${cor}`}>
      {carregando ?? aviso?.texto}
    </p>
  );
}

export const somenteDigitos = (valor: string) => valor.replace(/\D/g, "");

// Os campos usam defaultValue (o React não guarda o valor deles), então o preenchimento
// escreve direto no formulário. Cada campo conhece o formulário dele: `elemento.form`.

/**
 * Escreve nos campos do formulário. Com `apagarVazios`, valor vazio limpa o campo;
 * sem ele, valor vazio deixa o que já estava (o operador pode ter digitado).
 */
export function preencherCampos(
  formulario: HTMLFormElement,
  dados: Record<string, string | undefined>,
  { apagarVazios = false } = {},
) {
  for (const [nome, valor] of Object.entries(dados)) {
    const elemento = formulario.elements.namedItem(nome);
    if ((valor || apagarVazios) && (elemento instanceof HTMLInputElement || elemento instanceof HTMLSelectElement)) {
      elemento.value = valor ?? "";
    }
  }
}

type OpcoesBuscaCep<T extends { logradouro: string }> = {
  /** CEP que já veio do cadastro: sair do campo sem mudá-lo não consulta de novo. */
  cepInicial?: string;
  consultar: (cep: string) => Promise<ResultadoConsulta<T>>;
  /** Campos do formulário que o CEP preenche (e apaga, se o CEP não existir). */
  campos: readonly (keyof T & string)[];
  /** Aviso de sucesso quando o CEP traz a rua, e quando é um CEP geral (só a cidade). */
  mensagens: { comRua: string; semRua: string };
};

/** Busca o endereço quando o operador sai do campo CEP. Ligue `buscar` no onBlur do campo. */
export function useBuscaCep<T extends { logradouro: string }>({
  cepInicial,
  consultar,
  campos,
  mensagens,
}: OpcoesBuscaCep<T>) {
  const [consultando, iniciarConsulta] = useTransition();
  const [aviso, setAviso] = useState<AvisoConsulta | null>(null);
  // Último CEP já consultado (ou o que veio do cadastro): sair do campo sem mudar o CEP
  // não busca de novo, para não apagar um endereço que o operador corrigiu à mão.
  const [ultimoCep, setUltimoCep] = useState(() => somenteDigitos(cepInicial ?? ""));

  function buscar(campoCep: HTMLInputElement) {
    const formulario = campoCep.form;
    const cep = somenteDigitos(campoCep.value);
    if (!formulario) return;
    if (cep.length !== 8 || cep === ultimoCep) return;
    setUltimoCep(cep);

    iniciarConsulta(async () => {
      setAviso(null);
      const resultado = await consultar(cep);
      if (resultado.erro !== undefined) {
        // Deixa sair do campo de novo para tentar outra vez (ex.: a API estava fora do ar).
        setUltimoCep("");
        // CEP que não existe: o endereço na tela era de outro CEP e não vale mais.
        if (resultado.naoEncontrado) {
          preencherCampos(formulario, Object.fromEntries(campos.map((nome) => [nome, ""])), { apagarVazios: true });
        }
        setAviso({ tipo: "erro", texto: resultado.erro });
        return;
      }
      const dados = resultado.dados;
      // O endereço tem de ser o deste CEP: o que ele não trouxe é apagado, não herdado do anterior.
      preencherCampos(formulario, Object.fromEntries(campos.map((nome) => [nome, String(dados[nome] ?? "")])), {
        apagarVazios: true,
      });
      setAviso({ tipo: "sucesso", texto: dados.logradouro ? mensagens.comRua : mensagens.semRua });
      // O próximo campo que só o operador sabe: número (ou o logradouro, se o CEP não trouxe a rua).
      const proximo = formulario.elements.namedItem(dados.logradouro ? "numero" : "logradouro");
      if (proximo instanceof HTMLInputElement) proximo.focus();
    });
  }

  /** O endereço veio de outro lugar (ex.: CNPJ): sair do campo com este CEP não consulta de novo. */
  function marcarConsultado(cep: string) {
    setUltimoCep(somenteDigitos(cep));
    setAviso(null);
  }

  return { buscar, consultando, aviso, marcarConsultado };
}
