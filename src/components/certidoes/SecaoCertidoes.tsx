import Link from "next/link";
import type { EstadoAcao } from "@/components/form/FormAcao";
import { FormAcao } from "@/components/form/FormAcao";
import { certidaoValida, formatarNumeroCertidao, TITULOS_CERTIDAO, type TipoCertidao } from "@/lib/certidao";
import { dataParaIso, formatarDataIso } from "@/lib/datas";
import { formatarDataHora } from "@/lib/formatacao";

type Certidao = { id: string; numero: number; ano: number; tipo: TipoCertidao; emitidaEm: Date; validaAte: Date };

type Props = {
  certidoes: Certidao[];
  hoje: string;
  /** Ausente quando o perfil não pode emitir. */
  emitir?: (estado: EstadoAcao, formData: FormData) => Promise<EstadoAcao>;
};

/** Seção "Certidões" da página do contribuinte: emitir uma nova e ver as já emitidas. */
export function SecaoCertidoes({ certidoes, hoje, emitir }: Props) {
  return (
    <section className="mt-8" aria-labelledby="titulo-certidoes">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="titulo-certidoes" className="text-lg font-semibold">
            Certidões
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            A certidão registra a situação fiscal do momento da emissão e vale por 30 dias.
          </p>
        </div>
        {emitir && <FormAcao acao={emitir} rotulo="Emitir certidão" rotuloPendente="Emitindo…" className="flex flex-col items-end gap-2" />}
      </div>

      {certidoes.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">Nenhuma certidão emitida.</p>
      ) : (
        <ul className="mt-3 divide-y divide-zinc-100 rounded-md border border-zinc-200 bg-white dark:divide-zinc-900 dark:border-zinc-800 dark:bg-zinc-950">
          {certidoes.map((certidao) => {
            const validaAte = dataParaIso(certidao.validaAte);
            const valida = certidaoValida(validaAte, hoje);
            return (
              <li key={certidao.id} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3 text-sm">
                <span>
                  <Link href={`/certidoes/${certidao.id}`} className="font-medium tabular-nums text-emerald-700 hover:underline dark:text-emerald-400">
                    {formatarNumeroCertidao(certidao.numero, certidao.ano)}
                  </Link>
                  <span className="ml-2">{TITULOS_CERTIDAO[certidao.tipo]}</span>
                </span>
                <span className="tabular-nums text-zinc-500">
                  {formatarDataHora(certidao.emitidaEm)} ·{" "}
                  {valida ? `válida até ${formatarDataIso(validaAte)}` : <span className="text-amber-700 dark:text-amber-400">vencida</span>}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
