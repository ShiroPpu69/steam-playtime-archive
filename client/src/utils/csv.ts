import type { ArchiveResponse } from "../types/steam";

function escapeCsv(value: string | number | boolean): string {
  const raw = String(value);
  return /[",\n]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw;
}

function downloadBlob(contents: string, filename: string, type: string) {
  const blob = new Blob([contents], { type });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function downloadCsv(archive: ArchiveResponse) {
  const headers = [
    "appid",
    "name",
    "playtime_forever_minutes",
    "playtime_forever_hours",
    "playtime_2weeks_minutes",
    "has_community_visible_stats",
    "steam_store_url"
  ];
  const rows = archive.games.map((game) => [
    game.appid,
    game.name,
    game.playtimeForeverMinutes,
    game.playtimeForeverHours,
    game.playtime2WeeksMinutes,
    game.hasCommunityVisibleStats,
    game.storeUrl
  ]);
  const csv = [headers, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n");
  downloadBlob(csv, `playtime-archive-${archive.steamid64}.csv`, "text/csv;charset=utf-8");
}

export function downloadJson(archive: ArchiveResponse) {
  downloadBlob(JSON.stringify(archive, null, 2), `playtime-archive-${archive.steamid64}.json`, "application/json");
}
