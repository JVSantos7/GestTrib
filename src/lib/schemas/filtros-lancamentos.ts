import { z } from "zod";

export const LANCAMENTOS_POR_PAGINA = 15;

export const SITUACOES_LANCAMENTO = ["vigente", "cancelado"] as const;
export type SituacaoLancamento = (typeof SITUACOES_LANCAMENTO)[number];

export const ROTULOS_SITUACAO: Record<SituacaoLancamento, string> = { vigente: "Vigente", cancelado: "Cancelado" };

// Os filtros vêm da URL, que o usuário pode editar: valor inválido cai no padrão em vez de dar erro.
const filtrosSchema = z.object({
  busca: z.string().trim().max(100).catch(""),
  exercicio: z.coerce.number().int().min(2000).max(2100).optional().catch(undefined),
  situacao: z.enum(SITUACOES_LANCAMENTO).optional().catch(undefined),
  pagina: z.coerce.number().int().min(1).catch(1),
});

export type FiltrosLancamentos = z.output<typeof filtrosSchema>;

type ParametrosUrl = Record<string, string | string[] | undefined>;

export function lerFiltrosLancamentos(parametros: ParametrosUrl): FiltrosLancamentos {
  // Parâmetro repetido (?busca=a&busca=b) chega como lista; vale o primeiro.
  const primeiro = (valor: string | string[] | undefined) => (Array.isArray(valor) ? valor[0] : valor);

  return filtrosSchema.parse({
    busca: primeiro(parametros.busca),
    // Campo vazio do formulário ("Todos") chega como "", que não é um ano.
    exercicio: primeiro(parametros.exercicio) || undefined,
    situacao: primeiro(parametros.situacao) || undefined,
    pagina: primeiro(parametros.pagina),
  });
}

/** Monta o endereço da listagem, omitindo os filtros que estão no padrão. */
export function urlLancamentos(filtros: Partial<FiltrosLancamentos>): string {
  const parametros = new URLSearchParams();
  if (filtros.busca) parametros.set("busca", filtros.busca);
  if (filtros.exercicio) parametros.set("exercicio", String(filtros.exercicio));
  if (filtros.situacao) parametros.set("situacao", filtros.situacao);
  if (filtros.pagina && filtros.pagina > 1) parametros.set("pagina", String(filtros.pagina));

  const consulta = parametros.toString();
  return consulta ? `/iptu?${consulta}` : "/iptu";
}
