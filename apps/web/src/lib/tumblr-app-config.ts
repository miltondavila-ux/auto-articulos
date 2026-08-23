import { decryptSecret } from "@auto-articulos/shared";
import { prisma } from "@auto-articulos/db";

export async function getStoredTumblrAppCredentials() {
  const [idSetting, secretSetting] = await Promise.all([
    prisma.systemSetting.findUnique({ where: { key: "tumblr_client_id" } }),
    prisma.systemSetting.findUnique({ where: { key: "tumblr_client_secret" } }),
  ]);
  const clientId = idSetting ? decryptSecret(idSetting.encryptedValue) : process.env.TUMBLR_CLIENT_ID;
  const clientSecret = secretSetting ? decryptSecret(secretSetting.encryptedValue) : process.env.TUMBLR_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Tumblr no está configurado.");
  return { clientId, clientSecret };
}
