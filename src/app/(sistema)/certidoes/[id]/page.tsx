import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BotaoImprimir } from "@/components/BotaoImprimir";
import { certidaoValida, formatarNumeroCertidao, TITULOS_CERTIDAO, type TipoCertidao } from "@/lib/certidao";
import { dataParaIso, formatarDataIso, hojeIso } from "@/lib/datas";
import { formatarReais } from "@/lib/decimal";
import { formatarDocumento } from "@/lib/documento";
import { formatarDataHora } from "@/lib/formatacao";
import { formatarNumeroGuia, rotuloParcela } from "@/lib/guias";
import { MUNICIPIO } from "@/lib/municipio";
import { formatarInscricao } from "@/lib/schemas/imovel";
import { buscarCertidao } from "@/server/services/certidoes";
import { exigirPermissaoPagina } from "@/server/sessao";

export const metadata: Metadata = { title: "Certidão" };

const TEXTOS: Record<TipoCertidao, string> = {
  NEGATIVA:
    "Certificamos que, até a data e hora de emissão desta certidão, não constam débitos de IPTU em nome do contribuinte acima identificado.",
  POSITIVA_EFEITO_NEGATIVA:
    "Certificamos que constam em nome do contribuinte acima identificado os débitos de IPTU relacionados abaixo, todos ainda não vencidos. Nos termos do art. 206 do Código Tributário Nacional, esta certidão tem os mesmos efeitos da certidão negativa.",
  POSITIVA:
    "Certificamos que constam em nome do contribuinte acima identificado os débitos de IPTU relacionados abaixo, havendo débitos vencidos e não pagos.",
};

export default async function DetalhesCertidao({ params }: PageProps<"/certidoes/[id]">) {
  await exigirPermissaoPagina({ certidao: ["ver"] });
  const { id } = await params;
  const certidao = await buscarCertidao(id);
  if (!certidao) notFound();

  const validaAte = dataParaIso(certidao.validaAte);
  const valida = certidaoValida(validaAte, hojeIso());
  const { resumo, guias, aEmitir } = certidao.debitos;

  return (
    <div className="max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/contribuintes/${certidao.contribuinteId}`} className="text-sm text-emerald-700 hover:underline dark:text-emerald-400">
          ← Contribuinte
        </Link>
        <BotaoImprimir />
      </div>

      {!valida && (
        <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200 print:hidden">
          Esta certidão venceu em {formatarDataIso(validaAte)}. Para uma situação atualizada, emita uma nova.
        </p>
      )}

      {/* O documento: é o que sai na impressão. */}
      <article className="mt-4 rounded-md border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950 print:border-zinc-400">
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-200 pb-4 dark:border-zinc-800">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              Município de {MUNICIPIO.nome}/{MUNICIPIO.uf} · Documento fictício
            </p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight">{TITULOS_CERTIDAO[certidao.tipo]}</h1>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Certidão nº</p>
            <p className="text-lg font-semibold tabular-nums">{formatarNumeroCertidao(certidao.numero, certidao.ano)}</p>
          </div>
        </header>

        <dl className="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-zinc-500">Contribuinte</dt>
            <dd className="mt-1 text-sm font-medium">{certidao.nome}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-zinc-500">{certidao.documento.length === 11 ? "CPF" : "CNPJ"}</dt>
            <dd className="mt-1 text-sm tabular-nums">{formatarDocumento(certidao.documento)}</dd>
          </div>
        </dl>

        <p className="mt-6 text-sm leading-relaxed">{TEXTOS[certidao.tipo]}</p>

        {certidao.tipo !== "NEGATIVA" && (
          <>
            <table className="mt-5 w-full text-left text-sm">
              <caption className="sr-only">Débitos certificados</caption>
              <thead className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800">
                <tr>
                  <th scope="col" className="py-2 pr-3 font-medium">Débito</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Parcela</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Vencimento</th>
                  <th scope="col" className="py-2 text-right font-medium">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                {guias.map((guia) => (
                  <tr key={guia.numero}>
                    <td className="py-2 pr-3 tabular-nums">
                      IPTU {guia.exercicio} · {formatarInscricao(guia.inscricao)}
                      <span className="block text-xs text-zinc-500">Guia {formatarNumeroGuia(guia.numero)}</span>
                    </td>
                    <td className="py-2 pr-3">{rotuloParcela(guia.parcela, guia.totalParcelas)}</td>
                    <td className="py-2 pr-3 tabular-nums">
                      {formatarDataIso(guia.vencimento)}
                      {guia.vencimento < dataParaIso(certidao.emitidaEm) && <span className="ml-1 text-xs text-red-700 dark:text-red-400">(vencida)</span>}
                    </td>
                    <td className="py-2 text-right tabular-nums">{formatarReais(guia.valor)}</td>
                  </tr>
                ))}
                {aEmitir.map((item) => (
                  <tr key={`${item.exercicio}-${item.inscricao}`}>
                    <td className="py-2 pr-3 tabular-nums">
                      IPTU {item.exercicio} · {formatarInscricao(item.inscricao)}
                    </td>
                    <td className="py-2 pr-3 text-zinc-500" colSpan={2}>
                      Guia ainda não emitida
                    </td>
                    <td className="py-2 text-right tabular-nums">{formatarReais(item.valor)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-zinc-200 font-semibold dark:border-zinc-800">
                <tr>
                  <td className="py-2" colSpan={3}>
                    Total
                  </td>
                  <td className="py-2 text-right tabular-nums">{formatarReais(resumo.totalEmAberto)}</td>
                </tr>
              </tfoot>
            </table>
            <p className="mt-2 text-xs text-zinc-500">Valores originais, sem juros, multa ou correção.</p>
          </>
        )}

        <dl className="mt-6 grid gap-5 rounded-md bg-zinc-50 p-4 sm:grid-cols-3 dark:bg-zinc-900 print:bg-white">
          <div>
            <dt className="text-xs uppercase tracking-wide text-zinc-500">Emitida em</dt>
            <dd className="mt-1 text-sm tabular-nums">{formatarDataHora(certidao.emitidaEm)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-zinc-500">Válida até</dt>
            <dd className="mt-1 text-sm tabular-nums">{formatarDataIso(validaAte)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-zinc-500">Código de validação</dt>
            <dd className="mt-1 font-mono text-sm font-semibold">{certidao.codigo}</dd>
          </div>
        </dl>

        <p className="mt-5 text-xs text-zinc-500">
          A autenticidade desta certidão pode ser conferida no GestTrib, em “Validar certidão” (endereço /validar-certidao),
          informando o código acima. Projeto de portfólio: documento sem valor legal.
        </p>
      </article>
    </div>
  );
}
