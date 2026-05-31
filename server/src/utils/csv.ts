import type { ArchiveGame } from "../types/steam.js";

function escapeCsv(value: string | number | boolean): string {
  const raw = String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

export function gamesToCsv(games: ArchiveGame[]): string {
  const headers = [
    "appid",
    "name",
    "playtime_forever_minutes",
    "playtime_forever_hours",
    "playtime_2weeks_minutes",
    "has_community_visible_stats",
    "steam_store_url"
  ];
  const rows = games.map((game) => [
    game.appid,
    game.name,
    game.playtimeForeverMinutes,
    game.playtimeForeverHours,
    game.playtime2WeeksMinutes,
    game.hasCommunityVisibleStats,
    game.storeUrl
  ]);
  return [headers, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n");
}
