"use client";

import { CLASSE_CAMPO } from "@/components/form/estilos";
import { FormAcao, type EstadoAcao } from "@/components/form/FormAcao";

type Props = {
  acao: (estado: EstadoAcao, formData: FormData) => Promise<EstadoAcao>;
  hoje: string;
  /** Valor da guia já formatado ("600,00"), como sugestão. */
  valor: string;
};

function Erro({ id, mensagem }: { id: string; mensagem?: string }) {
  if (!mensagem) return null;
  return (
    <p id={id} className="mt-1 text-sm text-red-600 dark:text-red-400">
      {mensagem}
    </p>
  );
}

export function FormRegistrarPagamento({ acao, hoje, valor }: Props) {
  return (
    <FormAcao
      acao={acao}
      rotulo="Registrar pagamento"
      rotuloPendente="Registrando…"
      confirmacao="Registrar o pagamento desta guia?"
    >
      {(estado) => (
        <div className="flex flex-wrap gap-4">
          <div>
            <label htmlFor="dataPagamento" className="block text-sm font-medium">
              Data do pagamento
            </label>
            <input
              id="dataPagamento"
              name="dataPagamento"
              type="date"
              max={hoje}
              defaultValue={hoje}
              aria-invalid={estado.erros?.dataPagamento ? true : undefined}
              aria-describedby={estado.erros?.dataPagamento ? "dataPagamento-erro" : undefined}
              className={CLASSE_CAMPO}
            />
            <Erro id="dataPagamento-erro" mensagem={estado.erros?.dataPagamento} />
          </div>
          <div>
            <label htmlFor="valorPago" className="block text-sm font-medium">
              Valor pago (R$)
            </label>
            <input
              id="valorPago"
              name="valorPago"
              inputMode="decimal"
              defaultValue={valor}
              aria-invalid={estado.erros?.valorPago ? true : undefined}
              aria-describedby={estado.erros?.valorPago ? "valorPago-erro" : undefined}
              className={`${CLASSE_CAMPO} text-right tabular-nums`}
            />
            <Erro id="valorPago-erro" mensagem={estado.erros?.valorPago} />
          </div>
        </div>
      )}
    </FormAcao>
  );
}
