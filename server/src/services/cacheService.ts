import { getDb } from "../db.js";
import { nowIso } from "../utils/time.js";

export function getCache<T>(cacheKey: string): T | null {
  const row = getDb().prepare("SELECT response_json, expires_at FROM api_cache WHERE cache_key = ?").get(cacheKey) as { response_json: string; expires_at: string } | undefined;
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) return null;
  return JSON.parse(row.response_json) as T;
}

export function setCache(cacheKey: string, value: unknown, ttlSeconds: number): void {
  const createdAt = nowIso();
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
  getDb().prepare(`
    INSERT INTO api_cache (cache_key, response_json, expires_at, created_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(cache_key) DO UPDATE SET response_json = excluded.response_json, expires_at = excluded.expires_at, created_at = excluded.created_at
  `).run(cacheKey, JSON.stringify(value), expiresAt, createdAt);
}
