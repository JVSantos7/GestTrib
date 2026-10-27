"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { EstadoFormularioParametros } from "@/app/(sistema)/iptu/parametros/actions";
import { CLASSE_BOTAO_PRIMARIO, CLASSE_BOTAO_SECUNDARIO, CLASSE_CAMPO } from "@/components/form/estilos";
import { campoTerreno } from "@/lib/schemas/parametros-iptu";

export type SetorDoFormulario = { setor: string; bairros: string | null; imoveis: number };

type Props = {
  acao: (estado: EstadoFormularioParametros, formData: FormData) => Promise<EstadoFormularioParametros>;
  valoresIniciais: Record<string, string>;
  setores: SetorDoFormulario[];
  /** Na edição o exercício só é exibido: ele identifica o registro. */
  exercicioFixo?: number;
  rotuloEnviar: string;
  hrefCancelar: string;
};

export function FormParametrosIptu({ acao, valoresIniciais, setores, exercicioFixo, rotuloEnviar, hrefCancelar }: Props) {
  const [estado, enviar, pendente] = useActionState(acao, {});
  const valores = estado.valores ?? valoresIniciais;

  function campo(nome: string, rotulo: string, sufixo: string, dica?: string) {
    const erro = estado.erros?.[nome];
    return (
      <div key={nome}>
        <label htmlFor={nome} className="block text-sm font-medium">
          {rotulo}
        </label>
        <div className="relative">
          <input
            id={nome}
            name={nome}
            inputMode="decimal"
            defaultValue={valores[nome] ?? ""}
            aria-invalid={erro ? true : undefined}
            aria-describedby={[erro && `${nome}-erro`, dica && `${nome}-dica`].filter(Boolean).join(" ") || undefined}
            className={`${CLASSE_CAMPO} pr-12 text-right tabular-nums`}
          />
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-zinc-500">
            {sufixo}
          </span>
        </div>
        {dica && (
          <p id={`${nome}-dica`} className="mt-1 text-xs text-zinc-500">
            {dica}
          </p>
        )}
        {erro && (
          <p id={`${nome}-erro`} className="mt-1 text-sm text-red-600 dark:text-red-400">
            {erro}
          </p>
        )}
      </div>
    );
  }

  const erroExercicio = estado.erros?.exercicio;

  return (
    // noValidate: a validação é a do servidor (Zod), com mensagens em português.
    <form action={enviar} noValidate className="max-w-3xl space-y-8">
      {estado.mensagem && (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
        >
          {estado.mensagem}
        </p>
      )}

      {exercicioFixo === undefined && (
        <div className="max-w-40">
          <label htmlFor="exercicio" className="block text-sm font-medium">
            Exercício (ano)
          </label>
          <input
            id="exercicio"
            name="exercicio"
            inputMode="numeric"
            maxLength={4}
            defaultValue={valores.exercicio ?? ""}
            aria-invalid={erroExercicio ? true : undefined}
            aria-describedby={erroExercicio ? "exercicio-erro" : undefined}
            className={`${CLASSE_CAMPO} tabular-nums`}
          />
          {erroExercicio && (
            <p id="exercicio-erro" className="mt-1 text-sm text-red-600 dark:text-red-400">
              {erroExercicio}
            </p>
          )}
        </div>
      )}

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-1 text-base font-semibold">Alíquotas</legend>
        <p className="text-sm text-zinc-600 sm:col-span-2 dark:text-zinc-400">
          Percentual aplicado sobre o valor venal do imóvel, conforme o uso.
        </p>
        {campo("aliquotaResidencial", "Residencial", "%")}
        {campo("aliquotaComercial", "Comercial", "%")}
        {campo("aliquotaIndustrial", "Industrial", "%")}
        {campo("aliquotaTerreno", "Terreno sem construção", "%")}
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-3">
        <legend className="mb-1 text-base font-semibold">Valor do m² de construção</legend>
        {campo("valorM2Residencial", "Residencial", "R$")}
        {campo("valorM2Comercial", "Comercial", "R$")}
        {campo("valorM2Industrial", "Industrial", "R$")}
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-1 text-base font-semibold">Valor do m² de terreno por setor</legend>
        {setores.length === 0 ? (
          <p className="text-sm text-zinc-600 sm:col-span-2 dark:text-zinc-400">Nenhum imóvel cadastrado ainda.</p>
        ) : (
          setores.map(({ setor, bairros, imoveis }) =>
            campo(
              campoTerreno(setor),
              `Setor ${setor}`,
              "R$",
              imoveis > 0 ? `${bairros} · ${imoveis} ${imoveis === 1 ? "imóvel" : "imóveis"}` : "Sem imóveis ativos",
            ),
          )
        )}
      </fieldset>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={pendente} className={CLASSE_BOTAO_PRIMARIO}>
          {pendente ? "Salvando…" : rotuloEnviar}
        </button>
        <Link href={hrefCancelar} className={CLASSE_BOTAO_SECUNDARIO}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}
