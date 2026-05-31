import { getArchive } from "../services/gameService.js";

const profileUrl = process.argv.slice(2).join(" ").trim();

if (!profileUrl) {
  console.error("Usage: npm run sync -- <steam profile url>");
  process.exit(1);
}

try {
  const archive = await getArchive(profileUrl, true);
  console.log(`Library indexed for ${archive.steamid64}`);
  console.log(`Titles: ${archive.gameCount}`);
  console.log(`Hours: ${archive.totalPlaytimeHours}`);
  console.log(`Indexed: ${archive.lastSyncedAt}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
