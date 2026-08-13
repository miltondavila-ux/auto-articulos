import { prisma } from "@auto-articulos/db";
import {
  decryptSecret,
  encryptSecret,
  getBingAccessToken,
  parseBingTokenPayload,
  formatBingTokenPayload,
} from "@auto-articulos/shared";

/**
 * Mismo criterio que apps/web/src/lib/bing-token.ts: único punto por el que el
 * worker pide un access token de Bing.
 */
export async function getBingTokenForIntegration(integration: {
  id: string;
  encryptedRefreshToken: string;
}): Promise<string> {
  const decrypted = decryptSecret(integration.encryptedRefreshToken);
  const tokenData = parseBingTokenPayload(decrypted);

  if (
    tokenData.accessToken &&
    tokenData.expiresAt &&
    Date.now() < tokenData.expiresAt - 120000
  ) {
    return tokenData.accessToken;
  }

  const { accessToken, expiresInSeconds } = await getBingAccessToken(
    tokenData.refreshToken,
  );

  try {
    const updatedPayload = formatBingTokenPayload({
      refreshToken: tokenData.refreshToken,
      accessToken,
      expiresAt: Date.now() + Math.max(((expiresInSeconds ?? 3600) - 300) * 1000, 60000),
    });
    await prisma.searchIntegration.update({
      where: { id: integration.id },
      data: { encryptedRefreshToken: encryptSecret(updatedPayload) },
    });
  } catch (error) {
    console.error(
      "[bing] No se pudo persistir el access token en worker DB:",
      error instanceof Error ? error.message : String(error),
    );
  }

  return accessToken;
}
