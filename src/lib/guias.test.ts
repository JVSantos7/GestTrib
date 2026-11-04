import { describe, expect, it } from "vitest";
import { dataParaIso, formatarDataIso, hojeIso, sugerirVencimento } from "./datas";
import { formatarNumeroGuia, rotuloParcela, situacaoExibida } from "./guias";

describe("situacaoExibida", () => {
  it("guia aberta vence só depois do dia do vencimento", () => {
    expect(situacaoExibida("ABERTA", "2026-03-10", "2026-03-10")).toBe("ABERTA");
    expect(situacaoExibida("ABERTA", "2026-03-10", "2026-03-11")).toBe("VENCIDA");
  });

  it("paga e cancelada não viram vencidas", () => {
    expect(situacaoExibida("PAGA", "2026-03-10", "2027-01-01")).toBe("PAGA");
    expect(situacaoExibida("CANCELADA", "2026-03-10", "2027-01-01")).toBe("CANCELADA");
  });
});

describe("formatação", () => {
  it("número e parcela", () => {
    expect(formatarNumeroGuia(42)).toBe("00000042");
    expect(rotuloParcela(1, 1)).toBe("Cota única");
    expect(rotuloParcela(2, 3)).toBe("2/3");
  });
});

describe("datas", () => {
  it("hoje é a data de São Paulo, não a de UTC", () => {
    // 02:00 UTC de 05/11 ainda é 23:00 de 04/11 em São Paulo.
    expect(hojeIso(new Date("2026-11-05T02:00:00Z"))).toBe("2026-11-04");
    expect(hojeIso(new Date("2026-11-05T03:00:00Z"))).toBe("2026-11-05");
  });

  it("converte e formata sem deslocar o dia", () => {
    expect(dataParaIso(new Date("2026-03-10T00:00:00Z"))).toBe("2026-03-10");
    expect(formatarDataIso("2026-03-10")).toBe("10/03/2026");
  });

  it("sugere o dia 10 do mês seguinte, virando o ano", () => {
    expect(sugerirVencimento("2026-11-04")).toBe("2026-12-10");
    expect(sugerirVencimento("2026-12-20")).toBe("2027-01-10");
  });
});
