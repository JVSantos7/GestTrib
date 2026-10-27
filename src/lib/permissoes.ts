import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements } from "better-auth/plugins/admin/access";

// O que existe para ser protegido (recurso) e o que dá para fazer com cada um (ação).
// `defaultStatements` traz as ações de gestão de usuários do plugin admin (criar, bloquear...).
const recursos = {
  ...defaultStatements,
  contribuinte: ["ver", "criar", "editar", "excluir"],
  imovel: ["ver", "criar", "editar", "excluir"],
  parametroIptu: ["ver", "editar"],
} as const;

export const ac = createAccessControl(recursos);

// Cada perfil é uma lista do que ele pode fazer. Quem não está na lista, não pode.
export const perfis = {
  administrador: ac.newRole({
    // Gestão de usuários do plugin admin, sem "impersonate" (entrar como outra pessoa)
    // e sem "delete" (usuários são desativados, não apagados, para a auditoria continuar fazendo sentido).
    user: ["create", "list", "set-role", "ban", "get", "update", "set-password"],
    session: ["list", "revoke"],
    contribuinte: ["ver", "criar", "editar", "excluir"],
    imovel: ["ver", "criar", "editar", "excluir"],
    parametroIptu: ["ver", "editar"],
  }),
  operador: ac.newRole({
    contribuinte: ["ver", "criar", "editar", "excluir"],
    imovel: ["ver", "criar", "editar", "excluir"],
    parametroIptu: ["ver"],
  }),
  consulta: ac.newRole({
    contribuinte: ["ver"],
    imovel: ["ver"],
    parametroIptu: ["ver"],
  }),
};

export type Perfil = keyof typeof perfis;

export const PERFIS = Object.keys(perfis) as Perfil[];

export const ROTULOS_PERFIL: Record<Perfil, string> = {
  administrador: "Administrador",
  operador: "Operador",
  consulta: "Consulta",
};
