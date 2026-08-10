import { prisma } from "@auto-articulos/db";
import { decryptSecret, getInstagramAppCredentials } from "@auto-articulos/shared";

export async function getStoredInstagramAppCredentials() {
  const [idSetting, secretSetting] = await Promise.all([
    prisma.systemSetting.findUnique({ where: { key: "meta_app_id" } }),
    prisma.systemSetting.findUnique({ where: { key: "meta_app_secret" } }),
  ]);

  if (idSetting && secretSetting) {
    return {
      appId: decryptSecret(idSetting.encryptedValue),
      appSecret: decryptSecret(secretSetting.encryptedValue),
    };
  }

  return getInstagramAppCredentials();
}
