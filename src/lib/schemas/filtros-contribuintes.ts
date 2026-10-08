import { z } from "zod";
import { TIPOS_PESSOA } from "@/lib/schemas/contribuinte";

export const CONTRIBUINTES_POR_PAGINA = 10;

// Os filtros vêm da URL, que o usuário pode editar: valor inválido cai no padrão em vez de dar erro.
const filtrosSchema = z.object({
  busca: z.string().trim().max(100).catch(""),
  tipo: z.enum(TIPOS_PESSOA).optional().catch(undefined),
  pagina: z.coerce.number().int().min(1).catch(1),
});

export type FiltrosContribuintes = z.output<typeof filtrosSchema>;

type ParametrosUrl = Record<string, string | string[] | undefined>;

export function lerFiltrosContribuintes(parametros: ParametrosUrl): FiltrosContribuintes {
  // Parâmetro repetido (?busca=a&busca=b) chega como lista; vale o primeiro.
  const primeiro = (valor: string | string[] | undefined) =>
    Array.isArray(valor) ? valor[0] : valor;

  return filtrosSchema.parse({
    busca: primeiro(parametros.busca),
    tipo: primeiro(parametros.tipo),
    pagina: primeiro(parametros.pagina),
  });
}

/** Monta o endereço da listagem, omitindo os filtros que estão no padrão. */
export function urlContribuintes(filtros: Partial<FiltrosContribuintes>): string {
  const parametros = new URLSearchParams();
  if (filtros.busca) parametros.set("busca", filtros.busca);
  if (filtros.tipo) parametros.set("tipo", filtros.tipo);
  if (filtros.pagina && filtros.pagina > 1) parametros.set("pagina", String(filtros.pagina));

  const consulta = parametros.toString();
  return consulta ? `/contribuintes?${consulta}` : "/contribuintes";
}
