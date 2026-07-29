export type TitleStatus = "pending" | "processing" | "success" | "error";
export type RunStatus = "pending" | "running" | "success" | "halted";
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
  errorMessage: string | null;
  events: TitleEventRow[];
}

export interface CategoryRow {
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
