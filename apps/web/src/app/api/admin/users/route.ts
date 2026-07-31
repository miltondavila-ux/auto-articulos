import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { getCurrentUserId, requireAdmin } from "@/lib/current-user";

interface PublishedCountRow {
  userId: string;
  count: bigint;
}

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const [users, publishedCounts] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        monthlyArticleLimit: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.$queryRaw<PublishedCountRow[]>`
      SELECT r."userId" as "userId", COUNT(t.id) as count
      FROM "Title" t
      JOIN "Run" r ON r.id = t."runId"
      WHERE t.status = 'success'
      GROUP BY r."userId"
    `,
  ]);

  const publishedByUser = new Map(
    publishedCounts.map((row) => [row.userId, Number(row.count)]),
  );

  return NextResponse.json({
    users: users.map((u) => ({
      ...u,
      articlesPublished: publishedByUser.get(u.id) ?? 0,
    })),
  });
}

export async function PATCH(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await request.json();
  const { userId, monthlyArticleLimit, email, newPassword } = body;

  if (typeof userId !== "string" || !userId) {
    return NextResponse.json({ error: "userId es requerido" }, { status: 400 });
  }

  const data: {
    monthlyArticleLimit?: number | null;
    email?: string;
    passwordHash?: string;
  } = {};

  if ("monthlyArticleLimit" in body) {
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
    data.monthlyArticleLimit = monthlyArticleLimit;
  }

  if (typeof email === "string" && email.trim()) {
    const existing = await prisma.user.findUnique({
      where: { email: email.trim() },
    });
    if (existing && existing.id !== userId) {
      return NextResponse.json(
        { error: "Ya existe otro usuario con ese correo" },
        { status: 400 },
      );
    }
    data.email = email.trim();
  }

  if (typeof newPassword === "string" && newPassword.length > 0) {
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 8 caracteres" },
        { status: 400 },
      );
    }
    data.passwordHash = await bcrypt.hash(newPassword, 12);
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data,
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

export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { userId } = await request.json();
  if (typeof userId !== "string" || !userId) {
    return NextResponse.json({ error: "userId es requerido" }, { status: 400 });
  }

  const currentUserId = await getCurrentUserId();
  if (userId === currentUserId) {
    return NextResponse.json(
      { error: "No puedes eliminar tu propio usuario." },
      { status: 400 },
    );
  }

  await prisma.user.delete({ where: { id: userId } });
  return NextResponse.json({ ok: true });
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
