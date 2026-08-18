import { prisma } from "@auto-articulos/db";
import { decryptSecret } from "@auto-articulos/shared";

export async function getStoredPinterestAppCredentials() {
  const [idSetting, secretSetting] = await Promise.all([
    prisma.systemSetting.findUnique({ where: { key: "pinterest_client_id" } }),
    prisma.systemSetting.findUnique({ where: { key: "pinterest_client_secret" } }),
  ]);
  if (idSetting && secretSetting) {
    return { clientId: decryptSecret(idSetting.encryptedValue), clientSecret: decryptSecret(secretSetting.encryptedValue) };
  }
  const clientId = process.env.PINTEREST_CLIENT_ID;
  const clientSecret = process.env.PINTEREST_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Pinterest no está configurado.");
  return { clientId, clientSecret };
}
