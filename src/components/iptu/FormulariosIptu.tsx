"use client";

import { CLASSE_CAMPO } from "@/components/form/estilos";
import { FormAcao, type EstadoAcao } from "@/components/form/FormAcao";

type Acao = (estado: EstadoAcao, formData: FormData) => Promise<EstadoAcao>;

function SelecaoExercicio({ id, exercicios }: { id: string; exercicios: number[] }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium">
        Exercício
      </label>
      <select id={id} name="exercicio" defaultValue={exercicios[0]} className={`${CLASSE_CAMPO} min-w-32`}>
        {exercicios.map((exercicio) => (
          <option key={exercicio} value={exercicio}>
            {exercicio}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Lança o IPTU de todos os imóveis ainda sem lançamento vigente no exercício escolhido. */
export function FormLancarExercicio({ acao, exercicios }: { acao: Acao; exercicios: number[] }) {
  return (
    <FormAcao
      acao={acao}
      rotulo="Lançar para todos os imóveis"
      rotuloPendente="Lançando…"
      confirmacao="Lançar o IPTU de todos os imóveis que ainda não têm lançamento vigente neste exercício?"
      className="flex flex-wrap items-end gap-3"
    >
      {() => <SelecaoExercicio id="exercicio-todos" exercicios={exercicios} />}
    </FormAcao>
  );
}

export function FormLancarImovel({ acao, exercicios }: { acao: Acao; exercicios: number[] }) {
  return (
    <FormAcao acao={acao} rotulo="Lançar IPTU" rotuloPendente="Lançando…" className="flex flex-wrap items-end gap-3">
      {() => <SelecaoExercicio id="exercicio-imovel" exercicios={exercicios} />}
    </FormAcao>
  );
}

export function FormCancelarLancamento({ acao }: { acao: Acao }) {
  return (
    <FormAcao
      acao={acao}
      rotulo="Cancelar lançamento"
      rotuloPendente="Cancelando…"
      confirmacao="Cancelar este lançamento? Ele continua registrado, mas deixa de ser devido."
      perigo
    >
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
            placeholder="Ex.: área construída cadastrada errada; será relançado após a correção."
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
