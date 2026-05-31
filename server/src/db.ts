import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { config } from "./config.js";
import { ApiError, errorCodes } from "./utils/errors.js";

type ArchiveDatabase = InstanceType<typeof DatabaseSync>;

let db: ArchiveDatabase | null = null;

export function getDb(): ArchiveDatabase {
  if (db) return db;
  try {
    const dir = path.dirname(config.databasePath);
    fs.mkdirSync(dir, { recursive: true });
    db = new DatabaseSync(config.databasePath);
    db.exec("PRAGMA journal_mode = WAL;");
    db.exec(`
      CREATE TABLE IF NOT EXISTS profiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        steamid64 TEXT NOT NULL UNIQUE,
        vanity_name TEXT,
        profile_url TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS games (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        appid INTEGER NOT NULL UNIQUE,
        name TEXT NOT NULL,
        icon_url TEXT,
        has_community_visible_stats INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS profile_games (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        profile_id INTEGER NOT NULL,
        appid INTEGER NOT NULL,
        playtime_forever_minutes INTEGER NOT NULL,
        playtime_2weeks_minutes INTEGER NOT NULL,
        last_synced_at TEXT NOT NULL,
        UNIQUE(profile_id, appid)
      );
      CREATE TABLE IF NOT EXISTS playtime_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        profile_id INTEGER NOT NULL,
        appid INTEGER NOT NULL,
        playtime_forever_minutes INTEGER NOT NULL,
        captured_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS sync_runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        profile_id INTEGER NOT NULL,
        total_games INTEGER NOT NULL,
        total_playtime_minutes INTEGER NOT NULL,
        played_game_count INTEGER NOT NULL,
        unplayed_game_count INTEGER NOT NULL,
        recent_2weeks_minutes INTEGER NOT NULL,
        primary_delta_appid INTEGER,
        primary_delta_name TEXT,
        primary_delta_minutes INTEGER,
        total_delta_minutes INTEGER,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS api_cache (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cache_key TEXT NOT NULL UNIQUE,
        response_json TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);
    return db;
  } catch (error) {
    throw new ApiError(500, errorCodes.SQLITE_INIT_FAILED, "SQLite archive database could not be initialized.", error instanceof Error ? error.message : String(error));
  }
}
