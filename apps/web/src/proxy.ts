import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "./lib/session";

const PUBLIC_PATHS = [
  "/login",
  "/acerca-de",
  "/privacidad",
  "/terminos",
  "/api/auth/login",
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Bug real encontrado el 31/7/2026: el matcher de abajo excluye
  // _next/static pero NO los archivos estáticos servidos directamente
  // desde /public (como la imagen del login) — sin esta línea, la imagen
  // se pedía sin sesión válida y el middleware la redirigía al login en
  // vez de servirla, así que nunca se veía.
  if (
    PUBLIC_PATHS.some((path) => pathname === path) ||
    pathname.startsWith("/_next") ||
    /\.(jpg|jpeg|png|webp|gif|svg|ico)$/i.test(pathname)
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const userId = await verifySessionToken(token);

  if (!userId) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-user-id", userId);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
