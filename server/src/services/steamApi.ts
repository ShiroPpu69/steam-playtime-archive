import { config } from "../config.js";
import type { AchievementSummary, AppDetails, RecentGame } from "../types/steam.js";
import { ApiError, errorCodes } from "../utils/errors.js";
import { iconUrl, imageUrl, normalizeGame, storeUrl } from "./steamParser.js";
import { getCache, setCache } from "./cacheService.js";

const timeoutMs = 12000;

function requireKey(): string {
  if (!config.steamApiKey || config.steamApiKey === "your_steam_web_api_key_here") {
    throw new ApiError(400, errorCodes.MISSING_API_KEY, "Steam API Key is missing. Configure STEAM_API_KEY in backend .env, or use the mock dossier.");
  }
  return config.steamApiKey;
}

async function steamFetch<T>(url: URL): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    const bodyText = await response.text();
    if (response.status === 429 || response.status === 503) {
      throw new ApiError(503, errorCodes.RATE_LIMITED, "Steam API is temporarily unavailable or rate limited. Please retry later.", `HTTP ${response.status}`);
    }
    if (response.status === 401 || response.status === 403) {
      throw new ApiError(response.status, errorCodes.STEAM_REQUEST_FAILED, "Steam rejected the request. Check that the API key is valid and the profile is public.", bodyText.slice(0, 240));
    }
    if (!response.ok) {
      throw new ApiError(response.status, errorCodes.STEAM_REQUEST_FAILED, "Steam API request failed.", bodyText.slice(0, 240));
    }
    try {
      return JSON.parse(bodyText) as T;
    } catch {
      throw new ApiError(502, errorCodes.INVALID_RESPONSE, "Steam API returned an unexpected response format.", bodyText.slice(0, 240));
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new ApiError(504, errorCodes.NETWORK_TIMEOUT, "Steam API request timed out. Please retry later.");
    }
    throw new ApiError(502, errorCodes.STEAM_REQUEST_FAILED, "Steam API request failed.", error instanceof Error ? error.message : String(error));
  } finally {
    clearTimeout(timer);
  }
}

export async function resolveVanityUrl(vanityName: string): Promise<string> {
  const url = new URL("https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/");
  url.searchParams.set("key", requireKey());
  url.searchParams.set("vanityurl", vanityName);
  const data = await steamFetch<{ response?: { success: number; steamid?: string; message?: string } }>(url);
  if (!data.response || data.response.success !== 1 || !data.response.steamid) {
    throw new ApiError(404, errorCodes.VANITY_NOT_FOUND, "Unable to resolve this Steam vanity URL. Please confirm the account exists.", data.response?.message);
  }
  return data.response.steamid;
}

export async function getOwnedGames(steamid64: string) {
  const url = new URL("https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/");
  url.searchParams.set("key", requireKey());
  url.searchParams.set("steamid", steamid64);
  url.searchParams.set("include_appinfo", "1");
  url.searchParams.set("include_played_free_games", "1");
  url.searchParams.set("format", "json");
  const data = await steamFetch<{ response?: { game_count?: number; games?: any[] } }>(url);
  if (!data.response || !Array.isArray(data.response.games)) {
    throw new ApiError(403, errorCodes.PRIVATE_PROFILE, "Unable to read the game library. Confirm Steam Game Details are public or accessible.");
  }
  if (data.response.games.length === 0) {
    throw new ApiError(404, errorCodes.EMPTY_LIBRARY, "The game library is empty, private, or unavailable through Steam Web API.");
  }
  return data.response.games.map(normalizeGame);
}

export async function getRecentlyPlayed(steamid64: string): Promise<RecentGame[]> {
  const url = new URL("https://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v1/");
  url.searchParams.set("key", requireKey());
  url.searchParams.set("steamid", steamid64);
  url.searchParams.set("format", "json");
  const data = await steamFetch<{ response?: { games?: any[] } }>(url);
  return (data.response?.games ?? []).map((game) => ({
    appid: Number(game.appid),
    name: String(game.name ?? `App ${game.appid}`),
    playtime2WeeksMinutes: Number(game.playtime_2weeks ?? 0),
    playtimeForeverMinutes: Number(game.playtime_forever ?? 0),
    iconUrl: iconUrl(Number(game.appid), game.img_icon_url),
    imageUrl: imageUrl(Number(game.appid)),
    storeUrl: storeUrl(Number(game.appid))
  }));
}

export async function getAchievements(steamid64: string, appid: number): Promise<AchievementSummary> {
  const url = new URL("https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v1/");
  url.searchParams.set("key", requireKey());
  url.searchParams.set("steamid", steamid64);
  url.searchParams.set("appid", String(appid));
  const data = await steamFetch<{ playerstats?: { achievements?: Array<{ achieved: number }> } }>(url);
  const achievements = data.playerstats?.achievements ?? [];
  const achieved = achievements.filter((item) => item.achieved === 1).length;
  return {
    appid,
    achieved,
    total: achievements.length,
    completionRate: achievements.length ? Number(((achieved / achievements.length) * 100).toFixed(1)) : 0
  };
}

export async function getAppDetails(appid: number): Promise<AppDetails> {
  const cacheKey = `appdetails:${appid}`;
  const cached = getCache<AppDetails>(cacheKey);
  if (cached) return cached;
  const url = new URL("https://store.steampowered.com/api/appdetails");
  url.searchParams.set("appids", String(appid));
  const data = await steamFetch<Record<string, { success: boolean; data?: any }>>(url);
  const item = data[String(appid)];
  if (!item?.success || !item.data) {
    throw new ApiError(404, errorCodes.STEAM_REQUEST_FAILED, "Steam Store metadata unavailable for this app.");
  }
  const details: AppDetails = {
    appid,
    name: item.data.name,
    capsuleImage: item.data.capsule_image,
    developers: item.data.developers ?? [],
    publishers: item.data.publishers ?? [],
    genres: (item.data.genres ?? []).map((genre: { description: string }) => genre.description),
    isFree: item.data.is_free,
    storeUrl: storeUrl(appid)
  };
  setCache(cacheKey, details, 86400);
  return details;
}
