import { NextRequest, NextResponse } from "next/server";
import {
  IMPERSONATION_COOKIE,
  SESSION_COOKIE,
  SESSION_TTL_MS,
  createSessionToken,
  verifyMcpAccessToken,
  verifyImpersonationToken,
  verifySessionToken,
} from "./lib/session";

const PUBLIC_PATHS = [
  "/login",
  "/acerca-de",
  "/privacidad",
  "/terminos",
  "/api/auth/login",
  "/api/auth/trial-signup",
  "/api/debug/instagram-errors",
  "/api/debug/activate-instagram",
  "/api/oauth2/authorize",
  "/api/oauth2/token",
  "/api/meta/threads/deauthorize",
  "/api/meta/threads/data-deletion",
  "/api/meta/threads/data-deletion/status",
  "/.well-known/oauth-authorization-server",
  // Documento de descubrimiento OAuth del servidor MCP: por definición se
  // consulta SIN token (es lo que le dice al cliente dónde autenticarse).
  "/.well-known/oauth-protected-resource",
];

/** Endpoint del servidor MCP; se autentica con Bearer, no con cookie. */
const MCP_PATH = "/api/mcp";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
  "Surrogate-Control": "no-store",
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    PUBLIC_PATHS.some((path) => pathname === path) ||
    pathname.startsWith("/_next") ||
    /\.(jpg|jpeg|png|webp|gif|svg|ico)$/i.test(pathname)
  ) {
    return NextResponse.next();
  }

  // El servidor MCP lo consumen clientes sin navegador (Alexa+, Claude), que
  // no tienen cookies: mandan `Authorization: Bearer`. Se resuelve acá y no
  // dentro de la ruta para que la ruta reciba `x-user-id` igual que cualquier
  // ruta protegida — así los route handlers que reutiliza el MCP siguen
  // funcionando sin cambios.
  if (pathname === MCP_PATH) {
    if (!isAllowedMcpOrigin(request)) {
      return NextResponse.json({ error: "Origen no permitido" }, { status: 403 });
    }
    return handleMcpAuth(request);
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const userId = await verifySessionToken(token);

  if (!userId) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401, headers: NO_CACHE_HEADERS },
      );
    }
    const loginUrl = new URL("/login", request.url);
    if (pathname === "/oauth/autorizar") {
      loginUrl.searchParams.set("returnTo", `${pathname}${request.nextUrl.search}`);
    }
    const response = NextResponse.redirect(loginUrl);
    Object.entries(NO_CACHE_HEADERS).forEach(([key, value]) => response.headers.set(key, value));
    return response;
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

  // El dashboard y sus datos son siempre sensibles al estado actual de la
  // cuenta. Impedir el almacenamiento en navegador, CDN y proxies evita que
  // una versión anterior del menú o de los permisos sobreviva a un despliegue.
  Object.entries(NO_CACHE_HEADERS).forEach(([key, value]) => response.headers.set(key, value));

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

/**
 * Autenticación del endpoint MCP.
 *
 * FASE 1: sigue aceptando el Bearer de sesión firmado para pruebas manuales.
 * FASE 2: acepta access tokens OAuth `mcp.*` de vida corta para Alexa+.
 *
 * FASE 2 (pendiente): Alexa+ exige OAuth 2.1 con PKCE S256 y refresh tokens.
 * Cuando exista el authorization server, acá se cambia `verifySessionToken`
 * por la verificación del access token de OAuth. El resto del MCP no se
 * entera: sigue recibiendo `x-user-id`.
 *
 * Alexa+ exige que el 401 no incluya `WWW-Authenticate`; descubre el recurso
 * protegido mediante el documento `.well-known` de forma independiente. Por
 * eso esta respuesta se mantiene deliberadamente sin esa cabecera.
 */
async function handleMcpAuth(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const bearer = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  const oauth = await verifyMcpAccessToken(bearer);
  const sessionUserId = oauth ? null : await verifySessionToken(bearer);
  const userId = oauth?.userId ?? sessionUserId;

  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-user-id", userId);
  // Los Bearer de sesión solo se mantienen para la prueba manual heredada;
  // conservan el comportamiento previo. Los OAuth quedan limitados a los
  // scopes firmados durante el account linking.
  requestHeaders.set("x-mcp-scopes", (oauth?.scopes ?? ["oportunidades:leer", "oportunidades:publicar"]).join(" "));
  // Deliberadamente NO se propaga la suplantación de admin: un token de
  // máquina no debería poder operar la cuenta de otro usuario por voz.
  return NextResponse.next({ request: { headers: requestHeaders } });
}

/**
 * Streamable HTTP exige bloquear Origins ajenos cuando el header está presente
 * para evitar que una web maliciosa use el navegador como puente hacia el MCP.
 * Los clientes server-to-server, como Alexa+, no envían Origin y se permiten.
 */
function isAllowedMcpOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  return !origin || origin === request.nextUrl.origin;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
