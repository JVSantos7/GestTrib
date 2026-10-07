import { z } from "zod";
import { limparDocumento, validarCnpj, validarCpf } from "@/lib/documento";

export const TIPOS_PESSOA = ["FISICA", "JURIDICA"] as const;

export const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO",
  "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI",
  "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;

const somenteDigitos = (valor: string) => valor.replace(/\D/g, "");

function textoObrigatorio(campo: string, maximo: number) {
  return z
    .string({ error: `Informe ${campo}.` })
    .trim()
    .min(1, { error: `Informe ${campo}.` })
    .max(maximo, { error: `Use no máximo ${maximo} caracteres.` });
}

// Campo opcional de formulário: string vazia vira null antes de validar.
const vazioParaNulo = z
  .string()
  .trim()
  .transform((valor) => (valor === "" ? null : valor));

export const contribuinteSchema = z
  .object({
    tipoPessoa: z.enum(TIPOS_PESSOA, { error: "Selecione o tipo de pessoa." }),
    documento: z.string({ error: "Informe o documento." }).transform(limparDocumento),
    nome: textoObrigatorio("o nome", 150).min(3, { error: "Use pelo menos 3 caracteres." }),
    email: vazioParaNulo.pipe(
      z
        .email({ error: "E-mail inválido." })
        .max(150, { error: "Use no máximo 150 caracteres." })
        .nullable(),
    ),
    telefone: z
      .string()
      .transform(somenteDigitos)
      .transform((valor) => (valor === "" ? null : valor))
      .pipe(
        z
          .string()
          .regex(/^\d{10,11}$/, { error: "Informe o telefone com DDD (10 ou 11 dígitos)." })
          .nullable(),
      ),
    cep: z
      .string({ error: "Informe o CEP." })
      .transform(somenteDigitos)
      .pipe(z.string().length(8, { error: "O CEP deve ter 8 dígitos." })),
    logradouro: textoObrigatorio("o logradouro", 150),
    numero: textoObrigatorio("o número", 10),
    complemento: vazioParaNulo.pipe(
      z.string().max(60, { error: "Use no máximo 60 caracteres." }).nullable(),
    ),
    bairro: textoObrigatorio("o bairro", 80),
    cidade: textoObrigatorio("a cidade", 80),
    uf: z
      .string({ error: "Selecione a UF." })
      .trim()
      .toUpperCase()
      .pipe(z.enum(UFS, { error: "Selecione a UF." })),
  })
  .superRefine((dados, contexto) => {
    const valido =
      dados.tipoPessoa === "FISICA" ? validarCpf(dados.documento) : validarCnpj(dados.documento);
    if (!valido) {
      contexto.addIssue({
        code: "custom",
        path: ["documento"],
        message: dados.tipoPessoa === "FISICA" ? "CPF inválido." : "CNPJ inválido.",
      });
    }
  });

/** Valores como chegam do formulário (strings, ainda com máscara). */
export type ContribuinteEntrada = z.input<typeof contribuinteSchema>;
/** Dados validados e normalizados, prontos para o banco. */
export type ContribuinteDados = z.output<typeof contribuinteSchema>;
