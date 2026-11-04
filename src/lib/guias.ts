export type SituacaoGuiaBanco = "ABERTA" | "PAGA" | "CANCELADA";
/** "VENCIDA" não existe no banco: é uma guia ABERTA cujo vencimento já passou. */
export type SituacaoGuiaExibida = SituacaoGuiaBanco | "VENCIDA";

export const ROTULOS_SITUACAO_GUIA: Record<SituacaoGuiaExibida, string> = {
  ABERTA: "Aberta",
  VENCIDA: "Vencida",
  PAGA: "Paga",
  CANCELADA: "Cancelada",
};

/** Vencida a partir do dia seguinte ao vencimento (no próprio dia ainda pode pagar). */
export function situacaoExibida(situacao: SituacaoGuiaBanco, vencimento: string, hoje: string): SituacaoGuiaExibida {
  // Datas ISO ("2026-03-10") podem ser comparadas como texto: a ordem alfabética é a cronológica.
  return situacao === "ABERTA" && vencimento < hoje ? "VENCIDA" : situacao;
}

/** 42 → "00000042". */
export function formatarNumeroGuia(numero: number): string {
  return String(numero).padStart(8, "0");
}

/** "Cota única" ou "2/3". */
export function rotuloParcela(parcela: number, totalParcelas: number): string {
  return totalParcelas === 1 ? "Cota única" : `${parcela}/${totalParcelas}`;
}
