import "server-only";
import type { SetorDoFormulario } from "@/components/iptu/FormParametrosIptu";
import { formatarDecimalBr } from "@/lib/decimal";
import { CAMPOS_PARAMETROS, campoTerreno, SUGESTAO_INICIAL } from "@/lib/schemas/parametros-iptu";
import type { buscarParametros, SetorComImoveis } from "@/server/services/parametros-iptu";

type Parametros = NonNullable<Awaited<ReturnType<typeof buscarParametros>>>;

/** Setores com imóveis e os que já tinham valor (mesmo que hoje sem imóveis), em ordem. */
export function setoresDoFormulario(comImoveis: SetorComImoveis[], parametros: Parametros | null): SetorDoFormulario[] {
  const setores = new Map<string, SetorDoFormulario>(comImoveis.map((s) => [s.setor, s]));
  for (const { setor } of parametros?.valoresTerreno ?? []) {
    if (!setores.has(setor)) setores.set(setor, { setor, bairros: null, imoveis: 0 });
  }
  return [...setores.values()].sort((a, b) => a.setor.localeCompare(b.setor));
}

/** Valores iniciais dos campos: os de um exercício existente ou, sem nenhum, a sugestão inicial. */
export function valoresDoFormulario(parametros: Parametros | null, setores: SetorDoFormulario[]): Record<string, string> {
  const valores: Record<string, string> = {};
  for (const campo of CAMPOS_PARAMETROS) {
    if (campo === "exercicio") continue;
    valores[campo] = parametros ? formatarDecimalBr(parametros[campo]) : SUGESTAO_INICIAL[campo];
  }
  for (const { setor } of setores) {
    const existente = parametros?.valoresTerreno.find((v) => v.setor === setor);
    // Setor novo, sem valor no exercício copiado: fica em branco para não passar despercebido.
    valores[campoTerreno(setor)] = existente
      ? formatarDecimalBr(existente.valor)
      : parametros
        ? ""
        : SUGESTAO_INICIAL.terreno;
  }
  return valores;
}
