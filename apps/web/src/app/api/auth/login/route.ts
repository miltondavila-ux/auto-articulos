import { NextRequest, NextResponse } from "next/server";
import { verifyCredentials } from "@/lib/auth";
import { createSessionToken, SESSION_COOKIE } from "@/lib/session";
import { checkLoginRateLimit } from "@/lib/rate-limit";
import { auditLog } from "@/lib/audit";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip") ?? "unknown";

  if (!checkLoginRateLimit(ip)) {
    return NextResponse.json({ error: "Demasiados intentos. Intenta de nuevo en 15 minutos." }, { status: 429 });
  }

  const { email, password } = await request.json();

  if (typeof email !== "string" || typeof password !== "string") {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  try {
    const user = await verifyCredentials(email, password);
    if (!user) {
      auditLog("login_failed", "unknown", { email, ip });
      return NextResponse.json({ error: "Correo o contraseña incorrectos" }, { status: 401 });
    }

    const token = await createSessionToken(user.id);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    auditLog("login_success", user.id, { ip });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    auditLog("login_failed", "unknown", { email, ip, error: message });
    return NextResponse.json({ error: "Error interno del servidor", detail: message }, { status: 500 });
  }
}
