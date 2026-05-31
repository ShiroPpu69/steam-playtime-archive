import { config } from "../config.js";
import type { SteamArchiveResponse } from "../types/steam.js";
import { parseSteamProfileUrl } from "../utils/url.js";
import { getCache, setCache } from "./cacheService.js";
import { getOwnedGames, resolveVanityUrl } from "./steamApi.js";
import { buildArchiveResponse } from "./steamParser.js";
import { persistArchive } from "./historyService.js";

export async function resolveProfile(profileUrl: string) {
  const parsed = parseSteamProfileUrl(profileUrl);
  const steamid64 = parsed.type === "steamid64" ? parsed.steamid64! : await resolveVanityUrl(parsed.vanityName!);
  return {
    steamid64,
    vanityName: parsed.vanityName,
    profileUrl: parsed.profileUrl
  };
}

export async function getArchive(profileUrl: string, refresh: boolean): Promise<SteamArchiveResponse> {
  const profile = await resolveProfile(profileUrl);
  const cacheKey = `owned-games:${profile.steamid64}`;
  if (!refresh) {
    const cached = getCache<SteamArchiveResponse>(cacheKey);
    if (cached) return { ...cached, fromCache: true };
  }

  const games = await getOwnedGames(profile.steamid64);
  const persisted = persistArchive({ ...profile, games });
  const response = buildArchiveResponse({
    ...profile,
    games,
    fromCache: false,
    lastSyncedAt: persisted.capturedAt
  });
  setCache(cacheKey, response, config.cacheTtlSeconds);
  return response;
}
