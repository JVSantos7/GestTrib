import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { GraficoArrecadacao } from "@/components/painel/GraficoArrecadacao";
import { ROTULOS_ACAO } from "@/lib/auditoria";
import { formatarDataIso, hojeIso } from "@/lib/datas";
import { formatarReais } from "@/lib/decimal";
import { formatarDataHora } from "@/lib/formatacao";
import { formatarDataPorExtenso, ROTULOS_ENTIDADE } from "@/lib/painel";
import { ROTULOS_PERFIL } from "@/lib/permissoes";
import { formatarPercentual } from "@/lib/relatorios";
import { DIAS_A_VENCER, listarAtividadeRecente, resumirPainel } from "@/server/services/painel";
import { exigirPermissaoPagina, pode } from "@/server/sessao";

export const metadata: Metadata = { title: "Início" };

const CLASSE_CARTAO = "rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950";

function plural(quantidade: number, singular: string, plural: string) {
  return `${quantidade.toLocaleString("pt-BR")} ${quantidade === 1 ? singular : plural}`;
}

/** Card de um número do painel. O título leva à tela onde o número é detalhado. */
function CartaoNumero({ titulo, href, valor, children }: { titulo: string; href: string; valor: string; children?: ReactNode }) {
  return (
    <li className={CLASSE_CARTAO}>
      <h2 className="text-sm text-zinc-600 dark:text-zinc-400">
        <Link href={href} className="hover:text-emerald-700 hover:underline dark:hover:text-emerald-400">
          {titulo}
        </Link>
      </h2>
      <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{valor}</p>
      {children && <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{children}</div>}
    </li>
  );
}

export default async function Inicio() {
  const usuario = await exigirPermissaoPagina();
  // Os números vêm das mesmas consultas dos relatórios: quem não vê relatórios vê só a atividade.
  const [verNumeros, verUsuarios] = await Promise.all([pode({ relatorio: ["ver"] }), pode({ user: ["list"] })]);
  const [painel, atividade] = await Promise.all([
    verNumeros ? resumirPainel() : null,
    listarAtividadeRecente({ incluirUsuarios: verUsuarios }),
  ]);

  return (
    <div className="max-w-6xl">
      <h1 className="text-2xl font-semibold tracking-tight">Olá, {usuario.nome.split(" ")[0]}</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        {ROTULOS_PERFIL[usuario.perfil]} ·{" "}
        <span className="inline-block first-letter:uppercase">{formatarDataPorExtenso(hojeIso())}</span>
      </p>

      {painel && (
        <>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <CartaoNumero titulo="Contribuintes" href="/contribuintes" valor={painel.contribuintes.toLocaleString("pt-BR")}>
              {plural(painel.imoveis, "imóvel cadastrado", "imóveis cadastrados")}
            </CartaoNumero>

            <CartaoNumero
              titulo={`IPTU lançado em ${painel.exercicio}`}
              href={`/relatorios/lancamentos?exercicio=${painel.exercicio}`}
              valor={formatarReais(painel.lancado.valor)}
            >
              {painel.lancado.quantidade === 0
                ? "Nenhum lançamento no exercício"
                : plural(painel.lancado.quantidade, "lançamento", "lançamentos")}
            </CartaoNumero>

            <CartaoNumero
              titulo={`Arrecadado em ${painel.exercicio}`}
              href={`/relatorios/lancamentos?exercicio=${painel.exercicio}`}
              valor={formatarReais(painel.arrecadado.valor)}
            >
              <p>{formatarPercentual(painel.arrecadado.percentual)} do lançado</p>
              {/* Barra de progresso: quanto do lançado já entrou. */}
              <div
                role="meter"
                aria-label="Arrecadado do IPTU lançado"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.min(100, Number(painel.arrecadado.percentual))}
                aria-valuetext={formatarPercentual(painel.arrecadado.percentual)}
                className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
              >
                <div
                  className="h-full rounded-full bg-emerald-600 dark:bg-emerald-500"
                  style={{ width: `${Math.min(100, Number(painel.arrecadado.percentual))}%` }}
                />
              </div>
            </CartaoNumero>

            <CartaoNumero titulo="Em atraso" href="/relatorios/inadimplencia" valor={formatarReais(painel.emAtraso.valor)}>
              {painel.emAtraso.guias === 0
                ? "Nenhuma guia vencida"
                : `${plural(painel.emAtraso.devedores, "contribuinte", "contribuintes")} · ${plural(painel.emAtraso.guias, "guia", "guias")}`}
            </CartaoNumero>
          </ul>

          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <section aria-labelledby="titulo-arrecadacao" className={`${CLASSE_CARTAO} lg:col-span-2`}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 id="titulo-arrecadacao" className="font-semibold">
                  Arrecadação nos últimos {painel.arrecadacaoMensal.length} meses
                </h2>
                <Link href="/relatorios/arrecadacao" className="text-sm text-emerald-700 hover:underline dark:text-emerald-400">
                  Ver relatório
                </Link>
              </div>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Pela data do pagamento. Estornos não entram.</p>
              <GraficoArrecadacao meses={painel.arrecadacaoMensal} />
            </section>

            <section aria-labelledby="titulo-vencimentos" className={CLASSE_CARTAO}>
              <h2 id="titulo-vencimentos" className="font-semibold">
                Vence nos próximos {DIAS_A_VENCER} dias
              </h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                De hoje até {formatarDataIso(painel.aVencer.ate)}
              </p>
              <p className="mt-4 text-2xl font-semibold tracking-tight tabular-nums">{formatarReais(painel.aVencer.valor)}</p>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {painel.aVencer.quantidade === 0
                  ? "Nenhuma guia em aberto vence no período."
                  : `${plural(painel.aVencer.quantidade, "guia em aberto", "guias em aberto")}.`}
              </p>
              <Link href="/guias" className="mt-4 inline-block text-sm text-emerald-700 hover:underline dark:text-emerald-400">
                Ver guias
              </Link>
            </section>
          </div>
        </>
      )}

      <section aria-labelledby="titulo-atividade" className={`${CLASSE_CARTAO} mt-4`}>
        <h2 id="titulo-atividade" className="font-semibold">
          Atividade recente
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          As últimas alterações no sistema, a partir da auditoria. Operações em lote aparecem agrupadas.
        </p>
        {atividade.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">Nenhuma alteração registrada.</p>
        ) : (
          <ol className="mt-4 divide-y divide-zinc-100 dark:divide-zinc-900">
            {atividade.map((item) => {
              const acao = item.detalhe ?? ROTULOS_ACAO[item.acao];
              const entidade = ROTULOS_ENTIDADE[item.entidade] ?? item.entidade;
              const descricao = item.quantidade > 1 ? `${entidade} (${item.quantidade.toLocaleString("pt-BR")})` : entidade;
              return (
                <li key={item.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3 text-sm">
                  <span>
                    <span className="font-medium">{acao}</span>
                    <span className="text-zinc-600 dark:text-zinc-400">
                      {" · "}
                      {item.href ? (
                        <Link href={item.href} className="text-emerald-700 hover:underline dark:text-emerald-400">
                          {descricao}
                        </Link>
                      ) : (
                        descricao
                      )}
                      {" "}
                      por {item.responsavel ?? "Sistema (antes do login)"}
                    </span>
                  </span>
                  <time dateTime={item.criadoEm.toISOString()} className="tabular-nums text-zinc-500">
                    {formatarDataHora(item.criadoEm)}
                  </time>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}
