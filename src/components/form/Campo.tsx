import { CLASSE_CAMPO } from "@/components/form/estilos";

type Props = {
  nome: string;
  rotulo: string;
  erro?: string;
  tipo?: "text" | "email" | "password";
  autoComplete?: string;
  maximo?: number;
};

/** Campo de texto com rótulo e mensagem de erro ligada a ele (para leitores de tela). */
export function Campo({ nome, rotulo, erro, tipo = "text", autoComplete, maximo }: Props) {
  return (
    <div>
      <label htmlFor={nome} className="block text-sm font-medium">
        {rotulo}
      </label>
      <input
        id={nome}
        name={nome}
        type={tipo}
        autoComplete={autoComplete}
        maxLength={maximo}
        aria-invalid={erro ? true : undefined}
        aria-describedby={erro ? `${nome}-erro` : undefined}
        className={CLASSE_CAMPO}
      />
      {erro && (
        <p id={`${nome}-erro`} className="mt-1 text-sm text-red-600 dark:text-red-400">
          {erro}
        </p>
      )}
    </div>
  );
}
