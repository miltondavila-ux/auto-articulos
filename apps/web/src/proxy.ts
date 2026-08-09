import { NextRequest, NextResponse } from "next/server";
import {
  IMPERSONATION_COOKIE,
  SESSION_COOKIE,
  verifyImpersonationToken,
  verifySessionToken,
} from "./lib/session";

const PUBLIC_PATHS = [
  "/login",
  "/acerca-de",
  "/privacidad",
  "/terminos",
  "/api/auth/login",
  "/api/social-opportunities/fix-links",
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

  // Suplantación: un admin puede estar "actuando como" otro usuario sin
  // cerrar su propia sesión. La cookie de suplantación solo es válida si
  // quedó firmada para ESTE admin real (userId de arriba) — así no se puede
  // reutilizar copiándola a otra cuenta. Si es válida, el resto de la app
  // (getCurrentUser, todas las rutas API) opera como el usuario objetivo;
  // x-acting-admin-id queda para que el layout muestre "Actuando como".
  const impersonationToken = request.cookies.get(IMPERSONATION_COOKIE)?.value;
  const impersonation = await verifyImpersonationToken(impersonationToken);
  if (impersonation && impersonation.adminUserId === userId) {
    requestHeaders.set("x-user-id", impersonation.targetUserId);
    requestHeaders.set("x-acting-admin-id", impersonation.adminUserId);
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
