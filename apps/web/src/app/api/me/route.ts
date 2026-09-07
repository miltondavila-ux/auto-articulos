import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { platformBaseUrl } from "@auto-articulos/shared";
import { getCurrentUser, getCurrentUserId, getActingAdmin, displayName } from "@/lib/current-user";

import {
  getGlobalDisabledModules,
  getEffectiveDisabledModules,
  parseUserDisabledModules,
  parseUserModuleOverrides,
} from "@/lib/modules";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Un poco más del doble del texto de ejemplo que dio el usuario (340
// caracteres) — pedido explícito, 6/8/2026.
const MAX_ARTICLE_SIGNATURE_LEN = 700;
// Suficiente para varias decenas de ciudades/países separados por comas.
const MAX_LOCATIONS_LEN = 500;

export async function GET() {
  const user = await getCurrentUser();
  const actingAdmin = await getActingAdmin();
  const globalDisabledModules = await getGlobalDisabledModules();
  const disabledModules = getEffectiveDisabledModules(user, globalDisabledModules);
  const userDisabledModules = parseUserDisabledModules(user.disabledModules);
  const moduleOverrides = parseUserModuleOverrides(user.disabledModules);

  return NextResponse.json(
    {
      email: user.email,
      role: user.role,
      isActingAdmin: Boolean(actingAdmin),
      actingAdmin: actingAdmin
        ? { id: actingAdmin.id, email: actingAdmin.email, name: displayName(actingAdmin) }
        : null,
      maxTitlesPerBatch: user.maxTitlesPerBatch,
      dailyArticleLimit: user.dailyArticleLimit,
      monthlyArticleLimit: user.monthlyArticleLimit,
      // Servidor donde vive su cuenta de la plataforma. La interfaz lo usa
      // para enlazar al sitio correcto (por ejemplo, recuperar contraseña):
      // desde que hay más de un servidor, un enlace fijo a
      // 10minuteswebsite.net mandaba a la persona equivocada a otro sitio.
      platformDomain: user.platformDomain,
      platformBaseUrl: platformBaseUrl(user.platformDomain),
      contentLanguage: user.contentLanguage,
      articleSignature: user.articleSignature,
      clientLocations: user.clientLocations,
      businessLocations: user.businessLocations,
      opportunitiesDisclosureAcceptedAt: user.opportunitiesDisclosureAcceptedAt,
      phone: user.phone,
      imagePrompt: user.imagePrompt,
      infographicPrompt: user.infographicPrompt,
      defaultPromptId: user.defaultPromptId,
      profilePhotoUrl: user.profilePhotoUrl,
      profilePhotoUrl2: user.profilePhotoUrl2,
      profilePhotoUrl3: user.profilePhotoUrl3,
      businessLogoUrl: user.businessLogoUrl,
      businessLogoUrl2: user.businessLogoUrl2,
      allowInstagramPublishing: user.allowInstagramPublishing,
      allowFacebookPublishing: user.allowFacebookPublishing,
      allowLinkedInPublishing: user.allowLinkedInPublishing,
      allowThreadsPublishing: user.allowThreadsPublishing,
      allowBlueskyPublishing: user.allowBlueskyPublishing,
      allowDevToPublishing: user.allowDevToPublishing,
      allowBloggerPublishing: user.allowBloggerPublishing,
      hasImageCredits: user.hasImageCredits,
      disabledModules,
      userDisabledModules,
      moduleOverrides,
      globalDisabledModules,
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      },
    },
  );
}

