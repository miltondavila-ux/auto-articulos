import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { encryptSecret, decryptSecret } from "@auto-articulos/shared";
import { getCurrentUserId, requireAdmin } from "@/lib/current-user";

interface PublishedCountRow {
  userId: string;
  count: bigint;
}

const MAX_POSTGRES_INT = 2_147_483_647;

function isValidMaxTitlesPerBatch(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= MAX_POSTGRES_INT
  );
}

export async function GET() {
  let currentUserId: string;
  try {
    currentUserId = (await requireAdmin()).id;
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const [users, publishedCounts] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        role: true,
        monthlyArticleLimit: true,
        dailyArticleLimit: true,
        maxTitlesPerBatch: true,
        createdAt: true,
        initialPasswordEncrypted: true,
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
    currentUserId,
    users: users.map((u) => {
      const { initialPasswordEncrypted, ...rest } = u;
      let currentPassword: string | null = null;
      if (initialPasswordEncrypted) {
        try {
          currentPassword = decryptSecret(initialPasswordEncrypted);
        } catch {
          currentPassword = null;
        }
      }
      return {
        ...rest,
        currentPassword,
        articlesPublished: publishedByUser.get(u.id) ?? 0,
      };
    }),
  });
}

export async function PATCH(request: NextRequest) {
  let currentUserId: string;
  try {
    currentUserId = (await requireAdmin()).id;
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await request.json();
  const {
    userId,
    monthlyArticleLimit,
    dailyArticleLimit,
    maxTitlesPerBatch,
    email,
    newPassword,
    name,
    firstName,
    lastName,
    phone,
    role,
  } = body;

  if (typeof userId !== "string" || !userId) {
    return NextResponse.json({ error: "userId es requerido" }, { status: 400 });
  }

  const data: {
    monthlyArticleLimit?: number | null;
    dailyArticleLimit?: number | null;
    maxTitlesPerBatch?: number;
    email?: string;
    name?: string;
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
    passwordHash?: string;
    initialPasswordEncrypted?: string;
    role?: "admin" | "user";
  } = {};

  if ("role" in body) {
    if (role !== "admin" && role !== "user") {
      return NextResponse.json(
        { error: "El rol debe ser Usuario o Administrador." },
        { status: 400 },
      );
    }
    if (userId === currentUserId && role !== "admin") {
      return NextResponse.json(
        {
          error:
            "No puedes quitar el rol de administrador de tu propia cuenta.",
        },
        { status: 400 },
      );
    }
    data.role = role;
  }

  if (typeof name === "string") {
    data.name = name.trim();
  }

  if (typeof firstName === "string") {
    data.firstName = firstName.trim() || null;
  }

  if (typeof lastName === "string") {
    data.lastName = lastName.trim() || null;
  }

  if (typeof phone === "string") {
    data.phone = phone.trim() || null;
  }

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

  if ("dailyArticleLimit" in body) {
    if (
      dailyArticleLimit !== null &&
      (typeof dailyArticleLimit !== "number" || dailyArticleLimit < 0)
    ) {
      return NextResponse.json(
        {
          error:
            "dailyArticleLimit debe ser un número mayor o igual a 0, o null (sin límite)",
        },
        { status: 400 },
      );
    }
    data.dailyArticleLimit = dailyArticleLimit;
  }

  if ("maxTitlesPerBatch" in body) {
    if (!isValidMaxTitlesPerBatch(maxTitlesPerBatch)) {
      return NextResponse.json(
        {
          error:
            "maxTitlesPerBatch debe ser un número entero mayor o igual a 1",
        },
        { status: 400 },
      );
    }
    data.maxTitlesPerBatch = maxTitlesPerBatch;
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
    data.initialPasswordEncrypted = encryptSecret(newPassword);
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      name: true,
      firstName: true,
      lastName: true,
      phone: true,
      email: true,
      role: true,
      monthlyArticleLimit: true,
      dailyArticleLimit: true,
      maxTitlesPerBatch: true,
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

  const {
    email,
    password,
    name,
    firstName,
    lastName,
    phone,
    maxTitlesPerBatch = 20,
  } = await request.json();

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
  if (!isValidMaxTitlesPerBatch(maxTitlesPerBatch)) {
    return NextResponse.json(
      {
        error:
          "El máximo de títulos por lote debe ser un número entero mayor o igual a 1",
      },
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
  const initialPasswordEncrypted = encryptSecret(password);
  const user = await prisma.user.create({
    data: {
      email,
      name: typeof name === "string" && name.trim() ? name.trim() : null,
      firstName:
        typeof firstName === "string" && firstName.trim()
          ? firstName.trim()
          : null,
      lastName:
        typeof lastName === "string" && lastName.trim()
          ? lastName.trim()
          : null,
      phone: typeof phone === "string" && phone.trim() ? phone.trim() : null,
      passwordHash,
      initialPasswordEncrypted,
      role: "user",
      maxTitlesPerBatch,
    },
    select: {
      id: true,
      name: true,
      firstName: true,
      lastName: true,
      phone: true,
      email: true,
      role: true,
      maxTitlesPerBatch: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ user });
}
