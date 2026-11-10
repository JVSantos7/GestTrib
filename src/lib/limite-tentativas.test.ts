import { describe, expect, it } from "vitest";
import { criarLimitador } from "./limite-tentativas";

describe("criarLimitador", () => {
  it("permite até o máximo dentro da janela e recusa a seguinte", () => {
    const limitador = criarLimitador({ maximo: 3, janelaMs: 60_000 });
    expect([1, 2, 3].map(() => limitador.permitir("1.2.3.4", 0))).toEqual([true, true, true]);
    expect(limitador.permitir("1.2.3.4", 59_999)).toBe(false);
  });

  it("libera de novo quando as tentativas antigas saem da janela", () => {
    const limitador = criarLimitador({ maximo: 1, janelaMs: 60_000 });
    expect(limitador.permitir("1.2.3.4", 0)).toBe(true);
    expect(limitador.permitir("1.2.3.4", 30_000)).toBe(false);
    expect(limitador.permitir("1.2.3.4", 60_000)).toBe(true);
  });

  it("conta cada chave separadamente", () => {
    const limitador = criarLimitador({ maximo: 1, janelaMs: 60_000 });
    expect(limitador.permitir("1.1.1.1", 0)).toBe(true);
    expect(limitador.permitir("2.2.2.2", 0)).toBe(true);
    expect(limitador.permitir("1.1.1.1", 0)).toBe(false);
  });
});