export async function PATCH(request: NextRequest) {
  const userId = await getCurrentUserId();
  const body = await request.json();
  const data: {
    contentLanguage?: string;
    articleSignature?: string | null;
    phone?: string | null;
    imagePrompt?: string | null;
    infographicPrompt?: string | null;
    defaultPromptId?: string | null;
    clientLocations?: string | null;
    businessLocations?: string | null;
  } = {};

  if ("contentLanguage" in body) {
    const { contentLanguage } = body;
    if (typeof contentLanguage !== "string" || !contentLanguage.trim()) {
      return NextResponse.json(
        { error: "contentLanguage es requerido" },
        { status: 400 },
      );
    }
    const cleanLang = contentLanguage.trim();
    // Debe coincidir con un idioma ya sincronizado desde 10minutesWebsite o crearlo automáticamente si es estándar
    let language = await prisma.language.findFirst({
      where: { userId, platform: "10minutesWebsite", externalId: cleanLang },
    });
    if (!language) {
      const standardName =
        cleanLang === "es" ? "Español" : cleanLang === "en" ? "Inglés" : cleanLang.toUpperCase();
      language = await prisma.language.create({
        data: {
          userId,
          platform: "10minutesWebsite",
          externalId: cleanLang,
          name: standardName,
        },
      });
    }
    data.contentLanguage = cleanLang;
  }

  if ("articleSignature" in body) {
    const { articleSignature } = body;
    if (articleSignature !== null && typeof articleSignature !== "string") {
      return NextResponse.json(
        { error: "articleSignature debe ser texto o null" },
        { status: 400 },
      );
    }
    const trimmed = typeof articleSignature === "string" ? articleSignature.trim() : "";
    if (trimmed.length > MAX_ARTICLE_SIGNATURE_LEN) {
      return NextResponse.json(
        {
          error: `El texto no puede superar los ${MAX_ARTICLE_SIGNATURE_LEN} caracteres (tiene ${trimmed.length}).`,
        },
        { status: 400 },
      );
    }
    data.articleSignature = trimmed || null;
  }

  if ("clientLocations" in body) {
    const { clientLocations } = body;
    if (clientLocations !== null && typeof clientLocations !== "string") {
      return NextResponse.json(
        { error: "clientLocations debe ser texto o null" },
        { status: 400 },
      );
    }
    const trimmed = typeof clientLocations === "string" ? clientLocations.trim() : "";
    if (trimmed.length > MAX_LOCATIONS_LEN) {
      return NextResponse.json(
        { error: `El texto no puede superar los ${MAX_LOCATIONS_LEN} caracteres (tiene ${trimmed.length}).` },
        { status: 400 },
      );
    }
    data.clientLocations = trimmed || null;
  }

  if ("businessLocations" in body) {
    const { businessLocations } = body;
    if (businessLocations !== null && typeof businessLocations !== "string") {
      return NextResponse.json(
        { error: "businessLocations debe ser texto o null" },
        { status: 400 },
      );
    }
    const trimmed = typeof businessLocations === "string" ? businessLocations.trim() : "";
    if (trimmed.length > MAX_LOCATIONS_LEN) {
      return NextResponse.json(
        { error: `El texto no puede superar los ${MAX_LOCATIONS_LEN} caracteres (tiene ${trimmed.length}).` },
        { status: 400 },
      );
    }
    data.businessLocations = trimmed || null;
  }

  if ("phone" in body) {
    const { phone } = body;
    if (phone !== null && typeof phone !== "string") {
      return NextResponse.json(
        { error: "El teléfono debe ser texto o null" },
        { status: 400 },
      );
    }
    const trimmed = typeof phone === "string" ? phone.trim() : "";
    data.phone = trimmed || null;
  }

  if ("imagePrompt" in body) {
    const { imagePrompt } = body;
    if (imagePrompt !== null && typeof imagePrompt !== "string") {
      return NextResponse.json(
        { error: "imagePrompt debe ser texto o null" },
        { status: 400 },
      );
    }
    const trimmed = typeof imagePrompt === "string" ? imagePrompt.trim() : "";
    data.imagePrompt = trimmed || null;
  }

  if ("infographicPrompt" in body) {
    const { infographicPrompt } = body;
    if (infographicPrompt !== null && typeof infographicPrompt !== "string") {
      return NextResponse.json(
        { error: "infographicPrompt debe ser texto o null" },
        { status: 400 },
      );
    }
    const trimmed = typeof infographicPrompt === "string" ? infographicPrompt.trim() : "";
    data.infographicPrompt = trimmed || null;
  }

  if ("defaultPromptId" in body) {
    const { defaultPromptId } = body;
    if (defaultPromptId !== null && typeof defaultPromptId !== "string") {
      return NextResponse.json(
        { error: "defaultPromptId debe ser texto o null" },
        { status: 400 },
      );
    }
    const cleanPromptId = typeof defaultPromptId === "string" ? defaultPromptId.trim() : "";
    if (cleanPromptId) {
      const exists = await prisma.prompt.findUnique({
        where: { id: cleanPromptId },
      });
      if (!exists) {
        return NextResponse.json(
          { error: "El estilo de redacción seleccionado no existe" },
          { status: 400 },
        );
      }
      data.defaultPromptId = cleanPromptId;
    } else {
      data.defaultPromptId = null;
    }
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: {
      contentLanguage: true,
      articleSignature: true,
      phone: true,
      imagePrompt: true,
      infographicPrompt: true,
      defaultPromptId: true,
      clientLocations: true,
      businessLocations: true,
    },
  });

  return NextResponse.json(user);
}
