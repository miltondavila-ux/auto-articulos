import { prisma } from "@auto-articulos/db";
import { decryptSecret, getInstagramAppCredentials } from "@auto-articulos/shared";

export async function getStoredInstagramAppCredentials() {
  const [idSetting, secretSetting] = await Promise.all([
    prisma.systemSetting.findUnique({ where: { key: "instagram_app_id" } }),
    prisma.systemSetting.findUnique({ where: { key: "instagram_app_secret" } }),
  ]);

  if (idSetting && secretSetting) {
    const appId = decryptSecret(idSetting.encryptedValue);
    const appSecret = decryptSecret(secretSetting.encryptedValue);
    return { appId, appSecret };
  }

  return getInstagramAppCredentials();
}
