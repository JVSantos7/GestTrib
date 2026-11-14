import { describe, expect, it } from "vitest";
import {
  agruparAtividade,
  alturaRelativa,
  formatarDataPorExtenso,
  inicioDoMes,
  somarDias,
  somarPorMes,
  ultimosMeses,
  type RegistroAtividade,
} from "./painel";

describe("somarDias", () => {
  it("atravessa mês e ano", () => {
    expect(somarDias("2026-11-14", 30)).toBe("2026-12-14");
    expect(somarDias("2026-12-20", 15)).toBe("2027-01-04");
    expect(somarDias("2026-03-01", -1)).toBe("2026-02-28");
  });
});

describe("formatarDataPorExtenso", () => {
  it("escreve a data em português, sem deslocar o dia pelo fuso", () => {
    expect(formatarDataPorExtenso("2026-11-14")).toBe("sábado, 14 de novembro de 2026");
  });
});

describe("ultimosMeses", () => {
  it("devolve os meses do mais antigo ao atual, atravessando o ano", () => {
    const meses = ultimosMeses("2026-02-15", 4);
    expect(meses.map((mes) => mes.chave)).toEqual(["2025-11", "2025-12", "2026-01", "2026-02"]);
    expect(meses[0].rotulo).toBe("nov");
    expect(meses[3].rotuloLongo).toBe("fevereiro de 2026");
    expect(inicioDoMes(meses[0])).toBe("2025-11-01");
  });
});

describe("somarPorMes", () => {
  const meses = ultimosMeses("2026-11-14", 3); // set, out, nov

  it("soma os dias de cada mês e mantém meses sem pagamento com zero", () => {
    const dias = [
      { data: "2026-09-10", valor: "100.10" },
      { data: "2026-09-25", valor: "0.20" },
      { data: "2026-11-01", valor: "50.00" },
    ];
    expect(somarPorMes(dias, meses).map((mes) => mes.valor)).toEqual(["100.30", "0.00", "50.00"]);
  });

  it("ignora dias fora dos meses pedidos", () => {
    expect(somarPorMes([{ data: "2026-01-05", valor: "10.00" }], meses).map((mes) => mes.valor)).toEqual(["0.00", "0.00", "0.00"]);
  });
});

describe("alturaRelativa", () => {
  it("calcula a altura em % da maior barra", () => {
    expect(alturaRelativa("50.00", "200.00")).toBe(25);
    expect(alturaRelativa("200.00", "200.00")).toBe(100);
  });

  it("sem pagamentos, todas as barras ficam com zero", () => {
    expect(alturaRelativa("0.00", "0.00")).toBe(0);
  });
});

describe("agruparAtividade", () => {
  const base = new Date("2026-11-14T15:00:00Z").getTime();
  const registro = (id: string, segundosAtras: number, extra: Partial<RegistroAtividade> = {}): RegistroAtividade => ({
    id,
    entidade: "LancamentoIptu",
    entidadeId: `id-${id}`,
    acao: "CRIACAO",
    detalhe: null,
    usuarioId: "u1",
    responsavel: "Ana",
    criadoEm: new Date(base - segundosAtras * 1000),
    ...extra,
  });

  it("junta registros seguidos da mesma operação e tira o link do grupo", () => {
    const itens = agruparAtividade([registro("1", 0), registro("2", 0), registro("3", 1)], 8);
    expect(itens).toHaveLength(1);
    expect(itens[0]).toMatchObject({ id: "1", quantidade: 3, href: null });
  });

  it("separa autores, ações e operações distantes no tempo", () => {
    const itens = agruparAtividade(
      [
        registro("1", 0),
        registro("2", 0, { usuarioId: "u2" }),
        registro("3", 0, { usuarioId: "u2", acao: "ALTERACAO" }),
        registro("4", 600, { usuarioId: "u2", acao: "ALTERACAO" }),
      ],
      8,
    );
    expect(itens.map((item) => item.quantidade)).toEqual([1, 1, 1, 1]);
  });

  it("um registro só ganha link para a página dele, menos se foi excluído ou não tem página", () => {
    const itens = agruparAtividade(
      [
        registro("1", 0, { entidade: "Guia" }),
        registro("2", 120, { entidade: "Contribuinte", acao: "EXCLUSAO" }),
        registro("3", 240, { entidade: "ParametroIptu" }),
      ],
      8,
    );
    expect(itens.map((item) => item.href)).toEqual(["/guias/id-1", null, null]);
  });

  it("para no limite de itens", () => {
    const registros = Array.from({ length: 20 }, (_, indice) => registro(String(indice), indice * 120));
    expect(agruparAtividade(registros, 8)).toHaveLength(8);
  });
});
