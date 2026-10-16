import { z } from "zod";

// Peças de validação compartilhadas pelos formulários.

export const somenteDigitos = (valor: string) => valor.replace(/\D/g, "");

export function textoObrigatorio(campo: string, maximo: number) {
  return z
    .string({ error: `Informe ${campo}.` })
    .trim()
    .min(1, { error: `Informe ${campo}.` })
    .max(maximo, { error: `Use no máximo ${maximo} caracteres.` });
}

// Campo opcional de formulário: string vazia vira null antes de validar.
export const vazioParaNulo = z
  .string()
  .trim()
  .transform((valor) => (valor === "" ? null : valor));

export const cep = z
  .string({ error: "Informe o CEP." })
  .transform(somenteDigitos)
  .pipe(z.string().length(8, { error: "O CEP deve ter 8 dígitos." }));
