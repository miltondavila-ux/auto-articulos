import { NextRequest, NextResponse } from "next/server";
import {
  IMPERSONATION_COOKIE,
  SESSION_COOKIE,
  SESSION_TTL_MS,
  createSessionToken,
  verifyImpersonationToken,
  verifySessionToken,
} from "./lib/session";

const PUBLIC_PATHS = [
  "/login",
  "/acerca-de",
  "/privacidad",
  "/terminos",
  "/api/auth/login",
  "/api/debug/instagram-errors",
  "/api/debug/instagram-test",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

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

  const impersonationToken = request.cookies.get(IMPERSONATION_COOKIE)?.value;
  const impersonation = await verifyImpersonationToken(impersonationToken);
  if (impersonation && impersonation.adminUserId === userId) {
    requestHeaders.set("x-user-id", impersonation.targetUserId);
    requestHeaders.set("x-acting-admin-id", impersonation.adminUserId);
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });

  // Sliding session: si queda menos de la mitad del TTL, renueva expiración
  // para que sesiones activas no caduquen. Costo: una operación HMAC cada
  // ~3.5 días por sesión, irrelevante.
  // Sliding session con protección contra fallos en Edge Runtime
  if (token) {
    try {
      const parts = token.split(".");
      if (parts.length === 3) {
        const expiresStr = parts[1];
        const remaining = Number(expiresStr) - Date.now();
        if (remaining > 0 && remaining < SESSION_TTL_MS / 2) {
          const newToken = await createSessionToken(userId);
          response.cookies.set(SESSION_COOKIE, newToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: Math.floor(SESSION_TTL_MS / 1000),
          });
        }
      }
    } catch {
      // Ignorar errores de renovación de sesión para no romper el request
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
