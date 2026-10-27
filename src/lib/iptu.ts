import DecimalBase from "decimal.js";
import type { UsoImovel } from "@/lib/schemas/imovel";

// Cópia isolada da biblioteca: a configuração de arredondamento vale só para o IPTU.
// Meio centavo arredonda para cima (0,625 → 0,63), como na conta feita à mão.
const Decimal = DecimalBase.clone({ precision: 40, rounding: DecimalBase.ROUND_HALF_UP });

/** Valores do exercício aplicáveis a este imóvel, em texto decimal ("150.00", "0.008"). */
export type ParametrosCalculo = {
  /** Valor do m² de terreno no setor do imóvel. */
  valorM2Terreno: string;
  /** Valor do m² de construção para o uso do imóvel. */
  valorM2Construcao: string;
  /** Alíquota do uso, em fração: 0,8% = "0.008". */
  aliquota: string;
};

export type ImovelCalculo = {
  uso: UsoImovel;
  areaTerreno: string;
  areaConstruida: string;
  /** Unidades ativas no mesmo lote (prédio). Cada uma paga pela sua fração do terreno. */
  unidadesNoLote: number;
};

/** Memória de cálculo: cada etapa já arredondada, para a conta fechar quando refeita à mão. */
export type CalculoIptu = {
  areaTerrenoConsiderada: string;
  valorVenalTerreno: string;
  valorVenalConstrucao: string;
  valorVenal: string;
  aliquota: string;
  valorImposto: string;
};

export class ParametroInvalidoError extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = "ParametroInvalidoError";
  }
}

function lerNaoNegativo(valor: string, nome: string) {
  let numero: InstanceType<typeof Decimal>;
  try {
    numero = new Decimal(valor);
  } catch {
    throw new ParametroInvalidoError(`${nome} inválido: "${valor}".`);
  }
  if (!numero.isFinite() || numero.isNegative()) throw new ParametroInvalidoError(`${nome} inválido: "${valor}".`);
  return numero;
}

const centavos = (valor: InstanceType<typeof Decimal>) => valor.toDecimalPlaces(2);

/** A alíquota é cadastrada em percentual ("0.80" = 0,80%); o cálculo usa a fração ("0.008"). */
export function percentualParaFracao(percentual: string): string {
  return lerNaoNegativo(percentual, "Alíquota").dividedBy(100).toString();
}

/**
 * Valor venal = terreno (fração do lote × m² do setor) + construção (área × m² do uso).
 * IPTU = valor venal × alíquota do uso.
 */
export function calcularIptu(imovel: ImovelCalculo, parametros: ParametrosCalculo): CalculoIptu {
  if (!Number.isInteger(imovel.unidadesNoLote) || imovel.unidadesNoLote < 1) {
    throw new ParametroInvalidoError("O lote precisa ter pelo menos uma unidade.");
  }
  const aliquota = lerNaoNegativo(parametros.aliquota, "Alíquota");
  if (aliquota.greaterThanOrEqualTo(1)) throw new ParametroInvalidoError("A alíquota deve ser menor que 100%.");

  const areaTerreno = centavos(lerNaoNegativo(imovel.areaTerreno, "Área do terreno").dividedBy(imovel.unidadesNoLote));
  // Terreno sem construção não soma construção, mesmo que algum valor tenha sobrado no cadastro.
  const areaConstruida = imovel.uso === "TERRENO" ? new Decimal(0) : lerNaoNegativo(imovel.areaConstruida, "Área construída");

  const valorVenalTerreno = centavos(areaTerreno.times(lerNaoNegativo(parametros.valorM2Terreno, "Valor do m² do terreno")));
  const valorVenalConstrucao = centavos(
    areaConstruida.times(lerNaoNegativo(parametros.valorM2Construcao, "Valor do m² de construção")),
  );
  const valorVenal = valorVenalTerreno.plus(valorVenalConstrucao);

  return {
    areaTerrenoConsiderada: areaTerreno.toFixed(2),
    valorVenalTerreno: valorVenalTerreno.toFixed(2),
    valorVenalConstrucao: valorVenalConstrucao.toFixed(2),
    valorVenal: valorVenal.toFixed(2),
    aliquota: aliquota.toString(),
    valorImposto: centavos(valorVenal.times(aliquota)).toFixed(2),
  };
}
