import { ROTULOS_PERFIL, type Perfil } from "@/lib/permissoes";

export const ROTULOS_ACAO = {
  CRIACAO: "Cadastro",
  ALTERACAO: "Alteração",
  EXCLUSAO: "Exclusão",
} as const;

function rotuloPerfil(valor: unknown): string {
  if (typeof valor !== "string") return "—";
  return ROTULOS_PERFIL[valor as Perfil] ?? valor;
}

/**
 * Resumo legível de uma alteração pontual de usuário, gravada como { campo, de?, para }
 * (ex.: "Perfil: Operador → Consulta"). Para os retratos completos de contribuinte e imóvel, null.
 */
export function descreverDetalhe(dados: unknown): string | null {
  if (typeof dados !== "object" || dados === null) return null;
  const { campo, de, para } = dados as Record<string, unknown>;
  switch (campo) {
    case "perfil":
      return `Perfil: ${rotuloPerfil(de)} → ${rotuloPerfil(para)}`;
    case "situacao":
      return para === "ativo" ? "Usuário reativado" : "Usuário desativado";
    case "senha":
      return "Senha redefinida";
    default:
      return null;
  }
}
