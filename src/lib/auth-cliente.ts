import { createAuthClient } from "better-auth/react";

// Lado do navegador do login: chama as rotas /api/auth/* do próprio sistema.
// O login passa por aqui (e não por uma Server Action) para valer o limite de tentativas,
// que a biblioteca aplica nas requisições HTTP.
export const authCliente = createAuthClient();
