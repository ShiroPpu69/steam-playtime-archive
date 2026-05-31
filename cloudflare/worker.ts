interface Env {
  DB: D1Database;
  STEAM_API_KEY: string;
  CACHE_TTL_SECONDS?: string;
  ASSETS: Fetcher;
}

type Game = {
  appid: number;
  name: string;
  playtimeForeverMinutes: number;
  playtimeForeverHours: number;
  playtimeForeverText: string;
  playtime2WeeksMinutes: number;
  iconUrl: string;
  imageUrl: string;
  hasCommunityVisibleStats: boolean;
  storeUrl: string;
};

class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: string) {
    super(message);
  }
}

const jsonHeaders = { "content-type": "application/json; charset=utf-8" };

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) {
      return env.ASSETS.fetch(request);
    }
    try {
      await ensureSchema(env.DB);
      const response = await route(request, env, url);
      return response ?? json({ error: { code: "NOT_FOUND", message: "Archive route not found." } }, 404);
    } catch (error) {
      if (error instanceof ApiError) {
        return json({ error: { code: error.code, message: error.message, details: error.details } }, error.status);
      }
      return json({
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Archive service failed while processing this record.",
          details: error instanceof Error ? error.message : String(error)
        }
      }, 500);
    }
  }
};

async function route(request: Request, env: Env, url: URL) {
  if (url.pathname === "/api/health") return json({ ok: true, service: "steam-playtime-archive-cloudflare" });
  if (url.pathname === "/api/mock/games") return json(mockArchive());
  if (url.pathname === "/api/steam/resolve") return json(await resolveProfile(env, stringParam(url, "profileUrl")));
  if (url.pathname === "/api/steam/games") {
    return json(await getArchive(env, stringParam(url, "profileUrl"), url.searchParams.get("refresh") === "true"));
  }
  if (url.pathname === "/api/steam/recent") return json({ steamid64: stringParam(url, "steamid64"), games: await getRecentlyPlayed(env, stringParam(url, "steamid64")) });
  if (url.pathname === "/api/steam/achievements") return json(await getAchievements(env, stringParam(url, "steamid64"), numberParam(url, "appid")));
  if (url.pathname === "/api/steam/appdetails") return json(await getAppDetails(env, numberParam(url, "appid")));
  if (url.pathname === "/api/history") return json({ steamid64: stringParam(url, "steamid64"), runs: await getHistory(env.DB, stringParam(url, "steamid64")) });
  if (url.pathname === "/api/history/game") {
    const steamid64 = stringParam(url, "steamid64");
    const appid = numberParam(url, "appid");
    return json({ steamid64, appid, points: await getGameHistory(env.DB, steamid64, appid) });
  }
  if (url.pathname === "/api/profiles") return json({ profiles: await listProfiles(env.DB) });
  if (url.pathname.startsWith("/api/profiles/") && request.method === "DELETE") {
    return json({ deleted: await deleteProfile(env.DB, decodeURIComponent(url.pathname.replace("/api/profiles/", ""))) });
  }
  if (url.pathname === "/api/export/json") return json(await getCachedArchive(env, stringParam(url, "steamid64")));
  if (url.pathname === "/api/export/csv") {
    const archive = await getCachedArchive(env, stringParam(url, "steamid64"));
    return new Response(gamesToCsv(archive.games), { headers: { "content-type": "text/csv; charset=utf-8" } });
  }
  if (url.pathname === "/api/export/markdown") {
    const archive = await getCachedArchive(env, stringParam(url, "steamid64"));
    return new Response(archiveToMarkdown(archive), { headers: { "content-type": "text/markdown; charset=utf-8" } });
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

function stringParam(url: URL, key: string) {
  const value = url.searchParams.get(key)?.trim();
  if (!value) throw new ApiError(400, "BAD_REQUEST", `Missing query parameter: ${key}`);
  return value;
}

function numberParam(url: URL, key: string) {
  const value = Number(stringParam(url, key));
  if (!Number.isFinite(value)) throw new ApiError(400, "BAD_REQUEST", `Invalid numeric parameter: ${key}`);
  return value;
}

function requireKey(env: Env) {
  if (!env.STEAM_API_KEY || env.STEAM_API_KEY === "your_steam_web_api_key_here") {
    throw new ApiError(400, "STEAM_API_KEY_MISSING", "Steam API Key is missing. Configure the STEAM_API_KEY Cloudflare secret.");
  }
  return env.STEAM_API_KEY;
}

async function steamFetch<T>(url: URL): Promise<T> {
  const response = await fetch(url, { cf: { cacheTtl: 0 } });
  const text = await response.text();
  if (response.status === 429 || response.status === 503) {
    throw new ApiError(503, "STEAM_RATE_LIMITED", "Steam API is temporarily unavailable or rate limited.", `HTTP ${response.status}`);
  }
  if (!response.ok) {
    throw new ApiError(response.status, "STEAM_REQUEST_FAILED", "Steam API request failed.", text.slice(0, 240));
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiError(502, "STEAM_INVALID_RESPONSE", "Steam API returned an unexpected response format.", text.slice(0, 240));
  }
}

function parseSteamProfileUrl(raw: string) {
  const cleaned = raw.trim();
  const withProtocol = /^https?:\/\//i.test(cleaned) ? cleaned : `https://${cleaned}`;
  let parsed: URL;
  try {
    parsed = new URL(withProtocol);
  } catch {
    throw new ApiError(400, "INVALID_STEAM_PROFILE_URL", "请输入有效的 Steam 个人主页链接。");
  }
  if (parsed.hostname.toLowerCase() !== "steamcommunity.com") {
    throw new ApiError(400, "INVALID_STEAM_PROFILE_URL", "请输入 steamcommunity.com 的个人主页链接。");
  }
  const parts = parsed.pathname.split("/").filter(Boolean);
  if (parts[0] === "id" && parts[1]) {
    const vanityName = decodeURIComponent(parts[1]);
    return { type: "vanity" as const, vanityName, profileUrl: `https://steamcommunity.com/id/${encodeURIComponent(vanityName)}/` };
  }
  if (parts[0] === "profiles" && /^7656\d{13}$/.test(parts[1] ?? "")) {
    return { type: "steamid64" as const, steamid64: parts[1], profileUrl: `https://steamcommunity.com/profiles/${parts[1]}/` };
  }
  throw new ApiError(400, "INVALID_STEAM_PROFILE_URL", "请输入有效的 Steam 个人主页链接，例如 steamcommunity.com/id/xxx 或 steamcommunity.com/profiles/7656xxx。");
}

async function resolveProfile(env: Env, profileUrl: string) {
  const parsed = parseSteamProfileUrl(profileUrl);
  if (parsed.type === "steamid64") return { steamid64: parsed.steamid64, profileUrl: parsed.profileUrl };
  const url = new URL("https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/");
  url.searchParams.set("key", requireKey(env));
  url.searchParams.set("vanityurl", parsed.vanityName);
  const data = await steamFetch<{ response?: { success: number; steamid?: string; message?: string } }>(url);
  if (!data.response || data.response.success !== 1 || !data.response.steamid) {
    throw new ApiError(404, "STEAM_VANITY_NOT_FOUND", "Unable to resolve this Steam vanity URL.", data.response?.message);
  }
  return { steamid64: data.response.steamid, vanityName: parsed.vanityName, profileUrl: parsed.profileUrl };
}

async function getArchive(env: Env, profileUrl: string, refresh: boolean) {
  const profile = await resolveProfile(env, profileUrl);
  const cacheKey = `owned-games:${profile.steamid64}`;
  if (!refresh) {
    const cached = await getCache<any>(env.DB, cacheKey);
    if (cached) return { ...cached, fromCache: true };
  }
  const games = await getOwnedGames(env, profile.steamid64);
  const lastSyncedAt = await persistArchive(env.DB, { ...profile, games });
  const archive = buildArchiveResponse({ ...profile, games, fromCache: false, lastSyncedAt });
  await setCache(env.DB, cacheKey, archive, Number(env.CACHE_TTL_SECONDS ?? 3600));
  return archive;
}

async function getOwnedGames(env: Env, steamid64: string) {
  const url = new URL("https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/");
  url.searchParams.set("key", requireKey(env));
  url.searchParams.set("steamid", steamid64);
  url.searchParams.set("include_appinfo", "1");
  url.searchParams.set("include_played_free_games", "1");
  url.searchParams.set("format", "json");
  const data = await steamFetch<{ response?: { games?: any[] } }>(url);
  if (!data.response || !Array.isArray(data.response.games)) {
    throw new ApiError(403, "STEAM_PROFILE_PRIVATE", "无法读取游戏库。请确认 Steam 个人资料中的 Game Details / 游戏详情 为公开或可访问。");
  }
  if (!data.response.games.length) throw new ApiError(404, "STEAM_LIBRARY_EMPTY", "游戏库为空，或当前资料权限不允许读取。");
  return data.response.games.map(normalizeGame);
}

async function getRecentlyPlayed(env: Env, steamid64: string) {
  const url = new URL("https://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v1/");
  url.searchParams.set("key", requireKey(env));
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

async function getAchievements(env: Env, steamid64: string, appid: number) {
  const url = new URL("https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v1/");
  url.searchParams.set("key", requireKey(env));
  url.searchParams.set("steamid", steamid64);
  url.searchParams.set("appid", String(appid));
  const data = await steamFetch<{ playerstats?: { achievements?: Array<{ achieved: number }> } }>(url);
  const achievements = data.playerstats?.achievements ?? [];
  const achieved = achievements.filter((item) => item.achieved === 1).length;
  return { appid, achieved, total: achievements.length, completionRate: achievements.length ? Number(((achieved / achievements.length) * 100).toFixed(1)) : 0 };
}

async function getAppDetails(env: Env, appid: number) {
  const cacheKey = `appdetails:${appid}`;
  const cached = await getCache<any>(env.DB, cacheKey);
  if (cached) return cached;
  const url = new URL("https://store.steampowered.com/api/appdetails");
  url.searchParams.set("appids", String(appid));
  const data = await steamFetch<Record<string, { success: boolean; data?: any }>>(url);
  const item = data[String(appid)];
  if (!item?.success || !item.data) throw new ApiError(404, "STEAM_REQUEST_FAILED", "Steam Store metadata unavailable for this app.");
  const details = {
    appid,
    name: item.data.name,
    capsuleImage: item.data.capsule_image,
    developers: item.data.developers ?? [],
    publishers: item.data.publishers ?? [],
    genres: (item.data.genres ?? []).map((genre: { description: string }) => genre.description),
    isFree: item.data.is_free,
    storeUrl: storeUrl(appid)
  };
  await setCache(env.DB, cacheKey, details, 86400);
  return details;
}

function normalizeGame(raw: any): Game {
  const appid = Number(raw.appid);
  const minutes = Number(raw.playtime_forever ?? raw.playtimeForeverMinutes ?? 0);
  const recent = Number(raw.playtime_2weeks ?? raw.playtime2WeeksMinutes ?? 0);
  return {
    appid,
    name: String(raw.name ?? `App ${appid}`),
    playtimeForeverMinutes: minutes,
    playtimeForeverHours: Number((minutes / 60).toFixed(1)),
    playtimeForeverText: `${Math.floor(minutes / 60)} 小时 ${minutes % 60} 分钟`,
    playtime2WeeksMinutes: recent,
    iconUrl: raw.iconUrl ?? iconUrl(appid, raw.img_icon_url),
    imageUrl: raw.imageUrl ?? imageUrl(appid),
    hasCommunityVisibleStats: Boolean(raw.has_community_visible_stats ?? raw.hasCommunityVisibleStats ?? false),
    storeUrl: raw.storeUrl ?? storeUrl(appid)
  };
}

function buildArchiveResponse(input: { steamid64: string; vanityName?: string; profileUrl: string; games: Game[]; fromCache: boolean; lastSyncedAt?: string }) {
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
    totalPlaytimeHours: Number((totalPlaytimeMinutes / 60).toFixed(1)),
    playedGameCount,
    unplayedGameCount: games.length - playedGameCount,
    recent2WeeksMinutes,
    averagePlaytimeHours: games.length ? Number((totalPlaytimeMinutes / games.length / 60).toFixed(1)) : 0,
    topGame: games[0],
    top10Share: totalPlaytimeMinutes ? Number(((top10Minutes / totalPlaytimeMinutes) * 100).toFixed(1)) : 0,
    fromCache: input.fromCache,
    lastSyncedAt: input.lastSyncedAt ?? new Date().toISOString(),
    games
  };
}

function iconUrl(appid: number, hash?: string) {
  return hash ? `https://media.steampowered.com/steamcommunity/public/images/apps/${appid}/${hash}.jpg` : imageUrl(appid);
}

function imageUrl(appid: number) {
  return `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/capsule_184x69.jpg`;
}

function storeUrl(appid: number) {
  return `https://store.steampowered.com/app/${appid}`;
}

async function ensureSchema(db: D1Database) {
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS profiles (id INTEGER PRIMARY KEY AUTOINCREMENT, steamid64 TEXT NOT NULL UNIQUE, vanity_name TEXT, profile_url TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS games (id INTEGER PRIMARY KEY AUTOINCREMENT, appid INTEGER NOT NULL UNIQUE, name TEXT NOT NULL, icon_url TEXT, image_url TEXT, has_community_visible_stats INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS profile_games (id INTEGER PRIMARY KEY AUTOINCREMENT, profile_id INTEGER NOT NULL, appid INTEGER NOT NULL, playtime_forever_minutes INTEGER NOT NULL, playtime_2weeks_minutes INTEGER NOT NULL, last_synced_at TEXT NOT NULL, UNIQUE(profile_id, appid))"),
    db.prepare("CREATE TABLE IF NOT EXISTS playtime_snapshots (id INTEGER PRIMARY KEY AUTOINCREMENT, profile_id INTEGER NOT NULL, appid INTEGER NOT NULL, playtime_forever_minutes INTEGER NOT NULL, captured_at TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS sync_runs (id INTEGER PRIMARY KEY AUTOINCREMENT, profile_id INTEGER NOT NULL, total_games INTEGER NOT NULL, total_playtime_minutes INTEGER NOT NULL, played_game_count INTEGER NOT NULL, unplayed_game_count INTEGER NOT NULL, recent_2weeks_minutes INTEGER NOT NULL, primary_delta_appid INTEGER, primary_delta_name TEXT, primary_delta_minutes INTEGER, total_delta_minutes INTEGER, created_at TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS api_cache (id INTEGER PRIMARY KEY AUTOINCREMENT, cache_key TEXT NOT NULL UNIQUE, response_json TEXT NOT NULL, expires_at TEXT NOT NULL, created_at TEXT NOT NULL)")
  ]);
}

async function getCache<T>(db: D1Database, key: string): Promise<T | null> {
  const row = await db.prepare("SELECT response_json, expires_at FROM api_cache WHERE cache_key = ?").bind(key).first<{ response_json: string; expires_at: string }>();
  if (!row || Date.parse(row.expires_at) < Date.now()) return null;
  return JSON.parse(row.response_json) as T;
}

async function setCache(db: D1Database, key: string, value: unknown, ttlSeconds: number) {
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
  await db.prepare("INSERT INTO api_cache (cache_key, response_json, expires_at, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(cache_key) DO UPDATE SET response_json = excluded.response_json, expires_at = excluded.expires_at, created_at = excluded.created_at")
    .bind(key, JSON.stringify(value), expiresAt, createdAt).run();
}

async function persistArchive(db: D1Database, input: { steamid64: string; vanityName?: string; profileUrl: string; games: Game[] }) {
  const now = new Date().toISOString();
  await db.prepare("INSERT INTO profiles (steamid64, vanity_name, profile_url, created_at, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(steamid64) DO UPDATE SET vanity_name = excluded.vanity_name, profile_url = excluded.profile_url, updated_at = excluded.updated_at")
    .bind(input.steamid64, input.vanityName ?? null, input.profileUrl, now, now).run();
  const profile = await db.prepare("SELECT id FROM profiles WHERE steamid64 = ?").bind(input.steamid64).first<{ id: number }>();
  if (!profile) throw new ApiError(500, "D1_PROFILE_WRITE_FAILED", "Unable to write local archive profile.");
  let totalDelta = 0;
  let primary: { appid: number; name: string; delta: number } | undefined;
  const statements = [];
  for (const game of input.games) {
    const previous = await db.prepare("SELECT playtime_forever_minutes FROM playtime_snapshots WHERE profile_id = ? AND appid = ? ORDER BY captured_at DESC LIMIT 1").bind(profile.id, game.appid).first<{ playtime_forever_minutes: number }>();
    const delta = previous ? Math.max(0, game.playtimeForeverMinutes - previous.playtime_forever_minutes) : 0;
    totalDelta += delta;
    if (delta > 0 && (!primary || delta > primary.delta)) primary = { appid: game.appid, name: game.name, delta };
    statements.push(
      db.prepare("INSERT INTO games (appid, name, icon_url, image_url, has_community_visible_stats, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(appid) DO UPDATE SET name = excluded.name, icon_url = excluded.icon_url, image_url = excluded.image_url, has_community_visible_stats = excluded.has_community_visible_stats, updated_at = excluded.updated_at").bind(game.appid, game.name, game.iconUrl, game.imageUrl, game.hasCommunityVisibleStats ? 1 : 0, now, now),
      db.prepare("INSERT INTO profile_games (profile_id, appid, playtime_forever_minutes, playtime_2weeks_minutes, last_synced_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(profile_id, appid) DO UPDATE SET playtime_forever_minutes = excluded.playtime_forever_minutes, playtime_2weeks_minutes = excluded.playtime_2weeks_minutes, last_synced_at = excluded.last_synced_at").bind(profile.id, game.appid, game.playtimeForeverMinutes, game.playtime2WeeksMinutes, now),
      db.prepare("INSERT INTO playtime_snapshots (profile_id, appid, playtime_forever_minutes, captured_at) VALUES (?, ?, ?, ?)").bind(profile.id, game.appid, game.playtimeForeverMinutes, now)
    );
  }
  const total = input.games.reduce((sum, game) => sum + game.playtimeForeverMinutes, 0);
  const recent = input.games.reduce((sum, game) => sum + game.playtime2WeeksMinutes, 0);
  const played = input.games.filter((game) => game.playtimeForeverMinutes > 0).length;
  statements.push(db.prepare("INSERT INTO sync_runs (profile_id, total_games, total_playtime_minutes, played_game_count, unplayed_game_count, recent_2weeks_minutes, primary_delta_appid, primary_delta_name, primary_delta_minutes, total_delta_minutes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(profile.id, input.games.length, total, played, input.games.length - played, recent, primary?.appid ?? null, primary?.name ?? null, primary?.delta ?? 0, totalDelta, now));
  await db.batch(statements);
  return now;
}

async function getHistory(db: D1Database, steamid64: string) {
  const profile = await db.prepare("SELECT id FROM profiles WHERE steamid64 = ?").bind(steamid64).first<{ id: number }>();
  if (!profile) return [];
  const result = await db.prepare("SELECT id, total_games AS totalGames, total_playtime_minutes AS totalPlaytimeMinutes, played_game_count AS playedGameCount, unplayed_game_count AS unplayedGameCount, recent_2weeks_minutes AS recent2WeeksMinutes, primary_delta_appid AS primaryDeltaAppid, primary_delta_name AS primaryDeltaName, primary_delta_minutes AS primaryDeltaMinutes, total_delta_minutes AS totalDeltaMinutes, created_at AS createdAt FROM sync_runs WHERE profile_id = ? ORDER BY created_at DESC LIMIT 20").bind(profile.id).all();
  return result.results;
}

async function getGameHistory(db: D1Database, steamid64: string, appid: number) {
  const profile = await db.prepare("SELECT id FROM profiles WHERE steamid64 = ?").bind(steamid64).first<{ id: number }>();
  if (!profile) return [];
  const result = await db.prepare("SELECT appid, playtime_forever_minutes AS playtimeForeverMinutes, captured_at AS capturedAt FROM playtime_snapshots WHERE profile_id = ? AND appid = ? ORDER BY captured_at ASC LIMIT 100").bind(profile.id, appid).all();
  return result.results;
}

async function listProfiles(db: D1Database) {
  const result = await db.prepare("SELECT p.id, p.steamid64, p.vanity_name AS vanityName, p.profile_url AS profileUrl, p.created_at AS createdAt, p.updated_at AS updatedAt, sr.created_at AS lastSyncedAt, sr.total_games AS totalGames, sr.total_playtime_minutes AS totalPlaytimeMinutes FROM profiles p LEFT JOIN sync_runs sr ON sr.id = (SELECT id FROM sync_runs WHERE profile_id = p.id ORDER BY created_at DESC LIMIT 1) ORDER BY COALESCE(sr.created_at, p.updated_at) DESC").all();
  return result.results;
}

async function deleteProfile(db: D1Database, steamid64: string) {
  const profile = await db.prepare("SELECT id FROM profiles WHERE steamid64 = ?").bind(steamid64).first<{ id: number }>();
  if (!profile) return false;
  await db.batch([
    db.prepare("DELETE FROM profile_games WHERE profile_id = ?").bind(profile.id),
    db.prepare("DELETE FROM playtime_snapshots WHERE profile_id = ?").bind(profile.id),
    db.prepare("DELETE FROM sync_runs WHERE profile_id = ?").bind(profile.id),
    db.prepare("DELETE FROM profiles WHERE id = ?").bind(profile.id)
  ]);
  return true;
}

async function getCachedArchive(env: Env, steamid64: string) {
  const cached = await getCache<any>(env.DB, `owned-games:${steamid64}`);
  if (cached) return cached;
  throw new ApiError(404, "STEAM_LIBRARY_EMPTY", "No cached archive found. Open this dossier once before exporting.");
}

function gamesToCsv(games: Game[]) {
  const headers = ["appid", "name", "playtime_forever_minutes", "playtime_forever_hours", "playtime_2weeks_minutes", "has_community_visible_stats", "steam_store_url"];
  const rows = games.map((game) => [game.appid, game.name, game.playtimeForeverMinutes, game.playtimeForeverHours, game.playtime2WeeksMinutes, game.hasCommunityVisibleStats, game.storeUrl]);
  return [headers, ...rows].map((row) => row.map((value) => {
    const text = String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }).join(",")).join("\n");
}

function archiveToMarkdown(archive: any) {
  const rows = archive.games.slice(0, 50).map((game: Game, index: number) => `| ${index + 1} | ${game.name.replace(/\|/g, "\\|")} | ${game.appid} | ${game.playtimeForeverHours} | ${(game.playtime2WeeksMinutes / 60).toFixed(1)} |`).join("\n");
  return `# PLAYTIME ARCHIVE / ${archive.steamid64}

- Total titles: ${archive.gameCount}
- Total hours: ${archive.totalPlaytimeHours}
- Recent 14 days: ${(archive.recent2WeeksMinutes / 60).toFixed(1)}h
- Opened titles: ${archive.playedGameCount}
- Unopened titles: ${archive.unplayedGameCount}

| # | Title | AppID | Total Hours | Recent 14 Days |
|---|---|---:|---:|---:|
${rows}
`;
}

function mockArchive() {
  const rawGames = [
    [730, "Counter-Strike 2", 84210, 280, true],
    [570, "Dota 2", 63240, 0, true],
    [578080, "PUBG: BATTLEGROUNDS", 18420, 95, true],
    [105600, "Terraria", 12650, 0, true],
    [413150, "Stardew Valley", 9350, 180, true],
    [4000, "Garry's Mod", 7185, 0, true],
    [550, "Left 4 Dead 2", 5100, 45, true],
    [620, "Portal 2", 1650, 0, true],
    [431960, "Wallpaper Engine", 14000, 320, false],
    [1145360, "Hades", 3900, 0, true],
    [367520, "Hollow Knight", 2750, 0, true],
    [1245620, "Elden Ring", 8040, 410, true],
    [1086940, "Baldur's Gate 3", 11200, 540, true],
    [1091500, "Cyberpunk 2077", 6700, 125, true],
    [292030, "The Witcher 3: Wild Hunt", 9850, 0, true],
    [588650, "Dead Cells", 1330, 60, true],
    [294100, "RimWorld", 22100, 870, true],
    [1794680, "Vampire Survivors", 860, 0, true],
    [227300, "Euro Truck Simulator 2", 4390, 220, true],
    [108600, "Project Zomboid", 3160, 35, true]
  ] as const;
  const games = rawGames.map(([appid, name, playtime_forever, playtime_2weeks, has_community_visible_stats]) => normalizeGame({ appid, name, playtime_forever, playtime_2weeks, has_community_visible_stats }));
  return buildArchiveResponse({ steamid64: "76561198000000000", vanityName: "mock-archive", profileUrl: "https://steamcommunity.com/id/mock-archive/", games, fromCache: false });
}
