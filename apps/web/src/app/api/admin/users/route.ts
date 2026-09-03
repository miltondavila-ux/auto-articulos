import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import {
  decryptSecret,
  encryptSecret,
  DEFAULT_PLATFORM_DOMAIN,
  DEFAULT_DAILY_ARTICLE_LIMIT,
  isPlatformDomain,
  PLATFORM_DOMAIN_VALUES,
} from "@auto-articulos/shared";
import { auditLog } from "@/lib/audit";
import { getCurrentUserId, requireAdmin } from "@/lib/current-user";
import {
  parseUserDisabledModules,
  parseUserModuleOverrides,
  type ModuleAccessOverrides,
} from "@/lib/modules";

interface PublishedCountRow {
  userId: string;
  count: bigint;
}

const MAX_POSTGRES_INT = 2_147_483_647;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const dynamic = "force-dynamic";
export const revalidate = 0;

function isValidMaxTitlesPerBatch(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= MAX_POSTGRES_INT
  );
}

function isValidArticleLimit(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= MAX_POSTGRES_INT
  );
}

export async function GET() {
  let currentUserId: string;
  try {
    currentUserId = (await requireAdmin()).id;
  } catch {
    return NextResponse.json(
      { error: "No autorizado" },
      {
        status: 403,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        },
      },
    );
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
        platformDomain: true,
        contentLanguage: true,
        allowInstagramPublishing: true,
        allowLinkedInPublishing: true,
        allowThreadsPublishing: true,
        allowFacebookPublishing: true,
        allowPinterestPublishing: true,
        allowTumblrPublishing: true,
        allowBlueskyPublishing: true,
        allowDevToPublishing: true,
        allowBloggerPublishing: true,
        aiImageGenerationEnabled: true,
        profilePhotoUrl: true,
        businessLogoUrl: true,
        opportunitiesDisclosureAcceptedAt: true,
        createdAt: true,
        initialPasswordEncrypted: true,
        isTrialSignup: true,
        trialStartedAt: true,
        trialUnlocked: true,
        disabledModules: true,
        hasImageCredits: true,
        credentials: {
          where: { platform: "10minutesWebsite" },
          select: { encryptedUsername: true },
        },
        searchIntegrations: {
          select: { provider: true, siteUrl: true },
        },
        trialDomainRegistries: {
          select: { normalizedDomain: true, accountUsername: true },
          take: 1,
        },
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
    users: users.map((u, indice) => {
      let currentPassword: string | null = null;
      if (u.initialPasswordEncrypted) {
        try {
          currentPassword = decryptSecret(u.initialPasswordEncrypted);
        } catch {
          currentPassword = null;
        }
      }

      let tenMinutesUsername: string | null = null;
      if (u.credentials?.[0]?.encryptedUsername) {
        try {
          tenMinutesUsername = decryptSecret(u.credentials[0].encryptedUsername);
        } catch {
          tenMinutesUsername = null;
        }
      } else if (u.trialDomainRegistries?.[0]?.accountUsername) {
        tenMinutesUsername = u.trialDomainRegistries[0].accountUsername;
      }

      const gscDomain = u.searchIntegrations.find((s) => s.provider === "google")?.siteUrl;
      const bingDomain = u.searchIntegrations.find((s) => s.provider === "bing")?.siteUrl;
      const registeredDomain = u.trialDomainRegistries?.[0]?.normalizedDomain;
      const connectedDomain = registeredDomain || gscDomain || bingDomain || null;

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { initialPasswordEncrypted, disabledModules, credentials, searchIntegrations, trialDomainRegistries, ...rest } = u;
      return {
        ...rest,
        // Número de cuenta: el puesto que ocupa por antigüedad de registro. La
        // consulta viene ordenada por createdAt ascendente, así que el índice
        // es el orden de llegada. Sirve para que Milton pueda decir "revisa la
        // 42" sin depender del filtro ni del orden que tenga en pantalla.
        numeroCuenta: indice + 1,
        disabledModules: parseUserDisabledModules(disabledModules),
        moduleOverrides: parseUserModuleOverrides(disabledModules),
        currentPassword,
        tenMinutesUsername,
        connectedDomain,
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
    platformDomain,
    email,
    newPassword,
    name,
    firstName,
    lastName,
    phone,
    role,
    allowInstagramPublishing,
    allowLinkedInPublishing,
    allowThreadsPublishing,
    allowFacebookPublishing,
    allowPinterestPublishing,
    allowBlueskyPublishing,
    allowDevToPublishing,
    allowBloggerPublishing,
    aiImageGenerationEnabled,
    profilePhotoUrl,
    businessLogoUrl,
    isTrialSignup,
    trialUnlocked,
    disabledModules,
    moduleOverrides,
  } = body;

  if (typeof userId !== "string" || !userId) {
    return NextResponse.json({ error: "userId es requerido" }, { status: 400 });
  }

  const data: {
    monthlyArticleLimit?: number | null;
    dailyArticleLimit?: number | null;
    maxTitlesPerBatch?: number;
    platformDomain?: string;
    email?: string;
    name?: string;
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
    passwordHash?: string;
    initialPasswordEncrypted?: string;
    role?: "admin" | "user";
    allowInstagramPublishing?: boolean;
    allowLinkedInPublishing?: boolean;
    allowThreadsPublishing?: boolean;
    allowFacebookPublishing?: boolean;
    allowPinterestPublishing?: boolean;
    allowTumblrPublishing?: boolean;
    allowBlueskyPublishing?: boolean;
    allowDevToPublishing?: boolean;
    allowBloggerPublishing?: boolean;
    aiImageGenerationEnabled?: boolean;
    profilePhotoUrl?: string | null;
    businessLogoUrl?: string | null;
    isTrialSignup?: boolean;
    trialUnlocked?: boolean;
    disabledModules?: string | null;
    hasImageCredits?: boolean;
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
    if (role === "admin") {
      // Un administrador nunca debe tener restricciones de prueba de 7 días
      data.trialUnlocked = true;
    }
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

  if ("platformDomain" in body) {
    if (!isPlatformDomain(platformDomain)) {
      return NextResponse.json(
        {
          error: `platformDomain debe ser uno de: ${PLATFORM_DOMAIN_VALUES.join(", ")}`,
        },
        { status: 400 },
      );
    }
    data.platformDomain = platformDomain;
  }

  if ("allowInstagramPublishing" in body) {
    data.allowInstagramPublishing = Boolean(allowInstagramPublishing);
  }

  if ("allowLinkedInPublishing" in body) {
    data.allowLinkedInPublishing = Boolean(allowLinkedInPublishing);
  }

  if ("allowThreadsPublishing" in body) {
    data.allowThreadsPublishing = Boolean(allowThreadsPublishing);
  }

  if ("allowFacebookPublishing" in body) {
    data.allowFacebookPublishing = Boolean(allowFacebookPublishing);
  }

  if ("allowPinterestPublishing" in body) {
    data.allowPinterestPublishing = Boolean(allowPinterestPublishing);
  }

  if ("allowTumblrPublishing" in body) {
    data.allowTumblrPublishing = Boolean(body.allowTumblrPublishing);
  }
  if ("allowDevToPublishing" in body) {
    data.allowDevToPublishing = Boolean(allowDevToPublishing);
  }
  if ("allowBloggerPublishing" in body) {
    data.allowBloggerPublishing = Boolean(allowBloggerPublishing);
  }
  if ("allowBlueskyPublishing" in body) {
    data.allowBlueskyPublishing = Boolean(allowBlueskyPublishing);
  }

  if ("aiImageGenerationEnabled" in body) {
    data.aiImageGenerationEnabled = Boolean(aiImageGenerationEnabled);
  }

  if ("moduleOverrides" in body) {
    if (!moduleOverrides || typeof moduleOverrides !== "object" || Array.isArray(moduleOverrides)) {
      return NextResponse.json(
        { error: "moduleOverrides debe ser un objeto" },
        { status: 400 },
      );
    }
    const limpio = Object.fromEntries(
      Object.entries(moduleOverrides as ModuleAccessOverrides).filter(
        ([, value]) =>
          value === "inherit" || value === "enabled" || value === "disabled",
      ),
    );
    data.disabledModules = JSON.stringify(limpio);
  }

  if ("isTrialSignup" in body) {
    data.isTrialSignup = Boolean(isTrialSignup);
    if (!data.isTrialSignup) {
      data.trialUnlocked = true;
    }
  }

  if ("trialUnlocked" in body) {
    data.trialUnlocked = Boolean(trialUnlocked);
  }

  if ("hasImageCredits" in body) {
    data.hasImageCredits = Boolean(body.hasImageCredits);
  }

  if ("profilePhotoUrl" in body) {
    data.profilePhotoUrl = typeof profilePhotoUrl === "string" ? profilePhotoUrl.trim() || null : null;
  }

  if ("businessLogoUrl" in body) {
    data.businessLogoUrl = typeof businessLogoUrl === "string" ? businessLogoUrl.trim() || null : null;
  }

  if ("disabledModules" in body) {
    if (Array.isArray(disabledModules)) {
      const clean = disabledModules.filter((id): id is string => typeof id === "string" && id.trim() !== "");
      data.disabledModules = JSON.stringify(clean);
    } else if (disabledModules === null) {
      data.disabledModules = null;
    }
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

  let user;
  try {
    user = await prisma.user.update({
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
        platformDomain: true,
        contentLanguage: true,
        allowInstagramPublishing: true,
        allowLinkedInPublishing: true,
        allowThreadsPublishing: true,
        allowFacebookPublishing: true,
        aiImageGenerationEnabled: true,
        createdAt: true,
        isTrialSignup: true,
        trialStartedAt: true,
        trialUnlocked: true,
        disabledModules: true,
      },
    });
  } catch (error) {
    console.error("[admin/users] PATCH falló", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `No se pudo guardar: ${error.message}`
            : "No se pudo guardar el usuario.",
      },
      { status: 500 },
    );
  }

  auditLog("user_updated", currentUserId, { targetUserId: userId, changes: Object.keys(data) });
  return NextResponse.json({
    user: {
      ...user,
      disabledModules: parseUserDisabledModules(user.disabledModules),
    },
  });
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
  auditLog("user_deleted", currentUserId, { targetUserId: userId });
  return NextResponse.json({ ok: true });
}

export async function POST(request: NextRequest) {
  let adminId: string;
  try {
    adminId = (await requireAdmin()).id;
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
    role = "user",
    monthlyArticleLimit = 300,
    dailyArticleLimit = DEFAULT_DAILY_ARTICLE_LIMIT,
    maxTitlesPerBatch = 20,
    platformDomain: requestedPlatformDomain,
  } = await request.json();

  // Servidor de la cuenta nueva. Antes era obligatorio pasar por "país" para
  // derivarlo (Europa -> .site, resto del mundo -> .net); pedido de Milton
  // (15/8/2026): el país nunca importó por sí mismo, era un paso intermedio
  // innecesario. Administración elige el servidor directamente ahora.
  if (
    requestedPlatformDomain !== undefined &&
    requestedPlatformDomain !== null &&
    !isPlatformDomain(requestedPlatformDomain)
  ) {
    return NextResponse.json(
      {
        error: `platformDomain debe ser uno de: ${PLATFORM_DOMAIN_VALUES.join(", ")}`,
      },
      { status: 400 },
    );
  }

  const platformDomain = isPlatformDomain(requestedPlatformDomain)
    ? requestedPlatformDomain
    : DEFAULT_PLATFORM_DOMAIN;

  const normalizedEmail = typeof email === "string" ? email.trim() : "";
  const normalizedFirstName =
    typeof firstName === "string" ? firstName.trim() : "";
  const normalizedLastName =
    typeof lastName === "string" ? lastName.trim() : "";
  const normalizedPhone = typeof phone === "string" ? phone.trim() : "";

  if (!normalizedFirstName) {
    return NextResponse.json(
      { error: "El nombre es requerido" },
      { status: 400 },
    );
  }
  if (!normalizedLastName) {
    return NextResponse.json(
      { error: "El apellido es requerido" },
      { status: 400 },
    );
  }
  if (!normalizedPhone) {
    return NextResponse.json(
      { error: "El teléfono es requerido" },
      { status: 400 },
    );
  }
  if (!normalizedEmail) {
    return NextResponse.json(
      { error: "El correo es requerido" },
      { status: 400 },
    );
  }
  if (!EMAIL_PATTERN.test(normalizedEmail)) {
    return NextResponse.json(
      { error: "El correo no tiene un formato válido" },
      { status: 400 },
    );
  }
  if (typeof password !== "string" || password.length < 8) {
    return NextResponse.json(
      { error: "La contraseña debe tener al menos 8 caracteres" },
      { status: 400 },
    );
  }
  if (role !== "admin" && role !== "user") {
    return NextResponse.json(
      { error: "El rol debe ser Usuario o Administrador" },
      { status: 400 },
    );
  }
  if (!isValidArticleLimit(monthlyArticleLimit)) {
    return NextResponse.json(
      {
        error: "El límite mensual debe ser un número entero mayor o igual a 0",
      },
      { status: 400 },
    );
  }
  if (!isValidArticleLimit(dailyArticleLimit)) {
    return NextResponse.json(
      { error: "El límite diario debe ser un número entero mayor o igual a 0" },
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

  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });
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
      email: normalizedEmail,
      name:
        typeof name === "string" && name.trim()
          ? name.trim()
          : `${normalizedFirstName} ${normalizedLastName}`,
      firstName: normalizedFirstName,
      lastName: normalizedLastName,
      phone: normalizedPhone,
      passwordHash,
      initialPasswordEncrypted,
      role,
      monthlyArticleLimit,
      dailyArticleLimit,
      maxTitlesPerBatch,
      platformDomain,
    },
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
      platformDomain: true,
      contentLanguage: true,
      createdAt: true,
    },
  });

  auditLog("user_created", adminId, { newUserId: user.id, email: normalizedEmail, role });
  return NextResponse.json({ user });
}
