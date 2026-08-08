import { prisma } from "@auto-articulos/db";
import { decryptSecret, getThreadsAppCredentials } from "@auto-articulos/shared";

export async function getStoredThreadsAppCredentials() {
  const [idSetting, secretSetting] = await Promise.all([
    prisma.systemSetting.findUnique({ where: { key: "threads_app_id" } }),
    prisma.systemSetting.findUnique({ where: { key: "threads_app_secret" } }),
  ]);

  if (idSetting && secretSetting) {
    const appId = decryptSecret(idSetting.encryptedValue);
    const appSecret = decryptSecret(secretSetting.encryptedValue);
    return { appId, appSecret };
  }

  return getThreadsAppCredentials();
}
