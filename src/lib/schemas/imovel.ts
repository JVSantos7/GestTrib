import { z } from "zod";
import { decimalEhZero, lerDecimalBr } from "@/lib/decimal";
import { limparDocumento, validarCnpj, validarCpf } from "@/lib/documento";
import { cep, somenteDigitos, textoObrigatorio, vazioParaNulo } from "@/lib/schemas/campos";

export const USOS_IMOVEL = ["RESIDENCIAL", "COMERCIAL", "INDUSTRIAL", "TERRENO"] as const;
export type UsoImovel = (typeof USOS_IMOVEL)[number];

export const ROTULOS_USO: Record<UsoImovel, string> = {
  RESIDENCIAL: "Residencial",
  COMERCIAL: "Comercial",
  INDUSTRIAL: "Industrial",
  TERRENO: "Terreno sem construção",
};

/** "010020003001" → "01.002.0003.001" (setor.quadra.lote.unidade). */
export function formatarInscricao(inscricao: string): string {
  return inscricao.replace(/^(\d{2})(\d{3})(\d{4})(\d{3})$/, "$1.$2.$3.$4");
}

const inscricao = z
  .string({ error: "Informe a inscrição imobiliária." })
  .transform(somenteDigitos)
  .pipe(
    z
      .string()
      .length(12, { error: "A inscrição deve ter 12 dígitos (setor.quadra.lote.unidade)." })
      // Nenhuma das partes pode ser zero: setor 00, quadra 000 etc. não existem.
      .refine((valor) => !/^00|^\d{2}000|^\d{5}0000|000$/.test(valor), {
        error: "Setor, quadra, lote e unidade não podem ser zero.",
      }),
  );

// numeric(12,2) no banco: até 10 dígitos antes da vírgula.
const MAXIMO_DIGITOS_INTEIROS = 10;

function area(campo: string) {
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
      if (valor.split(".")[0].length > MAXIMO_DIGITOS_INTEIROS) {
        contexto.addIssue({ code: "custom", message: "Valor grande demais." });
        return z.NEVER;
      }
      return valor;
    });
}

export const imovelSchema = z
  .object({
    inscricao,
    uso: z.enum(USOS_IMOVEL, { error: "Selecione o tipo de uso." }),
    areaTerreno: area("a área do terreno").refine((valor) => !decimalEhZero(valor), {
      error: "A área do terreno deve ser maior que zero.",
    }),
    // Vazio vale zero: é o caso do terreno sem construção.
    areaConstruida: z
      .string()
      .trim()
      .transform((texto) => texto || "0")
      .pipe(area("a área construída")),
    cep,
    logradouro: textoObrigatorio("o logradouro", 150),
    numero: textoObrigatorio("o número", 10),
    complemento: vazioParaNulo.pipe(
      z.string().max(60, { error: "Use no máximo 60 caracteres." }).nullable(),
    ),
    bairro: textoObrigatorio("o bairro", 80),
    // O service troca o documento pelo id do contribuinte e confere se ele existe.
    documentoProprietario: z
      .string({ error: "Informe o CPF/CNPJ do proprietário." })
      .transform(limparDocumento)
      .pipe(
        z
          .string()
          .min(1, { error: "Informe o CPF/CNPJ do proprietário." })
          .refine((documento) => validarCpf(documento) || validarCnpj(documento), {
            error: "CPF/CNPJ inválido.",
          }),
      ),
  })
  .superRefine((dados, contexto) => {
    const semConstrucao = decimalEhZero(dados.areaConstruida);
    if (dados.uso === "TERRENO" && !semConstrucao) {
      contexto.addIssue({
        code: "custom",
        path: ["areaConstruida"],
        message: "Terreno sem construção não pode ter área construída.",
      });
    }
    if (dados.uso !== "TERRENO" && semConstrucao) {
      contexto.addIssue({
        code: "custom",
        path: ["areaConstruida"],
        message: "Informe a área construída (ou escolha 'Terreno sem construção').",
      });
    }
  });

/** Valores como chegam do formulário (strings, ainda com máscara). */
export type ImovelEntrada = z.input<typeof imovelSchema>;
/** Dados validados; as áreas saem como texto decimal ("1234.56"). */
export type ImovelDados = z.output<typeof imovelSchema>;
