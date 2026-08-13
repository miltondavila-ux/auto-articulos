import { prisma } from "@auto-articulos/db";
import {
  decryptSecret,
  encryptSecret,
  getBingAccessToken,
} from "@auto-articulos/shared";

/**
 * Mismo criterio que apps/web/src/lib/bing-token.ts: único punto por el que el
 * worker pide un access token de Bing, para que el refresh token rotado se
 * guarde siempre. Bing anula el anterior en cada canje; si no se persiste el
 * nuevo, la conexión del usuario muere después de un solo uso.
 */
export async function getBingTokenForIntegration(integration: {
  id: string;
  encryptedRefreshToken: string;
}): Promise<string> {
  const { accessToken, rotatedRefreshToken } = await getBingAccessToken(
    decryptSecret(integration.encryptedRefreshToken),
  );

  if (rotatedRefreshToken) {
    try {
      await prisma.searchIntegration.update({
        where: { id: integration.id },
        data: { encryptedRefreshToken: encryptSecret(rotatedRefreshToken) },
      });
    } catch (error) {
      console.error(
        "[bing] No se pudo guardar el refresh token rotado:",
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  return accessToken;
}
