import { getDb } from "../db.js";
import type { ArchiveGame, ArchiveProfile, GameHistoryPoint } from "../types/steam.js";
import { nowIso } from "../utils/time.js";

interface SyncDelta {
  totalDeltaMinutes: number;
  primaryDeltaAppid?: number;
  primaryDeltaName?: string;
  primaryDeltaMinutes?: number;
}

export function upsertProfile(input: { steamid64: string; vanityName?: string; profileUrl: string }): number {
  const db = getDb();
  const timestamp = nowIso();
  db.prepare(`
    INSERT INTO profiles (steamid64, vanity_name, profile_url, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(steamid64) DO UPDATE SET vanity_name = excluded.vanity_name, profile_url = excluded.profile_url, updated_at = excluded.updated_at
  `).run(input.steamid64, input.vanityName ?? null, input.profileUrl, timestamp, timestamp);
  const row = db.prepare("SELECT id FROM profiles WHERE steamid64 = ?").get(input.steamid64) as { id: number };
  return row.id;
}

function calculateDelta(profileId: number, games: ArchiveGame[]): SyncDelta {
  const db = getDb();
  let totalDeltaMinutes = 0;
  let primary: { appid: number; name: string; delta: number } | undefined;
  for (const game of games) {
    const previous = db.prepare(`
      SELECT playtime_forever_minutes FROM playtime_snapshots
      WHERE profile_id = ? AND appid = ?
      ORDER BY captured_at DESC LIMIT 1
    `).get(profileId, game.appid) as { playtime_forever_minutes: number } | undefined;
    const delta = previous ? Math.max(0, game.playtimeForeverMinutes - previous.playtime_forever_minutes) : 0;
    totalDeltaMinutes += delta;
    if (delta > 0 && (!primary || delta > primary.delta)) {
      primary = { appid: game.appid, name: game.name, delta };
    }
  }
  return {
    totalDeltaMinutes,
    primaryDeltaAppid: primary?.appid,
    primaryDeltaName: primary?.name,
    primaryDeltaMinutes: primary?.delta
  };
}

