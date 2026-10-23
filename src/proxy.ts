import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Primeira barreira, antes de qualquer página: sem o cookie de sessão, vai para o login.
 *
 * É uma checagem "otimista": só vê se o cookie EXISTE, sem consultar o banco
 * (um cookie inventado passaria daqui). A conferência de verdade — sessão válida
 * e permissão do perfil — é feita em cada página e em cada action, no servidor.
 */
export function proxy(request: NextRequest) {
  if (getSessionCookie(request)) return NextResponse.next();

  const login = new URL("/login", request.url);
  const { pathname, search } = request.nextUrl;
  if (pathname !== "/") login.searchParams.set("destino", pathname + search);
  return NextResponse.redirect(login);
}

export const config = {
  // Tudo, menos: o login, as rotas da biblioteca de autenticação e os arquivos estáticos.
  matcher: ["/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)"],
};
