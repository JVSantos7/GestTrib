import { z } from "zod";

export const GUIAS_POR_PAGINA = 15;

export const SITUACOES_FILTRO_GUIA = ["aberta", "vencida", "paga", "cancelada"] as const;
export type SituacaoFiltroGuia = (typeof SITUACOES_FILTRO_GUIA)[number];

export const ROTULOS_FILTRO_GUIA: Record<SituacaoFiltroGuia, string> = {
  aberta: "Aberta (a vencer)",
  vencida: "Vencida",
  paga: "Paga",
  cancelada: "Cancelada",
};

const data = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().catch(undefined);

// Os filtros vêm da URL, que o usuário pode editar: valor inválido cai no padrão em vez de dar erro.
const filtrosSchema = z.object({
  busca: z.string().trim().max(100).catch(""),
  situacao: z.enum(SITUACOES_FILTRO_GUIA).optional().catch(undefined),
  vencimentoDe: data,
  vencimentoAte: data,
  pagina: z.coerce.number().int().min(1).catch(1),
});

export type FiltrosGuias = z.output<typeof filtrosSchema>;

type ParametrosUrl = Record<string, string | string[] | undefined>;

export function lerFiltrosGuias(parametros: ParametrosUrl): FiltrosGuias {
  // Parâmetro repetido (?busca=a&busca=b) chega como lista; vale o primeiro.
  const primeiro = (valor: string | string[] | undefined) => (Array.isArray(valor) ? valor[0] : valor);

  return filtrosSchema.parse({
    busca: primeiro(parametros.busca),
    // Campo vazio do formulário ("Todas", data em branco) chega como "".
    situacao: primeiro(parametros.situacao) || undefined,
    vencimentoDe: primeiro(parametros.vencimentoDe) || undefined,
    vencimentoAte: primeiro(parametros.vencimentoAte) || undefined,
    pagina: primeiro(parametros.pagina),
  });
}

/** Monta o endereço da listagem, omitindo os filtros que estão no padrão. */
export function urlGuias(filtros: Partial<FiltrosGuias>): string {
  const parametros = new URLSearchParams();
  if (filtros.busca) parametros.set("busca", filtros.busca);
  if (filtros.situacao) parametros.set("situacao", filtros.situacao);
  if (filtros.vencimentoDe) parametros.set("vencimentoDe", filtros.vencimentoDe);
  if (filtros.vencimentoAte) parametros.set("vencimentoAte", filtros.vencimentoAte);
  if (filtros.pagina && filtros.pagina > 1) parametros.set("pagina", String(filtros.pagina));

  const consulta = parametros.toString();
  return consulta ? `/guias?${consulta}` : "/guias";
}