export function persistArchive(input: { steamid64: string; vanityName?: string; profileUrl: string; games: ArchiveGame[] }) {
  const db = getDb();
  const profileId = upsertProfile(input);
  const capturedAt = nowIso();
  const delta = calculateDelta(profileId, input.games);
  try {
    db.exec("BEGIN");
    for (const game of input.games) {
      db.prepare(`
        INSERT INTO games (appid, name, icon_url, has_community_visible_stats, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(appid) DO UPDATE SET name = excluded.name, icon_url = excluded.icon_url, has_community_visible_stats = excluded.has_community_visible_stats, updated_at = excluded.updated_at
      `).run(game.appid, game.name, game.iconUrl, game.hasCommunityVisibleStats ? 1 : 0, capturedAt, capturedAt);
      db.prepare(`
        INSERT INTO profile_games (profile_id, appid, playtime_forever_minutes, playtime_2weeks_minutes, last_synced_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(profile_id, appid) DO UPDATE SET playtime_forever_minutes = excluded.playtime_forever_minutes, playtime_2weeks_minutes = excluded.playtime_2weeks_minutes, last_synced_at = excluded.last_synced_at
      `).run(profileId, game.appid, game.playtimeForeverMinutes, game.playtime2WeeksMinutes, capturedAt);
      db.prepare(`
        INSERT INTO playtime_snapshots (profile_id, appid, playtime_forever_minutes, captured_at)
        VALUES (?, ?, ?, ?)
      `).run(profileId, game.appid, game.playtimeForeverMinutes, capturedAt);
    }
    const total = input.games.reduce((sum, game) => sum + game.playtimeForeverMinutes, 0);
    const recent = input.games.reduce((sum, game) => sum + game.playtime2WeeksMinutes, 0);
    const played = input.games.filter((game) => game.playtimeForeverMinutes > 0).length;
    db.prepare(`
      INSERT INTO sync_runs (profile_id, total_games, total_playtime_minutes, played_game_count, unplayed_game_count, recent_2weeks_minutes, primary_delta_appid, primary_delta_name, primary_delta_minutes, total_delta_minutes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(profileId, input.games.length, total, played, input.games.length - played, recent, delta.primaryDeltaAppid ?? null, delta.primaryDeltaName ?? null, delta.primaryDeltaMinutes ?? 0, delta.totalDeltaMinutes, capturedAt);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  return { profileId, capturedAt };
}

export function getHistory(steamid64: string) {
  const db = getDb();
  const profile = db.prepare("SELECT id FROM profiles WHERE steamid64 = ?").get(steamid64) as { id: number } | undefined;
  if (!profile) return [];
  return db.prepare(`
    SELECT id, total_games AS totalGames, total_playtime_minutes AS totalPlaytimeMinutes,
      played_game_count AS playedGameCount, unplayed_game_count AS unplayedGameCount,
      recent_2weeks_minutes AS recent2WeeksMinutes, primary_delta_appid AS primaryDeltaAppid,
      primary_delta_name AS primaryDeltaName, primary_delta_minutes AS primaryDeltaMinutes,
      total_delta_minutes AS totalDeltaMinutes, created_at AS createdAt
    FROM sync_runs
    WHERE profile_id = ?
    ORDER BY created_at DESC
    LIMIT 20
  `).all(profile.id);
}

export function listProfiles(): ArchiveProfile[] {
  const rows = getDb().prepare(`
    SELECT p.id, p.steamid64, p.vanity_name AS vanityName, p.profile_url AS profileUrl,
      p.created_at AS createdAt, p.updated_at AS updatedAt,
      sr.created_at AS lastSyncedAt, sr.total_games AS totalGames, sr.total_playtime_minutes AS totalPlaytimeMinutes
    FROM profiles p
    LEFT JOIN sync_runs sr ON sr.id = (
      SELECT id FROM sync_runs WHERE profile_id = p.id ORDER BY created_at DESC LIMIT 1
    )
    ORDER BY COALESCE(sr.created_at, p.updated_at) DESC
  `).all() as ArchiveProfile[];
  return rows;
}

export function deleteProfile(steamid64: string): boolean {
  const db = getDb();
  const profile = db.prepare("SELECT id FROM profiles WHERE steamid64 = ?").get(steamid64) as { id: number } | undefined;
  if (!profile) return false;
  try {
    db.exec("BEGIN");
    db.prepare("DELETE FROM profile_games WHERE profile_id = ?").run(profile.id);
    db.prepare("DELETE FROM playtime_snapshots WHERE profile_id = ?").run(profile.id);
    db.prepare("DELETE FROM sync_runs WHERE profile_id = ?").run(profile.id);
    db.prepare("DELETE FROM profiles WHERE id = ?").run(profile.id);
    db.exec("COMMIT");
    return true;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function getGameHistory(steamid64: string, appid: number): GameHistoryPoint[] {
  const db = getDb();
  const profile = db.prepare("SELECT id FROM profiles WHERE steamid64 = ?").get(steamid64) as { id: number } | undefined;
  if (!profile) return [];
  return db.prepare(`
    SELECT appid, playtime_forever_minutes AS playtimeForeverMinutes, captured_at AS capturedAt
    FROM playtime_snapshots
    WHERE profile_id = ? AND appid = ?
    ORDER BY captured_at ASC
    LIMIT 100
  `).all(profile.id, appid) as GameHistoryPoint[];
}

export function getArchiveGamesFromDb(steamid64: string): ArchiveGame[] {
  const db = getDb();
  const profile = db.prepare("SELECT id FROM profiles WHERE steamid64 = ?").get(steamid64) as { id: number } | undefined;
  if (!profile) return [];
  return db.prepare(`
    SELECT g.appid, g.name, g.icon_url AS iconUrl,
      g.has_community_visible_stats AS hasCommunityVisibleStats,
      pg.playtime_forever_minutes AS playtimeForeverMinutes,
      pg.playtime_2weeks_minutes AS playtime2WeeksMinutes
    FROM profile_games pg
    JOIN games g ON g.appid = pg.appid
    WHERE pg.profile_id = ?
    ORDER BY pg.playtime_forever_minutes DESC
  `).all(profile.id).map((row: any) => {
    const minutes = Number(row.playtimeForeverMinutes ?? 0);
    const recent = Number(row.playtime2WeeksMinutes ?? 0);
    return {
      appid: Number(row.appid),
      name: String(row.name),
      playtimeForeverMinutes: minutes,
      playtimeForeverHours: Number((minutes / 60).toFixed(1)),
      playtimeForeverText: `${Math.floor(minutes / 60)} 小时 ${minutes % 60} 分钟`,
      playtime2WeeksMinutes: recent,
      iconUrl: String(row.iconUrl ?? ""),
      imageUrl: `https://cdn.cloudflare.steamstatic.com/steam/apps/${row.appid}/capsule_184x69.jpg`,
      hasCommunityVisibleStats: Boolean(row.hasCommunityVisibleStats),
      storeUrl: `https://store.steampowered.com/app/${row.appid}`
    };
  });
}
