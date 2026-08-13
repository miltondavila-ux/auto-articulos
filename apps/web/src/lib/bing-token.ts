import { prisma } from "@auto-articulos/db";
import {
  decryptSecret,
  encryptSecret,
  getBingAccessToken,
  parseBingTokenPayload,
  formatBingTokenPayload,
} from "@auto-articulos/shared";

/**
 * Único punto por el que la web pide un access token de Bing.
 *
 * Utiliza el access token persistido en base de datos si aún es válido
 * (evitando consultas repetitivas a Bing OAuth), y si ya expiró, solicita
 * uno nuevo con el refresh token original y lo guarda actualizado.
 */
export async function getBingTokenForIntegration(integration: {
  id: string;
  encryptedRefreshToken: string;
}): Promise<string> {
  const decrypted = decryptSecret(integration.encryptedRefreshToken);
  const tokenData = parseBingTokenPayload(decrypted);

  // Si tenemos un accessToken válido en DB (con margen de 2 minutos antes de expirar), lo usamos directo
  if (
    tokenData.accessToken &&
    tokenData.expiresAt &&
    Date.now() < tokenData.expiresAt - 120000
  ) {
    return tokenData.accessToken;
  }

  // Si no hay accessToken válido en DB o ya expiró, refrescamos con Bing
  const { accessToken, expiresInSeconds } = await getBingAccessToken(
    tokenData.refreshToken,
  );

  // Guardamos el nuevo accessToken actualizado junto al refreshToken original
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
      "[bing] No se pudo persistir el access token actualizado en DB:",
      error instanceof Error ? error.message : String(error),
    );
  }

  return accessToken;
}
