import type { SteamArchiveResponse } from "../types/steam.js";
import { buildArchiveResponse, normalizeGame } from "../services/steamParser.js";

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

export function mockArchive(): SteamArchiveResponse {
  const games = rawGames.map(([appid, name, playtime_forever, playtime_2weeks, has_community_visible_stats]) => normalizeGame({
    appid,
    name,
    playtime_forever,
    playtime_2weeks,
    has_community_visible_stats,
    img_icon_url: "mock"
  })).map((game) => ({
    ...game,
    iconUrl: `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appid}/capsule_184x69.jpg`,
    imageUrl: `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appid}/capsule_184x69.jpg`
  }));

  return buildArchiveResponse({
    steamid64: "76561198000000000",
    vanityName: "mock-archive",
    profileUrl: "https://steamcommunity.com/id/mock-archive/",
    games,
    fromCache: false,
    lastSyncedAt: new Date().toISOString()
  });
}
