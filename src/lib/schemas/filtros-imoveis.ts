import { z } from "zod";
import { USOS_IMOVEL } from "@/lib/schemas/imovel";

export const IMOVEIS_POR_PAGINA = 10;

// Os filtros vêm da URL, que o usuário pode editar: valor inválido cai no padrão em vez de dar erro.
const filtrosSchema = z.object({
  busca: z.string().trim().max(100).catch(""),
  uso: z.enum(USOS_IMOVEL).optional().catch(undefined),
  pagina: z.coerce.number().int().min(1).catch(1),
});

export type FiltrosImoveis = z.output<typeof filtrosSchema>;

type ParametrosUrl = Record<string, string | string[] | undefined>;

export function lerFiltrosImoveis(parametros: ParametrosUrl): FiltrosImoveis {
  // Parâmetro repetido (?busca=a&busca=b) chega como lista; vale o primeiro.
  const primeiro = (valor: string | string[] | undefined) =>
    Array.isArray(valor) ? valor[0] : valor;

  return filtrosSchema.parse({
    busca: primeiro(parametros.busca),
    uso: primeiro(parametros.uso),
    pagina: primeiro(parametros.pagina),
  });
}

/** Monta o endereço da listagem, omitindo os filtros que estão no padrão. */
export function urlImoveis(filtros: Partial<FiltrosImoveis>): string {
  const parametros = new URLSearchParams();
  if (filtros.busca) parametros.set("busca", filtros.busca);
  if (filtros.uso) parametros.set("uso", filtros.uso);
  if (filtros.pagina && filtros.pagina > 1) parametros.set("pagina", String(filtros.pagina));

  const consulta = parametros.toString();
  return consulta ? `/imoveis?${consulta}` : "/imoveis";
}
