import { formatarReais } from "@/lib/decimal";
import { alturaRelativa, type MesComValor } from "@/lib/painel";

/**
 * Barras da arrecadação mensal, em HTML/CSS (sem biblioteca de gráficos).
 * - Uma série só: uma cor para todas as barras; o título diz o que elas medem.
 * - Rótulo de valor só no mês atual; nos outros, aparece ao passar o mouse.
 * - As barras são só desenho (aria-hidden): os números de todos os meses ficam em "Ver em tabela",
 *   que serve a quem usa teclado ou leitor de tela.
 */
export function GraficoArrecadacao({ meses }: { meses: MesComValor[] }) {
  const maximo = meses.reduce((maior, mes) => (Number(mes.valor) > Number(maior) ? mes.valor : maior), "0.00");

  if (Number(maximo) === 0) {
    return <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">Nenhum pagamento nos últimos {meses.length} meses.</p>;
  }

  return (
    <>
      {/* pt-8: espaço acima da barra mais alta para o rótulo e a dica. */}
      <div aria-hidden className="mt-2 flex h-56 items-end gap-2 border-b pt-8 border-zinc-200 dark:border-zinc-800">
        {meses.map((mes, indice) => {
          const atual = indice === meses.length - 1;
          const altura = alturaRelativa(mes.valor, maximo);
          return (
            // A coluna inteira é a área de passar o mouse: mais fácil de acertar que uma barra baixa.
            <div key={mes.chave} className="group relative flex h-full flex-1 flex-col justify-end">
              {atual ? (
                <span className="mb-1 text-center text-xs font-medium text-zinc-700 tabular-nums dark:text-zinc-300">
                  {formatarReais(mes.valor)}
                </span>
              ) : (
                // Dica dos meses anteriores: aparece ao passar o mouse na coluna.
                <span
                  className="pointer-events-none absolute inset-x-0 z-10 mx-auto w-max rounded bg-zinc-900 px-2 py-1 text-xs text-white tabular-nums opacity-0 shadow-sm transition-opacity group-hover:opacity-100 dark:bg-zinc-100 dark:text-zinc-900"
                  style={{ bottom: `calc(${altura}% + 0.5rem)` }}
                >
                  <span className="inline-block first-letter:uppercase">{mes.rotuloLongo}</span>: {formatarReais(mes.valor)}
                </span>
              )}
              <div
                className="mx-auto w-full max-w-12 rounded-t bg-emerald-600 transition-colors group-hover:bg-emerald-700 dark:bg-emerald-500 dark:group-hover:bg-emerald-400"
                // Mês com valor, por menor que seja, mostra ao menos um traço.
                style={{ height: altura > 0 ? `max(${altura}%, 3px)` : "0" }}
              />
            </div>
          );
        })}
      </div>
      <div aria-hidden className="mt-2 flex gap-2">
        {meses.map((mes) => (
          <span key={mes.chave} className="flex-1 text-center text-xs text-zinc-500">
            {mes.rotulo}
          </span>
        ))}
      </div>

      <details className="mt-4 text-sm">
        <summary className="cursor-pointer text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
          Ver em tabela
        </summary>
        <table className="mt-2 w-full">
          <caption className="sr-only">Arrecadação por mês</caption>
          <thead>
            <tr>
              <th scope="col" className="py-1 text-left font-medium">Mês</th>
              <th scope="col" className="py-1 text-right font-medium">Arrecadado</th>
            </tr>
          </thead>
          <tbody>
            {meses.map((mes) => (
              <tr key={mes.chave} className="border-t border-zinc-100 dark:border-zinc-800">
                <th scope="row" className="py-1 text-left font-normal first-letter:uppercase">{mes.rotuloLongo}</th>
                <td className="py-1 text-right tabular-nums">{formatarReais(mes.valor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </>
  );
}
