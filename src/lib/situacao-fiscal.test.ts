import { describe, expect, it } from "vitest";
import { calcularSituacaoFiscal } from "./situacao-fiscal";

const HOJE = "2026-11-04";

describe("calcularSituacaoFiscal", () => {
  it("sem nada em aberto é regular, com tudo zerado", () => {
    expect(calcularSituacaoFiscal([], [], HOJE)).toEqual({
      situacao: "REGULAR",
      vencido: "0.00",
      quantidadeVencidas: 0,
      aVencer: "0.00",
      quantidadeAVencer: 0,
      aEmitir: "0.00",
      quantidadeAEmitir: 0,
      totalEmAberto: "0.00",
    });
  });

  it("guia que vence hoje ainda está no prazo", () => {
    const resumo = calcularSituacaoFiscal([{ valor: "100.00", vencimento: HOJE }], [], HOJE);
    expect(resumo.situacao).toBe("A_VENCER");
    expect(resumo.aVencer).toBe("100.00");
    expect(resumo.vencido).toBe("0.00");
  });

  it("guia que venceu ontem deixa o contribuinte irregular", () => {
    const resumo = calcularSituacaoFiscal([{ valor: "100.00", vencimento: "2026-11-03" }], [], HOJE);
    expect(resumo.situacao).toBe("IRREGULAR");
    expect(resumo.vencido).toBe("100.00");
    expect(resumo.quantidadeVencidas).toBe(1);
  });

  it("IPTU sem guia emitida conta como em aberto, mas não como vencido", () => {
    const resumo = calcularSituacaoFiscal([], ["250.10"], HOJE);
    expect(resumo.situacao).toBe("A_VENCER");
    expect(resumo.aEmitir).toBe("250.10");
    expect(resumo.quantidadeAEmitir).toBe(1);
    expect(resumo.totalEmAberto).toBe("250.10");
  });

  it("uma guia vencida basta para ser irregular, mesmo com outras no prazo", () => {
    const resumo = calcularSituacaoFiscal(
      [
        { valor: "33.33", vencimento: "2026-10-10" },
        { valor: "33.33", vencimento: "2026-11-10" },
        { valor: "33.34", vencimento: "2026-12-10" },
      ],
      [],
      HOJE,
    );
    expect(resumo.situacao).toBe("IRREGULAR");
    expect(resumo.vencido).toBe("33.33");
    expect(resumo.aVencer).toBe("66.67");
    expect(resumo.quantidadeAVencer).toBe(2);
    expect(resumo.totalEmAberto).toBe("100.00");
  });

  it("soma em decimal, sem erro de float", () => {
    const resumo = calcularSituacaoFiscal(
      [
        { valor: "0.10", vencimento: "2026-12-10" },
        { valor: "0.20", vencimento: "2026-12-10" },
      ],
      [],
      HOJE,
    );
    expect(resumo.aVencer).toBe("0.30");
  });
});
