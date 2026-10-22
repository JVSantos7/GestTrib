import { createAccessControl } from "better-auth/plugins/access";
import { adminAc, defaultStatements } from "better-auth/plugins/admin/access";

// O que existe para ser protegido (recurso) e o que dá para fazer com cada um (ação).
// `defaultStatements` traz as ações de gestão de usuários do plugin admin (criar, bloquear...).
const recursos = {
  ...defaultStatements,
  contribuinte: ["ver", "criar", "editar", "excluir"],
  imovel: ["ver", "criar", "editar", "excluir"],
} as const;

export const ac = createAccessControl(recursos);

// Cada perfil é uma lista do que ele pode fazer. Quem não está na lista, não pode.
export const perfis = {
  administrador: ac.newRole({
    ...adminAc.statements,
    contribuinte: ["ver", "criar", "editar", "excluir"],
    imovel: ["ver", "criar", "editar", "excluir"],
  }),
  operador: ac.newRole({
    contribuinte: ["ver", "criar", "editar", "excluir"],
    imovel: ["ver", "criar", "editar", "excluir"],
  }),
  consulta: ac.newRole({
    contribuinte: ["ver"],
    imovel: ["ver"],
  }),
};

export type Perfil = keyof typeof perfis;

export const ROTULOS_PERFIL: Record<Perfil, string> = {
  administrador: "Administrador",
  operador: "Operador",
  consulta: "Consulta",
};
