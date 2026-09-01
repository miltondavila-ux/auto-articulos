import { createHmac, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";
import { getStoredThreadsAppCredentials } from "./threads-app-config";

export type ThreadsSignedRequest = {
  algorithm?: string;
  issued_at?: number;
  user_id?: string | number;
  [key: string]: unknown;
};

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(normalized, "base64");
}

async function readSignedRequest(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = await request.json().catch(() => null);
    return typeof body?.signed_request === "string" ? body.signed_request : null;
  }

  const form = await request.formData().catch(() => null);
  const signedRequest = form?.get("signed_request");
  return typeof signedRequest === "string" ? signedRequest : null;
}

/**
 * Verifica el signed_request que Meta envía en los callbacks de Threads.
 * Nunca devuelve ni registra el contenido firmado si la firma no es válida.
 */
export async function verifyThreadsSignedRequest(request: NextRequest): Promise<ThreadsSignedRequest | null> {
  const signedRequest = await readSignedRequest(request);
  if (!signedRequest) return null;

  const separator = signedRequest.indexOf(".");
  if (separator <= 0 || separator === signedRequest.length - 1) return null;

  const encodedSignature = signedRequest.slice(0, separator);
  const encodedPayload = signedRequest.slice(separator + 1);

  let signature: Buffer;
  let payload: ThreadsSignedRequest;
  try {
    signature = decodeBase64Url(encodedSignature);
    payload = JSON.parse(decodeBase64Url(encodedPayload).toString("utf8")) as ThreadsSignedRequest;
  } catch {
    return null;
  }

  if (payload.algorithm && payload.algorithm.toUpperCase() !== "HMAC-SHA256") {
    return null;
  }

  let appSecret: string;
  try {
    ({ appSecret } = await getStoredThreadsAppCredentials());
  } catch {
    return null;
  }

  const expectedSignature = createHmac("sha256", appSecret).update(encodedPayload).digest();
  if (signature.length !== expectedSignature.length || !timingSafeEqual(signature, expectedSignature)) {
    return null;
  }

  return payload;
}

export function threadsUserIdFromPayload(payload: ThreadsSignedRequest) {
  const userId = payload.user_id;
  return userId === undefined || userId === null ? null : String(userId);
}
