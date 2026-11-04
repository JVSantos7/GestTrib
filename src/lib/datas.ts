// Datas sem hora (vencimento, pagamento) viajam como texto ISO "2026-03-10".
// Assim o fuso horário do servidor ou do navegador não desloca o dia.

const FUSO = "America/Sao_Paulo";

// O formato do Canadá (en-CA) já é ano-mês-dia.
const isoNoFuso = new Intl.DateTimeFormat("en-CA", { timeZone: FUSO, year: "numeric", month: "2-digit", day: "2-digit" });

/** A data de hoje no município ("2026-11-04"), não a do relógio UTC do servidor. */
export function hojeIso(agora: Date = new Date()): string {
  return isoNoFuso.format(agora);
}

/** Uma coluna `date` do banco chega como meia-noite UTC; aqui vira só a data. */
export function dataParaIso(data: Date): string {
  return data.toISOString().slice(0, 10);
}

/** "2026-03-10" → "10/03/2026". */
export function formatarDataIso(iso: string): string {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

/** Sugestão de primeiro vencimento: dia 10 do mês seguinte. */
export function sugerirVencimento(hoje: string): string {
  const [ano, mes] = hoje.split("-").map(Number);
  const proximo = new Date(Date.UTC(ano, mes, 10));
  return dataParaIso(proximo);
}
