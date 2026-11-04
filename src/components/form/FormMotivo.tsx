"use client";

import { CLASSE_CAMPO } from "@/components/form/estilos";
import { FormAcao, type EstadoAcao } from "@/components/form/FormAcao";

type Props = {
  acao: (estado: EstadoAcao, formData: FormData) => Promise<EstadoAcao>;
  rotulo: string;
  rotuloPendente: string;
  confirmacao: string;
  placeholder: string;
};

/** Ação que desfaz algo (cancelar, estornar), com motivo obrigatório e confirmação. */
export function FormMotivo({ acao, rotulo, rotuloPendente, confirmacao, placeholder }: Props) {
  return (
    <FormAcao acao={acao} rotulo={rotulo} rotuloPendente={rotuloPendente} confirmacao={confirmacao} perigo>
      {(estado) => (
        <div>
          <label htmlFor="motivo" className="block text-sm font-medium">
            Motivo
          </label>
          <textarea
            id="motivo"
            name="motivo"
            rows={3}
            maxLength={300}
            aria-invalid={estado.erros?.motivo ? true : undefined}
            aria-describedby={estado.erros?.motivo ? "motivo-erro" : undefined}
            placeholder={placeholder}
            className={CLASSE_CAMPO}
          />
          {estado.erros?.motivo && (
            <p id="motivo-erro" className="mt-1 text-sm text-red-600 dark:text-red-400">
              {estado.erros.motivo}
            </p>
          )}
        </div>
      )}
    </FormAcao>
  );
}
