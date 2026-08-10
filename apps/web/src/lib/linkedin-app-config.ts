import { prisma } from "@auto-articulos/db";
import { decryptSecret, getLinkedInAppCredentials } from "@auto-articulos/shared";

export async function getStoredLinkedInAppCredentials() {
  const [idSetting, secretSetting] = await Promise.all([
    prisma.systemSetting.findUnique({ where: { key: "linkedin_client_id" } }),
    prisma.systemSetting.findUnique({ where: { key: "linkedin_client_secret" } }),
  ]);

  if (idSetting && secretSetting) {
    const clientId = decryptSecret(idSetting.encryptedValue);
    const clientSecret = decryptSecret(secretSetting.encryptedValue);
    return { clientId, clientSecret };
  }

  return getLinkedInAppCredentials();
}
