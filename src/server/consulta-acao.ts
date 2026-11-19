import "server-only";
import {
  CepInvalidoError,
  CepNaoEncontradoError,
  CnpjInvalidoError,
  CnpjNaoEncontradoError,
  ServicoIndisponivelError,
} from "@/server/services/consultas-externas";
import { AcessoNegadoError, exigirPermissaoAcao, type Permissoes } from "@/server/sessao";

// Parte comum das actions que consultam a BrasilAPI (contribuintes e imóveis):
// confere a permissão e transforma os erros conhecidos em mensagem para a tela.

export type ResultadoConsulta<T> =
  | { dados: T; erro?: undefined }
  // naoEncontrado: a consulta funcionou e o CEP/CNPJ não existe (diferente de "serviço fora do ar").
  | { dados?: undefined; erro: string; naoEncontrado: boolean };

const ERROS_CONSULTA = [
  CepInvalidoError,
  CepNaoEncontradoError,
  CnpjInvalidoError,
  CnpjNaoEncontradoError,
  ServicoIndisponivelError,
  AcessoNegadoError,
];

/** Libera quem tiver pelo menos uma das permissões (ex.: criar OU editar). */
async function exigirAlgumaPermissao(alternativas: Permissoes[]) {
  let ultimoErro: unknown = new AcessoNegadoError();
  for (const permissoes of alternativas) {
    try {
      await exigirPermissaoAcao(permissoes);
      return;
    } catch (erro) {
      if (!(erro instanceof AcessoNegadoError)) throw erro;
      ultimoErro = erro;
    }
  }
  throw ultimoErro;
}

/**
 * Roda uma consulta externa a partir de uma Server Action.
 * `permissoes`: basta ter uma delas. Erros inesperados são relançados, como nas outras actions.
 */
export async function executarConsulta<T>(
  permissoes: Permissoes[],
  buscar: () => Promise<T>,
): Promise<ResultadoConsulta<T>> {
  try {
    await exigirAlgumaPermissao(permissoes);
    return { dados: await buscar() };
  } catch (erro) {
    if (ERROS_CONSULTA.some((tipo) => erro instanceof tipo)) {
      const naoEncontrado = erro instanceof CepNaoEncontradoError || erro instanceof CnpjNaoEncontradoError;
      return { erro: (erro as Error).message, naoEncontrado };
    }
    throw erro;
  }
}
