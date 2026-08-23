import { prisma } from "@auto-articulos/db";
import { decryptSecret, getDevToArticleByPath, getDevToArticleUrl, updateDevToArticle } from "@auto-articulos/shared";
import { deriveDevToTags, getArticleBodyMarkdown, getArticleOpenGraphImage } from "./socialPublish";

async function main() {
  const targetUrl = process.env.DEVTO_TARGET_URL;
  if (!targetUrl) throw new Error("DEVTO_TARGET_URL es obligatorio.");
  const target = new URL(targetUrl);
  const parts = target.pathname.split("/").filter(Boolean);
  if (parts.length < 2) throw new Error("DEVTO_TARGET_URL no tiene el formato esperado.");
  const username = parts[0];
  const slug = parts[1];
  const opportunity = await prisma.socialOpportunity.findFirst({
  where: { platform: "devto", postId: targetUrl },
  orderBy: { createdAt: "desc" },
  select: { userId: true, articleUrl: true, titleId: true },
  });
  if (!opportunity) throw new Error("No se encontró la oportunidad DEV.to asociada al enlace.");

  const integration = await prisma.devToIntegration.findUnique({ where: { userId: opportunity.userId } });
  if (!integration) throw new Error("La cuenta de DEV.to no está conectada.");
  const title = opportunity.titleId
  ? await prisma.title.findUnique({ where: { id: opportunity.titleId }, select: { finalTitle: true, summary: true, run: { select: { category: { select: { name: true } } } } } })
    : null;
  const articleTitle = title?.finalTitle || "Artículo";
  const articleSummary = title?.summary || articleTitle;
  const bodyMarkdown = await getArticleBodyMarkdown(opportunity.articleUrl);
  const imageUrl = await getArticleOpenGraphImage(opportunity.articleUrl);
  const apiKey = decryptSecret(integration.encryptedApiKey);
  const existing = await getDevToArticleByPath(apiKey, username, slug);
  if (!existing.id) throw new Error("DEV.to no devolvió el ID numérico del artículo.");
  const repaired = await updateDevToArticle(apiKey, existing.id, {
  title: articleTitle,
  bodyMarkdown,
  canonicalUrl: opportunity.articleUrl,
  description: articleSummary,
  mainImage: imageUrl,
  tags: deriveDevToTags(articleTitle, articleSummary, title?.run.category.name || null),
  series: title?.run.category.name || null,
  });
  console.log(`DEV.to reparado: ${getDevToArticleUrl(repaired) || targetUrl}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
