import { z } from "zod";

// Filtros dos relatórios, lidos da URL. Como nas listagens, valor inválido cai no padrão em vez de dar erro.

type ParametrosUrl = Record<string, string | string[] | undefined>;

// Parâmetro repetido (?de=a&de=b) chega como lista; vale o primeiro. Campo vazio do formulário chega como "".
const primeiro = (valor: string | string[] | undefined) => (Array.isArray(valor) ? valor[0] : valor) || undefined;

/** Data ISO que existe de verdade: "2026-02-31" tem o formato certo, mas não é um dia do calendário. */
function ehDataValida(texto: string): boolean {
  const data = new Date(`${texto}T00:00:00Z`);
  return !Number.isNaN(data.getTime()) && data.toISOString().slice(0, 10) === texto;
}

const data = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(ehDataValida).optional().catch(undefined);
const exercicio = z.coerce.number().int().min(2000).max(2100).optional().catch(undefined);

// ---------------------------------------------------------------------------
// Arrecadação: período de pagamento
// ---------------------------------------------------------------------------

export type FiltrosArrecadacao = { de: string; ate: string };

/** Sem período na URL, mostra o mês corrente até hoje. Período invertido é desvirado. */
export function lerFiltrosArrecadacao(parametros: ParametrosUrl, hoje: string): FiltrosArrecadacao {
  const de = data.parse(primeiro(parametros.de)) ?? `${hoje.slice(0, 8)}01`;
  const ate = data.parse(primeiro(parametros.ate)) ?? hoje;
  return de <= ate ? { de, ate } : { de: ate, ate: de };
}

// ---------------------------------------------------------------------------
// Inadimplência e lançamentos: exercício
// ---------------------------------------------------------------------------

/** Exercício opcional (vazio = todos). */
export function lerFiltroExercicio(parametros: ParametrosUrl): { exercicio?: number } {
  return { exercicio: exercicio.parse(primeiro(parametros.exercicio)) };
}

/** "?de=2026-01-01&ate=2026-01-31", omitindo o que não foi informado. Para os links de CSV. */
export function consultaUrl(filtros: Record<string, string | number | undefined>): string {
  const parametros = new URLSearchParams();
  for (const [chave, valor] of Object.entries(filtros)) {
    if (valor !== undefined && valor !== "") parametros.set(chave, String(valor));
  }
  const consulta = parametros.toString();
  return consulta ? `?${consulta}` : "";
}
