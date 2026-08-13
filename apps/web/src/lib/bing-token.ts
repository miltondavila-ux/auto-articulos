import { prisma } from "@auto-articulos/db";
import {
  decryptSecret,
  encryptSecret,
  getBingAccessToken,
} from "@auto-articulos/shared";

/**
 * Único punto por el que la web pide un access token de Bing.
 *
 * Existe para que nadie se olvide de guardar el refresh token rotado: Bing
 * anula el anterior en cada canje, así que si no se persiste el nuevo, la
 * conexión del usuario queda muerta después de un solo uso. Ese era el bug que
 * hacía aparecer "Tu conexión con Bing venció" a los pocos minutos de
 * reconectar (cuenta de Lorena Álvarez, 13/8/2026).
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
      // Si no se pudo guardar, el token viejo ya quedó anulado del lado de
      // Bing igual, así que la próxima llamada va a fallar y el usuario va a
      // ver el aviso de reconectar. Se registra para poder distinguir esta
      // causa de un token realmente vencido.
      console.error(
        "[bing] No se pudo guardar el refresh token rotado:",
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  return accessToken;
}
