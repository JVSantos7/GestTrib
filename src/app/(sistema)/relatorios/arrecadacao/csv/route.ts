import type { NextRequest } from "next/server";
import { decimalCsv, gerarCsv, respostaCsv } from "@/lib/csv";
import { dataParaIso, formatarDataIso, hojeIso } from "@/lib/datas";
import { mascararDocumento } from "@/lib/documento";
import { lerFiltrosArrecadacao } from "@/lib/schemas/filtros-relatorios";
import { formatarInscricao } from "@/lib/schemas/imovel";
import { listarPagamentosDoPeriodo } from "@/server/services/relatorios";
import { respostaSemPermissao } from "@/server/sessao";

/** CSV da arrecadação: um pagamento por linha. */
export async function GET(request: NextRequest) {
  // O proxy só viu que existe um cookie; aqui é a conferência de verdade, como numa action.
  const negado = await respostaSemPermissao({ relatorio: ["ver"] });
  if (negado) return negado;

  const filtros = lerFiltrosArrecadacao(Object.fromEntries(request.nextUrl.searchParams), hojeIso());
  const pagamentos = await listarPagamentosDoPeriodo(filtros);

  const csv = gerarCsv(
    // Parcela e total em colunas separadas: "2/3" numa célula o Excel transformaria na data 02/março.
    ["Data do pagamento", "Guia", "Exercício", "Inscrição", "Parcela", "Total de parcelas", "Contribuinte", "CPF/CNPJ", "Valor pago"],
    pagamentos.map((pagamento) => {
      const { guia } = pagamento;
      const { lancamento } = guia;
      return [
        formatarDataIso(dataParaIso(pagamento.dataPagamento)),
        guia.numero,
        lancamento.exercicio,
        formatarInscricao(lancamento.inscricao),
        guia.parcela,
        guia.totalParcelas,
        lancamento.contribuinte.nome,
        // Mesma regra da tela: CPF mascarado. Um arquivo baixado circula mais que uma tela.
        mascararDocumento(lancamento.contribuinte.documento),
        decimalCsv(pagamento.valorPago),
      ];
    }),
  );

  return respostaCsv(`arrecadacao_${filtros.de}_a_${filtros.ate}.csv`, csv);
}
