import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";

const envPath = [path.resolve(process.cwd(), ".env"), path.resolve(process.cwd(), "../.env")].find((candidate) => fs.existsSync(candidate));
dotenv.config(envPath ? { path: envPath } : undefined);

export const config = {
  steamApiKey: process.env.STEAM_API_KEY ?? "",
  port: Number(process.env.PORT ?? 3001),
  clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
  cacheTtlSeconds: Number(process.env.CACHE_TTL_SECONDS ?? 3600),
  databasePath: process.env.DATABASE_PATH ?? "./data/archive.sqlite"
};
