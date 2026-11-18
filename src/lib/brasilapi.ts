// Conversão das respostas da BrasilAPI (https://brasilapi.com.br) para os campos do GestTrib.
// Funções puras: recebem o JSON já baixado e devolvem só o que o formulário usa.
// Quem faz a chamada de rede é o service `consultas-externas`.

import { somenteDigitos } from "@/lib/schemas/campos";
import { UFS } from "@/lib/schemas/contribuinte";

/** Campos de endereço que a consulta de CEP consegue preencher. */
export type EnderecoCep = {
  cep: string;
  logradouro: string;
  bairro: string;
  cidade: string;
  uf: string;
};

/** Campos do contribuinte que a consulta de CNPJ consegue preencher. */
export type DadosCnpj = EnderecoCep & {
  nome: string;
  email: string;
  telefone: string;
  numero: string;
  complemento: string;
  /** "ATIVA", "INAPTA", "BAIXADA"... Serve para avisar o operador, não é gravado. */
  situacaoCadastral: string;
};

// Mesmos limites do schema do contribuinte: o que vem de fora é cortado para caber no banco.
const LIMITES = { nome: 150, email: 150, logradouro: 150, numero: 10, complemento: 60, bairro: 80, cidade: 80 };

function texto(valor: unknown, maximo?: number): string {
  if (typeof valor !== "string") return "";
  const limpo = valor.replace(/\s+/g, " ").trim();
  return maximo ? limpo.slice(0, maximo).trim() : limpo;
}

/** Só aceita UF que o formulário conhece; senão deixa em branco para o operador escolher. */
function uf(valor: unknown): string {
  const sigla = texto(valor).toUpperCase();
  return (UFS as readonly string[]).includes(sigla) ? sigla : "";
}

/** A Receita manda o telefone com DDD ("6134939002"). Fora de 10/11 dígitos, ignora. */
function telefone(valor: unknown): string {
  const digitos = somenteDigitos(texto(valor));
  return /^\d{10,11}$/.test(digitos) ? digitos : "";
}

/** Resposta de GET /api/cep/v2/{cep}. */
export function converterRespostaCep(json: unknown): EnderecoCep {
  const dados = (json ?? {}) as Record<string, unknown>;
  return {
    cep: somenteDigitos(texto(dados.cep)),
    logradouro: texto(dados.street, LIMITES.logradouro),
    bairro: texto(dados.neighborhood, LIMITES.bairro),
    cidade: texto(dados.city, LIMITES.cidade),
    uf: uf(dados.state),
  };
}

/** Resposta de GET /api/cnpj/v1/{cnpj} (dados públicos da Receita Federal). */
export function converterRespostaCnpj(json: unknown): DadosCnpj {
  const dados = (json ?? {}) as Record<string, unknown>;

  // A Receita separa o tipo ("RUA") do nome ("DAS FLORES"). Às vezes o nome já traz o tipo.
  const tipo = texto(dados.descricao_tipo_de_logradouro);
  const nomeLogradouro = texto(dados.logradouro);
  const logradouro =
    tipo && !nomeLogradouro.toUpperCase().startsWith(tipo.toUpperCase())
      ? `${tipo} ${nomeLogradouro}`
      : nomeLogradouro;

  const email = texto(dados.email, LIMITES.email).toLowerCase();

  return {
    nome: texto(dados.razao_social, LIMITES.nome),
    // E-mail estranho fica de fora: o Zod recusaria e o operador teria de apagar.
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "",
    telefone: telefone(dados.ddd_telefone_1) || telefone(dados.ddd_telefone_2),
    cep: somenteDigitos(texto(dados.cep)),
    logradouro: logradouro.slice(0, LIMITES.logradouro).trim(),
    numero: texto(dados.numero, LIMITES.numero),
    complemento: texto(dados.complemento, LIMITES.complemento),
    bairro: texto(dados.bairro, LIMITES.bairro),
    cidade: texto(dados.municipio, LIMITES.cidade),
    uf: uf(dados.uf),
    situacaoCadastral: texto(dados.descricao_situacao_cadastral).toUpperCase(),
  };
}
