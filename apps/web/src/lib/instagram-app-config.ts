import { getStoredThreadsAppCredentials } from "@/lib/threads-app-config";

export async function getStoredInstagramAppCredentials() {
  return getStoredThreadsAppCredentials();
}
