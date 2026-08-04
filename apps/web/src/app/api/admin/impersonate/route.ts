import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import {
  IMPERSONATION_COOKIE,
  IMPERSONATION_TTL_MS,
  SESSION_COOKIE,
  createImpersonationToken,
  verifySessionToken,
} from "@/lib/session";

/**
 * Identidad real del admin, leída directamente de la cookie de sesión (no de
 * getCurrentUser()/x-user-id): si ya hay una suplantación activa, x-user-id
 * apunta al usuario suplantado, y no queremos que eso se use para arrancar
 * una segunda suplantación "en cadena". Este endpoint siempre parte del
 * admin real detrás de la sesión.
 */
async function getRealAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const realUserId = await verifySessionToken(token);
  if (!realUserId) return null;
  const user = await prisma.user.findUnique({
    where: { id: realUserId },
    select: { id: true, role: true },
  });
  if (!user || user.role !== "admin") return null;
  return user;
}

export async function POST(request: NextRequest) {
  const admin = await getRealAdmin();
  if (!admin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { userId: targetUserId } = await request.json();
  if (typeof targetUserId !== "string" || !targetUserId) {
    return NextResponse.json({ error: "userId es requerido" }, { status: 400 });
  }
  if (targetUserId === admin.id) {
    return NextResponse.json(
      { error: "Ya estás en tu propia cuenta." },
      { status: 400 },
    );
  }

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, role: true },
  });
  if (!target) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }
  if (target.role === "admin") {
    return NextResponse.json(
      { error: "No puedes acceder a la cuenta de otro administrador." },
      { status: 400 },
    );
  }

  const token = await createImpersonationToken(admin.id, target.id);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(IMPERSONATION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: IMPERSONATION_TTL_MS / 1000,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(IMPERSONATION_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}
