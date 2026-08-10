export type TitleStatus =
  "pending" | "processing" | "success" | "error" | "cancelled";
export type RunStatus =
  "pending" | "running" | "success" | "halted" | "cancelled";
export type SyncStatus = "pending" | "running" | "success" | "error";

export interface TitleEventRow {
  id: string;
  message: string;
  createdAt: string;
}

export interface TitleRow {
  id: string;
  text: string;
  order: number;
  status: TitleStatus;
  attempts: number;
  articleUrl: string | null;
  finalTitle: string | null;
  errorMessage: string | null;
  googleIndexingStatus: string | null;
  googleIndexingMessage: string | null;
  googleIndexingAt: string | null;
  bingIndexingStatus: string | null;
  bingIndexingMessage: string | null;
  bingIndexingAt: string | null;
  lastSitemapSentAt: string | null;
  businessProfilePost: {
    status: string;
    sentAt: string | null;
    googleResponse: string | null;
  } | null;
  threadsPublishStatus: string | null;
  threadsPostId: string | null;
  threadsPublishError: string | null;
  threadsPublishAt: string | null;
  twitterPublishStatus: string | null;
  twitterPostId: string | null;
  twitterPublishError: string | null;
  twitterPublishAt: string | null;
  instagramPublishStatus: string | null;
  instagramPostId: string | null;
  instagramPublishError: string | null;
  instagramPublishAt: string | null;
  events: TitleEventRow[];
}

export interface CategoryRow {
  id: string;
  name: string;
  externalId: string;
  isSequence: boolean;
}

export interface LanguageRow {
  id: string;
  name: string;
  externalId: string;
}

export interface RunRow {
  id: string;
  status: RunStatus;
  createdAt: string;
  finishedAt: string | null;
  titles: TitleRow[];
  category: CategoryRow | null;
}
