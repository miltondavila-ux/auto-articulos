import { prisma } from "@auto-articulos/db";
import { decryptSecret, getTwitterAppCredentials } from "@auto-articulos/shared";

export async function getStoredTwitterAppCredentials() {
  const [idSetting, secretSetting] = await Promise.all([
    prisma.systemSetting.findUnique({ where: { key: "twitter_client_id" } }),
    prisma.systemSetting.findUnique({ where: { key: "twitter_client_secret" } }),
  ]);

  if (idSetting && secretSetting) {
    const clientId = decryptSecret(idSetting.encryptedValue);
    const clientSecret = decryptSecret(secretSetting.encryptedValue);
    return { clientId, clientSecret };
  }

  return getTwitterAppCredentials();
}
