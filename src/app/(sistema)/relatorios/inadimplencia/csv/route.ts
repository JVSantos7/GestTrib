import type { NextRequest } from "next/server";
import { decimalCsv, gerarCsv, respostaCsv } from "@/lib/csv";
import { formatarDataIso } from "@/lib/datas";
import { mascararDocumento } from "@/lib/documento";
import { lerFiltroExercicio } from "@/lib/schemas/filtros-relatorios";
import { relatorioInadimplencia } from "@/server/services/relatorios";
import { respostaSemPermissao } from "@/server/sessao";

/** CSV da inadimplência: um devedor por linha. */
export async function GET(request: NextRequest) {
  const negado = await respostaSemPermissao({ relatorio: ["ver"] });
  if (negado) return negado;

  const filtros = lerFiltroExercicio(Object.fromEntries(request.nextUrl.searchParams));
  const { hoje, devedores } = await relatorioInadimplencia(filtros);

  const csv = gerarCsv(
    ["Contribuinte", "CPF/CNPJ", "Guias vencidas", "Vencida desde", "Total vencido"],
    devedores.map((devedor) => [
      devedor.nome,
      mascararDocumento(devedor.documento),
      devedor.quantidadeGuias,
      formatarDataIso(devedor.vencimentoMaisAntigo),
      decimalCsv(devedor.total),
    ]),
  );

  // A data no nome do arquivo: a inadimplência muda todo dia, então é uma "foto" daquele dia.
  return respostaCsv(`inadimplencia_${filtros.exercicio ?? "todos"}_posicao_${hoje}.csv`, csv);
}
