const ACCOUNT_MGMT_API = "https://mybusinessaccountmanagement.googleapis.com/v1";
const BUSINESS_INFO_API = "https://mybusinessbusinessinformation.googleapis.com/v1";
const LOCAL_POSTS_API = "https://mybusiness.googleapis.com/v4";

export interface BusinessAccount {
  name: string; // "accounts/123"
  accountName: string;
  type: string;
}

export async function listBusinessAccounts(
  accessToken: string,
): Promise<BusinessAccount[]> {
  const response = await fetch(`${ACCOUNT_MGMT_API}/accounts`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = (await response.json()) as {
    accounts?: BusinessAccount[];
    error?: { message?: string };
  };
  if (!response.ok) {
    throw new Error(
      data.error?.message ?? "No se pudieron listar las cuentas de Google Business Profile.",
    );
  }
  return data.accounts ?? [];
}

export interface BusinessLocation {
  name: string; // "accounts/123/locations/456"
  title: string;
}

export async function listBusinessLocations(
  accessToken: string,
  accountName: string,
): Promise<BusinessLocation[]> {
  const response = await fetch(
    `${BUSINESS_INFO_API}/${accountName}/locations?readMask=name,title`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  const data = (await response.json()) as {
    locations?: BusinessLocation[];
    error?: { message?: string };
  };
  if (!response.ok) {
    throw new Error(
      data.error?.message ?? "No se pudieron listar las ubicaciones de Google Business Profile.",
    );
  }
  return data.locations ?? [];
}

export interface CreateLocalPostInput {
  summary: string;
  ctaUrl: string;
  imageUrl?: string;
}

export interface LocalPostResult {
  name?: string;
  state?: string; // LIVE | PROCESSING | SCHEDULED | REJECTED
}

/**
 * Crea la publicación en Google Business Profile. locationName tiene la
 * forma "accounts/123/locations/456" (ver BusinessProfileIntegration).
 */
export async function createLocalPost(
  accessToken: string,
  locationName: string,
  post: CreateLocalPostInput,
): Promise<LocalPostResult> {
  const response = await fetch(`${LOCAL_POSTS_API}/${locationName}/localPosts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      languageCode: "es",
      topicType: "STANDARD",
      summary: post.summary,
      callToAction: { actionType: "LEARN_MORE", url: post.ctaUrl },
      media: post.imageUrl ? [{ sourceUrl: post.imageUrl }] : undefined,
    }),
  });
  const data = (await response.json().catch(() => ({}))) as LocalPostResult & {
    error?: { message?: string };
  };
  if (!response.ok) {
    throw new Error(
      data.error?.message ?? `Google Business Profile respondió ${response.status}.`,
    );
  }
  return data;
}
