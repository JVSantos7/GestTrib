import type { NextRequest } from "next/server";
import { decimalCsv, gerarCsv, respostaCsv } from "@/lib/csv";
import { lerFiltroExercicio } from "@/lib/schemas/filtros-relatorios";
import { ROTULOS_USO } from "@/lib/schemas/imovel";
import { listarExerciciosLancados, relatorioLancamentos } from "@/server/services/relatorios";
import { respostaSemPermissao } from "@/server/sessao";

/** CSV dos lançamentos de um exercício: uma linha por uso do imóvel e a linha de total. */
export async function GET(request: NextRequest) {
  const negado = await respostaSemPermissao({ relatorio: ["ver"] });
  if (negado) return negado;

  // Mesmo padrão da tela: sem exercício, o mais recente com lançamentos.
  const exercicio =
    lerFiltroExercicio(Object.fromEntries(request.nextUrl.searchParams)).exercicio ?? (await listarExerciciosLancados())[0];
  if (exercicio === undefined) return new Response("Nenhum IPTU lançado ainda.", { status: 404 });

  const { linhas, total } = await relatorioLancamentos(exercicio);
  // Percentual com vírgula, como o resto ("45,3"), e sem o "%" para o Excel tratar como número.
  const percentual = (valor: string) => valor.replace(".", ",");

  const csv = gerarCsv(
    ["Uso do imóvel", "Lançamentos", "Lançado", "Arrecadado", "A receber", "% arrecadado"],
    [
      ...linhas.map((linha) => [
        ROTULOS_USO[linha.uso],
        linha.quantidade,
        decimalCsv(linha.lancado),
        decimalCsv(linha.arrecadado),
        decimalCsv(linha.aReceber),
        percentual(linha.percentualArrecadado),
      ]),
      [
        "Total",
        total.quantidade,
        decimalCsv(total.lancado),
        decimalCsv(total.arrecadado),
        decimalCsv(total.aReceber),
        percentual(total.percentualArrecadado),
      ],
    ],
  );

  return respostaCsv(`lancamentos-iptu_${exercicio}.csv`, csv);
}
