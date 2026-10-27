import { z } from "zod";
import { decimalEhZero, lerDecimalBr } from "@/lib/decimal";

// numeric(12,2) no banco: até 10 dígitos antes da vírgula.
const MAXIMO_DIGITOS_INTEIROS = 10;

/** Número no formato brasileiro, maior que zero, convertido para texto decimal ("1234.50"). */
function valorPositivo(campo: string, maximoInteiro?: number) {
  return z
    .string({ error: `Informe ${campo}.` })
    .trim()
    .min(1, { error: `Informe ${campo}.` })
    .transform((texto, contexto) => {
      const valor = lerDecimalBr(texto);
      if (valor === null) {
        contexto.addIssue({ code: "custom", message: "Use o formato 1.234,56 (vírgula nos decimais)." });
        return z.NEVER;
      }
      const inteiro = valor.split(".")[0];
      if (inteiro.length > MAXIMO_DIGITOS_INTEIROS || (maximoInteiro !== undefined && Number(inteiro) >= maximoInteiro)) {
        contexto.addIssue({ code: "custom", message: maximoInteiro ? `Deve ser menor que ${maximoInteiro}.` : "Valor grande demais." });
        return z.NEVER;
      }
      if (decimalEhZero(valor)) {
        contexto.addIssue({ code: "custom", message: "Deve ser maior que zero." });
        return z.NEVER;
      }
      return valor;
    });
}

// A alíquota é digitada em percentual ("0,80" = 0,80%) e precisa ficar abaixo de 100%.
const aliquota = (uso: string) => valorPositivo(`a alíquota ${uso}`, 100);
const valorM2 = (uso: string) => valorPositivo(`o valor do m² ${uso}`);

export const parametrosIptuSchema = z.object({
  exercicio: z
    .string({ error: "Informe o exercício." })
    .trim()
    .regex(/^\d{4}$/, { error: "Informe o ano com 4 dígitos." })
    .transform(Number)
    .pipe(z.number().min(2000, { error: "Use um ano a partir de 2000." }).max(2100, { error: "Use um ano até 2100." })),
  aliquotaResidencial: aliquota("residencial"),
  aliquotaComercial: aliquota("comercial"),
  aliquotaIndustrial: aliquota("industrial"),
  aliquotaTerreno: aliquota("do terreno sem construção"),
  valorM2Residencial: valorM2("residencial"),
  valorM2Comercial: valorM2("comercial"),
  valorM2Industrial: valorM2("industrial"),
  // Setor ("01") → valor do m² de terreno nele.
  terrenos: z.record(z.string().regex(/^(?!00)\d{2}$/), valorPositivo("o valor do m² do terreno"), {
    error: "Setor inválido.",
  }),
});

export type ParametrosIptuDados = z.output<typeof parametrosIptuSchema>;

export const CAMPOS_PARAMETROS = [
  "exercicio",
  "aliquotaResidencial",
  "aliquotaComercial",
  "aliquotaIndustrial",
  "aliquotaTerreno",
  "valorM2Residencial",
  "valorM2Comercial",
  "valorM2Industrial",
] as const;

/** Nome do campo do formulário para o valor do m² de terreno de um setor. */
export const campoTerreno = (setor: string) => `terreno.${setor}`;

/**
 * Valores fictícios para o primeiro exercício, quando ainda não há um anterior para copiar.
 * O terreno de cada setor começa com o mesmo valor e é ajustado na tela.
 */
export const SUGESTAO_INICIAL = {
  aliquotaResidencial: "0,80",
  aliquotaComercial: "1,20",
  aliquotaIndustrial: "1,20",
  aliquotaTerreno: "2,00",
  valorM2Residencial: "1.200,00",
  valorM2Comercial: "1.500,00",
  valorM2Industrial: "900,00",
  terreno: "150,00",
};
