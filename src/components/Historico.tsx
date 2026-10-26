import { ROTULOS_ACAO } from "@/lib/auditoria";
import { formatarDataHora } from "@/lib/formatacao";
import { listarHistorico } from "@/server/services/auditoria";

/** Seção "Histórico" das páginas de detalhes: quem fez o quê e quando, a partir da auditoria. */
export async function Historico({ entidade, entidadeId }: { entidade: string; entidadeId: string }) {
  const registros = await listarHistorico(entidade, entidadeId);

  return (
    <section className="mt-8" aria-labelledby="titulo-historico">
      <h2 id="titulo-historico" className="text-lg font-semibold">
        Histórico
      </h2>
      {registros.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">Nenhum registro.</p>
      ) : (
        <ol className="mt-3 divide-y divide-zinc-100 rounded-md border border-zinc-200 bg-white dark:divide-zinc-900 dark:border-zinc-800 dark:bg-zinc-950">
          {registros.map((registro) => (
            <li key={registro.id} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3 text-sm">
              <span>
                <span className="font-medium">{registro.detalhe ?? ROTULOS_ACAO[registro.acao]}</span>
                <span className="text-zinc-600 dark:text-zinc-400">
                  {" "}
                  por {registro.responsavel ?? "Sistema (antes do login)"}
                </span>
              </span>
              <time dateTime={registro.criadoEm.toISOString()} className="tabular-nums text-zinc-500">
                {formatarDataHora(registro.criadoEm)}
              </time>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
