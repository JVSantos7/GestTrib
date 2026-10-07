// Validação e formatação de CPF e CNPJ. Funções puras, usadas no servidor (Zod) e na interface.

const PESOS_CNPJ = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

/** Remove a máscara e padroniza em maiúsculas (o CNPJ alfanumérico aceita letras). */
export function limparDocumento(valor: string): string {
  return valor.replace(/[^0-9a-zA-Z]/g, "").toUpperCase();
}

function todosIguais(valor: string): boolean {
  return valor.split("").every((caractere) => caractere === valor[0]);
}

function digitoModulo11(soma: number): number {
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

function digitoCpf(base: string): number {
  // Pesos decrescentes a partir de (tamanho + 1): 10..2 no 1º dígito, 11..2 no 2º.
  const soma = base
    .split("")
    .reduce((total, digito, i) => total + Number(digito) * (base.length + 1 - i), 0);
  return digitoModulo11(soma);
}

export function validarCpf(valor: string): boolean {
  const cpf = limparDocumento(valor);
  if (!/^\d{11}$/.test(cpf) || todosIguais(cpf)) return false;

  const primeiro = digitoCpf(cpf.slice(0, 9));
  const segundo = digitoCpf(cpf.slice(0, 10));
  return cpf.endsWith(`${primeiro}${segundo}`);
}

function digitoCnpj(base: string): number {
  const pesos = PESOS_CNPJ.slice(PESOS_CNPJ.length - base.length);
  // No CNPJ alfanumérico cada caractere vale seu código ASCII menos 48 ("0" = 0, "A" = 17).
  const soma = base
    .split("")
    .reduce((total, caractere, i) => total + (caractere.charCodeAt(0) - 48) * pesos[i], 0);
  return digitoModulo11(soma);
}

/** Aceita o CNPJ numérico e o alfanumérico (12 posições com letras ou dígitos + 2 dígitos verificadores). */
export function validarCnpj(valor: string): boolean {
  const cnpj = limparDocumento(valor);
  if (!/^[0-9A-Z]{12}\d{2}$/.test(cnpj) || todosIguais(cnpj)) return false;

  const primeiro = digitoCnpj(cnpj.slice(0, 12));
  const segundo = digitoCnpj(cnpj.slice(0, 13));
  return cnpj.endsWith(`${primeiro}${segundo}`);
}

export function formatarCpf(valor: string): string {
  const cpf = limparDocumento(valor);
  if (cpf.length !== 11) return valor;
  return cpf.replace(/^(.{3})(.{3})(.{3})(.{2})$/, "$1.$2.$3-$4");
}

export function formatarCnpj(valor: string): string {
  const cnpj = limparDocumento(valor);
  if (cnpj.length !== 14) return valor;
  return cnpj.replace(/^(.{2})(.{3})(.{3})(.{4})(.{2})$/, "$1.$2.$3/$4-$5");
}

export function formatarDocumento(valor: string): string {
  return limparDocumento(valor).length === 11 ? formatarCpf(valor) : formatarCnpj(valor);
}
