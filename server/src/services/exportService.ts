import type { SteamArchiveResponse } from "../types/steam.js";
import { ApiError, errorCodes } from "../utils/errors.js";
import { gamesToCsv } from "../utils/csv.js";
import { getCache } from "./cacheService.js";
import { getArchiveGamesFromDb } from "./historyService.js";
import { buildArchiveResponse } from "./steamParser.js";

export function getCachedArchive(steamid64: string): SteamArchiveResponse {
  const archive = getCache<SteamArchiveResponse>(`owned-games:${steamid64}`);
  if (archive) return archive;
  const games = getArchiveGamesFromDb(steamid64);
  if (games.length) {
    return buildArchiveResponse({
      steamid64,
      profileUrl: `https://steamcommunity.com/profiles/${steamid64}/`,
      games,
      fromCache: true
    });
  }
  throw new ApiError(404, errorCodes.EMPTY_LIBRARY, "No cached or local archive found. Open this dossier once before exporting.");
}

export function exportCsv(steamid64: string): string {
  try {
    return gamesToCsv(getCachedArchive(steamid64).games);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, errorCodes.CSV_EXPORT_FAILED, "CSV export failed.", error instanceof Error ? error.message : String(error));
  }
}

export function exportMarkdown(steamid64: string): string {
  const archive = getCachedArchive(steamid64);
  const rows = archive.games
    .slice(0, 50)
    .map((game, index) => `| ${index + 1} | ${game.name.replace(/\|/g, "\\|")} | ${game.appid} | ${game.playtimeForeverHours} | ${(game.playtime2WeeksMinutes / 60).toFixed(1)} |`)
    .join("\n");
  return `# PLAYTIME ARCHIVE / ${archive.steamid64}

Generated from the local Steam playtime archive.

## Archive Summary

- Total titles: ${archive.gameCount}
- Total hours: ${archive.totalPlaytimeHours}
- Recent 14 days: ${(archive.recent2WeeksMinutes / 60).toFixed(1)}h
- Opened titles: ${archive.playedGameCount}
- Unopened titles: ${archive.unplayedGameCount}
- Primary record: ${archive.topGame?.name ?? "None"}
- Top 10 share: ${archive.top10Share}%

## Catalogue Index / Top 50

| # | Title | AppID | Total Hours | Recent 14 Days |
|---|---|---:|---:|---:|
${rows}
`;
}
