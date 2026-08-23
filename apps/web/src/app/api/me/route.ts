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
      opportunitiesDisclosureAcceptedAt: user.opportunitiesDisclosureAcceptedAt,
      phone: user.phone,
      imagePrompt: user.imagePrompt,
      infographicPrompt: user.infographicPrompt,
      defaultPromptId: user.defaultPromptId,
      profilePhotoUrl: user.profilePhotoUrl,
      businessLogoUrl: user.businessLogoUrl,
      allowInstagramPublishing: user.allowInstagramPublishing,
      allowFacebookPublishing: user.allowFacebookPublishing,
      allowLinkedInPublishing: user.allowLinkedInPublishing,
      allowThreadsPublishing: user.allowThreadsPublishing,
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
    },
  });

  return NextResponse.json(user);
}
