import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { requireAdmin } from "@/lib/current-user";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      role: true,
      monthlyArticleLimit: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ users });
}

export async function PATCH(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { userId, monthlyArticleLimit } = await request.json();

  if (typeof userId !== "string" || !userId) {
    return NextResponse.json({ error: "userId es requerido" }, { status: 400 });
  }
  if (
    monthlyArticleLimit !== null &&
    (typeof monthlyArticleLimit !== "number" || monthlyArticleLimit < 0)
  ) {
    return NextResponse.json(
      {
        error:
          "monthlyArticleLimit debe ser un número mayor o igual a 0, o null (sin límite)",
      },
      { status: 400 },
    );
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { monthlyArticleLimit },
    select: {
      id: true,
      email: true,
      role: true,
      monthlyArticleLimit: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ user });
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { email, password } = await request.json();

  if (typeof email !== "string" || !email.trim()) {
    return NextResponse.json(
      { error: "El correo es requerido" },
      { status: 400 },
    );
  }
  if (typeof password !== "string" || password.length < 8) {
    return NextResponse.json(
      { error: "La contraseña debe tener al menos 8 caracteres" },
      { status: 400 },
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "Ya existe un usuario con ese correo" },
      { status: 400 },
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, passwordHash, role: "user" },
    select: { id: true, email: true, role: true, createdAt: true },
  });

  return NextResponse.json({ user });
}
