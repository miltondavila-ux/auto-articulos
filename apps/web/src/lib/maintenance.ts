import { prisma } from "@auto-articulos/db";
import { decryptSecret, encryptSecret } from "@auto-articulos/shared";

export const MAINTENANCE_MODE_KEY = "system_maintenance_mode";

export async function getMaintenanceMode(): Promise<boolean> {
  const setting = await prisma.systemSetting.findUnique({
    where: { key: MAINTENANCE_MODE_KEY },
  });
  if (!setting?.encryptedValue) return false;

  try {
    return decryptSecret(setting.encryptedValue) === "true";
  } catch {
    return setting.encryptedValue === "true";
  }
}

export async function setMaintenanceMode(enabled: boolean): Promise<void> {
  const encryptedValue = encryptSecret(enabled ? "true" : "false");
  await prisma.systemSetting.upsert({
    where: { key: MAINTENANCE_MODE_KEY },
    create: { key: MAINTENANCE_MODE_KEY, encryptedValue },
    update: { encryptedValue },
  });
}
