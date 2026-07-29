import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";

// Endpoint temporal de un solo uso: el usuario perdió el acceso a su propia
// contraseña de admin y no hay forma de restablecerla desde la UI todavía.
// Protegido por un secreto de un solo uso (no por sesión, porque justamente
// no hay sesión). Se elimina apenas se use.
const ONE_TIME_SECRET = "73219fb3444948bc9614c4aadaad036d37c352f7694e3b01";

export async function POST(request: NextRequest) {
  const { secret, email, newPassword } = await request.json();
  if (secret !== ONE_TIME_SECRET) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  if (typeof email !== "string" || typeof newPassword !== "string" || newPassword.length < 8) {
    return NextResponse.json({ error: "email y newPassword (min 8 chars) son requeridos" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  const user = await prisma.user.update({
    where: { email },
    data: { passwordHash },
    select: { id: true, email: true, role: true },
  });

  return NextResponse.json({ user });
}
