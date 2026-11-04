"use client";

import { useState } from "react";
import { CLASSE_CAMPO } from "@/components/form/estilos";
import { FormAcao, type EstadoAcao } from "@/components/form/FormAcao";
import { formatarDataIso } from "@/lib/datas";
import { formatarReais } from "@/lib/decimal";
import { MAXIMO_PARCELAS, planejarParcelas } from "@/lib/parcelas";

type Props = {
  acao: (estado: EstadoAcao, formData: FormData) => Promise<EstadoAcao>;
  /** Valor do imposto, em texto decimal ("1800.00"). */
  total: string;
  hoje: string;
  vencimentoSugerido: string;
};

const OPCOES = Array.from({ length: MAXIMO_PARCELAS }, (_, i) => i + 1);

function Campos({ total, hoje, vencimentoSugerido, erros }: Omit<Props, "acao"> & { erros?: Record<string, string> }) {
  const [quantidade, setQuantidade] = useState(1);
  const [vencimento, setVencimento] = useState(vencimentoSugerido);

  // A prévia usa a mesma função que o servidor usa para gravar: o que aparece aqui é o que será emitido.
  let previa: ReturnType<typeof planejarParcelas> = [];
  try {
    previa = planejarParcelas(total, quantidade, vencimento);
  } catch {
    // Data incompleta enquanto o usuário digita: sem prévia.
  }

  return (
    <>
      <div className="flex flex-wrap gap-4">
        <div>
          <label htmlFor="quantidade" className="block text-sm font-medium">
            Forma de pagamento
          </label>
          <select
            id="quantidade"
            name="quantidade"
            value={quantidade}
            onChange={(evento) => setQuantidade(Number(evento.target.value))}
            className={CLASSE_CAMPO}
          >
            {OPCOES.map((n) => (
              <option key={n} value={n}>
                {n === 1 ? "Cota única" : `${n} parcelas`}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="primeiroVencimento" className="block text-sm font-medium">
            {quantidade === 1 ? "Vencimento" : "Vencimento da 1ª parcela"}
          </label>
          <input
            id="primeiroVencimento"
            name="primeiroVencimento"
            type="date"
            min={hoje}
            value={vencimento}
            onChange={(evento) => setVencimento(evento.target.value)}
            aria-invalid={erros?.primeiroVencimento ? true : undefined}
            className={CLASSE_CAMPO}
          />
          {erros?.primeiroVencimento && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{erros.primeiroVencimento}</p>
          )}
        </div>
      </div>

      {previa.length > 0 && (
        <table className="w-full max-w-md text-sm tabular-nums" aria-label="Prévia das guias">
          <thead className="text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th scope="col" className="py-1 text-left font-medium">Parcela</th>
              <th scope="col" className="py-1 text-left font-medium">Vencimento</th>
              <th scope="col" className="py-1 text-right font-medium">Valor</th>
            </tr>
          </thead>
          <tbody>
            {previa.map((p) => (
              <tr key={p.numero}>
                <td className="py-0.5">{previa.length === 1 ? "Única" : `${p.numero}/${previa.length}`}</td>
                <td className="py-0.5">{formatarDataIso(p.vencimento)}</td>
                <td className="py-0.5 text-right">{formatarReais(p.valor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

export function FormEmitirGuias({ acao, ...props }: Props) {
  return (
    <FormAcao acao={acao} rotulo="Emitir guias" rotuloPendente="Emitindo…">
      {(estado) => <Campos {...props} erros={estado.erros} />}
    </FormAcao>
  );
}
