import type { AchievementSummary, ApiErrorBody, AppDetails, ArchiveProfile, ArchiveResponse, GameHistoryPoint, HistoryRun, RecentGame } from "../types/steam";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiErrorBody | null;
    throw new Error(body?.error?.message ?? "Archive request failed.");
  }
  return (await response.json()) as T;
}

export function fetchArchive(profileUrl: string, refresh = false) {
  return request<ArchiveResponse>(`/api/steam/games?profileUrl=${encodeURIComponent(profileUrl)}&refresh=${refresh}`);
}

export function fetchMockArchive() {
  return request<ArchiveResponse>("/api/mock/games");
}

export function fetchHistory(steamid64: string) {
  return request<{ steamid64: string; runs: HistoryRun[] }>(`/api/history?steamid64=${encodeURIComponent(steamid64)}`);
}

export function fetchGameHistory(steamid64: string, appid: number) {
  return request<{ steamid64: string; appid: number; points: GameHistoryPoint[] }>(`/api/history/game?steamid64=${encodeURIComponent(steamid64)}&appid=${appid}`);
}

export function fetchRecent(steamid64: string) {
  return request<{ steamid64: string; games: RecentGame[] }>(`/api/steam/recent?steamid64=${encodeURIComponent(steamid64)}`);
}

export function fetchAppDetails(appid: number) {
  return request<AppDetails>(`/api/steam/appdetails?appid=${appid}`);
}

export function fetchProfiles() {
  return request<{ profiles: ArchiveProfile[] }>("/api/profiles");
}

export async function deleteProfile(steamid64: string) {
  return request<{ deleted: boolean }>(`/api/profiles/${encodeURIComponent(steamid64)}`, { method: "DELETE" });
}

export function fetchAchievements(steamid64: string, appid: number) {
  return request<AchievementSummary>(`/api/steam/achievements?steamid64=${encodeURIComponent(steamid64)}&appid=${appid}`);
}

export function exportUrl(type: "csv" | "json" | "markdown", steamid64: string) {
  return `/api/export/${type}?steamid64=${encodeURIComponent(steamid64)}`;
}
