import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { registrarPagamentoAcao } from "@/app/(sistema)/guias/actions";
import { BotaoImprimir } from "@/components/BotaoImprimir";
import { FormRegistrarPagamento } from "@/components/guias/FormRegistrarPagamento";
import { SituacaoGuia } from "@/components/guias/SituacaoGuia";
import { Historico } from "@/components/Historico";
import { dataParaIso, formatarDataIso, hojeIso } from "@/lib/datas";
import { formatarDecimalBr, formatarReais } from "@/lib/decimal";
import { formatarDocumento } from "@/lib/documento";
import { formatarCep, formatarDataHora } from "@/lib/formatacao";
import { formatarNumeroGuia, rotuloParcela, situacaoExibida } from "@/lib/guias";
import { MUNICIPIO } from "@/lib/municipio";
import { formatarInscricao } from "@/lib/schemas/imovel";
import { buscarGuia } from "@/server/services/guias";
import { exigirPermissaoPagina, pode } from "@/server/sessao";

export const metadata: Metadata = { title: "Guia" };

function Dado({ rotulo, children, destaque }: { rotulo: string; children: React.ReactNode; destaque?: boolean }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-zinc-500">{rotulo}</dt>
      <dd className={`mt-1 tabular-nums ${destaque ? "text-xl font-semibold" : "text-sm"}`}>{children}</dd>
    </div>
  );
}

export default async function DetalhesGuia({ params }: PageProps<"/guias/[id]">) {
  await exigirPermissaoPagina({ guia: ["ver"] });
  const { id } = await params;
  const [guia, podeBaixar] = await Promise.all([buscarGuia(id), pode({ guia: ["baixar"] })]);
  if (!guia) notFound();

  const { lancamento } = guia;
  const { contribuinte, imovel } = lancamento;
  const vencimento = dataParaIso(guia.vencimento);
  const hoje = hojeIso();
  const situacao = situacaoExibida(guia.situacao, vencimento, hoje);
  const pagamento = guia.pagamentos.find((p) => p.vigente);
  const endereco = [`${imovel.logradouro}, ${imovel.numero}`, imovel.complemento, imovel.bairro].filter(Boolean).join(" · ");

  return (
    <div className="max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/guias" className="text-sm text-emerald-700 hover:underline dark:text-emerald-400">
          ← Guias
        </Link>
        <BotaoImprimir />
      </div>

      {/* O documento: é o que sai na impressão. */}
      <article className="mt-4 rounded-md border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950 print:border-zinc-400">
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-200 pb-4 dark:border-zinc-800">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              Município de {MUNICIPIO.nome}/{MUNICIPIO.uf} · Documento fictício
            </p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight">Guia de pagamento do IPTU {lancamento.exercicio}</h1>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Guia nº</p>
            <p className="text-lg font-semibold tabular-nums">{formatarNumeroGuia(guia.numero)}</p>
          </div>
        </header>

        <dl className="mt-5 grid gap-5 sm:grid-cols-2">
          <Dado rotulo="Contribuinte">
            <Link href={`/contribuintes/${contribuinte.id}`} className="font-medium hover:underline print:no-underline">
              {contribuinte.nome}
            </Link>
            <span className="block text-zinc-500">{formatarDocumento(contribuinte.documento)}</span>
          </Dado>
          <Dado rotulo="Imóvel">
            <Link href={`/imoveis/${imovel.id}`} className="font-medium hover:underline print:no-underline">
              {formatarInscricao(lancamento.inscricao)}
            </Link>
            <span className="block text-zinc-500">
              {endereco} · CEP {formatarCep(imovel.cep)}
            </span>
          </Dado>
          <Dado rotulo="Parcela">{rotuloParcela(guia.parcela, guia.totalParcelas)}</Dado>
          <Dado rotulo="Lançamento">
            <Link href={`/iptu/${lancamento.id}`} className="hover:underline print:no-underline">
              IPTU {lancamento.exercicio} · total {formatarReais(lancamento.valorImposto)}
            </Link>
          </Dado>
        </dl>

        <dl className="mt-6 grid gap-5 rounded-md bg-zinc-50 p-4 sm:grid-cols-3 dark:bg-zinc-900 print:bg-white">
          <Dado rotulo="Vencimento" destaque>
            {formatarDataIso(vencimento)}
          </Dado>
          <Dado rotulo="Valor" destaque>
            {formatarReais(guia.valor)}
          </Dado>
          <Dado rotulo="Situação">
            <SituacaoGuia situacao={situacao} />
          </Dado>
        </dl>

        {pagamento && (
          <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200 print:bg-white">
            Pago em {formatarDataIso(dataParaIso(pagamento.dataPagamento))}: {formatarReais(pagamento.valorPago)}
            {dataParaIso(pagamento.dataPagamento) > vencimento && " (após o vencimento)"}. Baixa registrada em{" "}
            {formatarDataHora(pagamento.criadoEm)}.
          </p>
        )}

        <p className="mt-5 text-xs text-zinc-500">
          Emitida em {formatarDataHora(guia.criadoEm)}
          {guia.canceladaEm && ` · cancelada em ${formatarDataHora(guia.canceladaEm)}`}. Projeto de portfólio: sem código de
          barras e sem validade para pagamento.
        </p>
      </article>

      {guia.situacao === "ABERTA" && podeBaixar && (
        <section className="mt-8 rounded-md border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950 print:hidden">
          <h2 className="mb-1 text-base font-semibold">Registrar pagamento</h2>
          <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
            Informe o dia em que o contribuinte pagou e o valor recebido, que deve ser igual ao da guia.
          </p>
          <FormRegistrarPagamento
            acao={registrarPagamentoAcao.bind(null, guia.id)}
            hoje={hoje}
            valor={formatarDecimalBr(guia.valor)}
          />
        </section>
      )}

      <div className="print:hidden">
        <Historico entidade="Guia" entidadeId={guia.id} />
      </div>
    </div>
  );
}
