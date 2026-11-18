import "server-only";
import {
  converterRespostaCep,
  converterRespostaCnpj,
  type DadosCnpj,
  type EnderecoCep,
} from "@/lib/brasilapi";
import { validarCnpj } from "@/lib/documento";
import { somenteDigitos } from "@/lib/schemas/campos";

// Consultas a serviços públicos de fora do sistema (BrasilAPI).
// Elas só SUGEREM valores para o formulário: nada é gravado aqui, por isso não há auditoria.
// O que vale é o que o operador confirma ao salvar, validado pelo Zod como sempre.

const BRASILAPI = "https://brasilapi.com.br/api";

// Se a API demorar mais que isso, desistimos: o operador pode preencher à mão.
const TEMPO_LIMITE_MS = 5_000;

// Endereço de um CEP e cadastro de um CNPJ quase nunca mudam: guardamos a resposta por um dia
// no cache do Next, compartilhado entre todos os usuários. Menos espera e menos chamadas à API.
const UM_DIA_EM_SEGUNDOS = 60 * 60 * 24;

export class CepInvalidoError extends Error {
  constructor() {
    super("O CEP deve ter 8 dígitos.");
    this.name = "CepInvalidoError";
  }
}

export class CepNaoEncontradoError extends Error {
  constructor() {
    super("CEP não encontrado. Confira o número ou preencha o endereço manualmente.");
    this.name = "CepNaoEncontradoError";
  }
}

export class CnpjInvalidoError extends Error {
  constructor() {
    super("Informe um CNPJ válido para buscar os dados.");
    this.name = "CnpjInvalidoError";
  }
}

export class CnpjNaoEncontradoError extends Error {
  constructor() {
    super("CNPJ não encontrado na base da Receita. Preencha os dados manualmente.");
    this.name = "CnpjNaoEncontradoError";
  }
}

export class ServicoIndisponivelError extends Error {
  constructor() {
    super("O serviço de consulta não respondeu. Tente de novo ou preencha manualmente.");
    this.name = "ServicoIndisponivelError";
  }
}

/** GET na BrasilAPI. Devolve o JSON, ou null quando a API responde "não encontrado". */
async function consultarBrasilApi(caminho: string): Promise<unknown | null> {
  let resposta: Response;
  try {
    resposta = await fetch(`${BRASILAPI}${caminho}`, {
      // Sem User-Agent, o fetch do Node se apresenta como "node" e a BrasilAPI recusa (403).
      headers: { Accept: "application/json", "User-Agent": "GestTrib/1.0" },
      signal: AbortSignal.timeout(TEMPO_LIMITE_MS),
      next: { revalidate: UM_DIA_EM_SEGUNDOS },
    });
  } catch {
    // Sem internet, DNS fora, tempo esgotado...
    throw new ServicoIndisponivelError();
  }

  // A BrasilAPI responde 404 tanto para "não existe" quanto para CEP mal formado.
  if (resposta.status === 404 || resposta.status === 400) return null;
  if (!resposta.ok) throw new ServicoIndisponivelError();

  try {
    return await resposta.json();
  } catch {
    throw new ServicoIndisponivelError();
  }
}

export async function buscarEnderecoPorCep(cep: string): Promise<EnderecoCep> {
  const digitos = somenteDigitos(cep);
  if (digitos.length !== 8) throw new CepInvalidoError();

  const json = await consultarBrasilApi(`/cep/v2/${digitos}`);
  if (json === null) throw new CepNaoEncontradoError();
  return converterRespostaCep(json);
}

export async function buscarDadosPorCnpj(cnpj: string): Promise<DadosCnpj> {
  // Só CNPJ válido sai do sistema. CPF nunca é consultado fora (LGPD): é dado pessoal.
  if (!validarCnpj(cnpj)) throw new CnpjInvalidoError();
  const digitos = cnpj.replace(/[^0-9a-zA-Z]/g, "").toUpperCase();

  const json = await consultarBrasilApi(`/cnpj/v1/${digitos}`);
  if (json === null) throw new CnpjNaoEncontradoError();
  return converterRespostaCnpj(json);
}
