import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/server/auth";

// Endereços /api/auth/* (entrar, sair, sessão) são atendidos pela biblioteca.
export const { GET, POST } = toNextJsHandler(auth);
