import type { ArchiveGame, SteamArchiveResponse } from "../types/steam.js";
import { minutesToHours, minutesToText, nowIso } from "../utils/time.js";

export function iconUrl(appid: number, hash?: string): string {
  return hash ? `https://media.steampowered.com/steamcommunity/public/images/apps/${appid}/${hash}.jpg` : "";
}

export function imageUrl(appid: number): string {
  return `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/capsule_184x69.jpg`;
}

export function storeUrl(appid: number): string {
  return `https://store.steampowered.com/app/${appid}`;
}

export function normalizeGame(raw: any): ArchiveGame {
  const minutes = Number(raw.playtime_forever ?? raw.playtimeForeverMinutes ?? 0);
  const recent = Number(raw.playtime_2weeks ?? raw.playtime2WeeksMinutes ?? 0);
  const appid = Number(raw.appid);
  return {
    appid,
    name: String(raw.name ?? `App ${appid}`),
    playtimeForeverMinutes: minutes,
    playtimeForeverHours: minutesToHours(minutes),
    playtimeForeverText: minutesToText(minutes),
    playtime2WeeksMinutes: recent,
    iconUrl: raw.iconUrl ?? iconUrl(appid, raw.img_icon_url),
    imageUrl: raw.imageUrl ?? imageUrl(appid),
    hasCommunityVisibleStats: Boolean(raw.has_community_visible_stats ?? raw.hasCommunityVisibleStats ?? false),
    storeUrl: raw.storeUrl ?? storeUrl(appid)
  };
}

export function buildArchiveResponse(input: {
  steamid64: string;
  vanityName?: string;
  profileUrl: string;
  games: ArchiveGame[];
  fromCache: boolean;
  lastSyncedAt?: string;
}): SteamArchiveResponse {
  const games = [...input.games].sort((a, b) => b.playtimeForeverMinutes - a.playtimeForeverMinutes);
  const totalPlaytimeMinutes = games.reduce((sum, game) => sum + game.playtimeForeverMinutes, 0);
  const recent2WeeksMinutes = games.reduce((sum, game) => sum + game.playtime2WeeksMinutes, 0);
  const playedGameCount = games.filter((game) => game.playtimeForeverMinutes > 0).length;
  const top10Minutes = games.slice(0, 10).reduce((sum, game) => sum + game.playtimeForeverMinutes, 0);
  return {
    steamid64: input.steamid64,
    vanityName: input.vanityName,
    profileUrl: input.profileUrl,
    gameCount: games.length,
    totalPlaytimeMinutes,
    totalPlaytimeHours: minutesToHours(totalPlaytimeMinutes),
    playedGameCount,
    unplayedGameCount: games.length - playedGameCount,
    recent2WeeksMinutes,
    averagePlaytimeHours: games.length ? minutesToHours(Math.round(totalPlaytimeMinutes / games.length)) : 0,
    topGame: games[0],
    top10Share: totalPlaytimeMinutes ? Number(((top10Minutes / totalPlaytimeMinutes) * 100).toFixed(1)) : 0,
    fromCache: input.fromCache,
    lastSyncedAt: input.lastSyncedAt ?? nowIso(),
    games
  };
}
