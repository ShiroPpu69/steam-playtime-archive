import type { ArchiveGame } from "../types/steam";

export type SortMode = "hours-desc" | "hours-asc" | "recent-desc" | "name-asc" | "name-desc" | "appid";

export function sortGames(games: ArchiveGame[], mode: SortMode): ArchiveGame[] {
  const list = [...games];
  switch (mode) {
    case "hours-asc":
      return list.sort((a, b) => a.playtimeForeverMinutes - b.playtimeForeverMinutes);
    case "recent-desc":
      return list.sort((a, b) => b.playtime2WeeksMinutes - a.playtime2WeeksMinutes);
    case "name-asc":
      return list.sort((a, b) => a.name.localeCompare(b.name));
    case "name-desc":
      return list.sort((a, b) => b.name.localeCompare(a.name));
    case "appid":
      return list.sort((a, b) => a.appid - b.appid);
    default:
      return list.sort((a, b) => b.playtimeForeverMinutes - a.playtimeForeverMinutes);
  }
}
