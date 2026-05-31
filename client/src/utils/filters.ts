import type { ArchiveGame } from "../types/steam";

export type FilterMode = "all" | "played" | "unplayed" | "recent" | "community" | "top10" | "top50";

export function filterGames(games: ArchiveGame[], mode: FilterMode, query: string): ArchiveGame[] {
  const normalized = query.trim().toLowerCase();
  let list = games;
  if (normalized) {
    list = list.filter((game) => game.name.toLowerCase().includes(normalized) || String(game.appid).includes(normalized));
  }
  switch (mode) {
    case "played":
      return list.filter((game) => game.playtimeForeverMinutes > 0);
    case "unplayed":
      return list.filter((game) => game.playtimeForeverMinutes === 0);
    case "recent":
      return list.filter((game) => game.playtime2WeeksMinutes > 0);
    case "community":
      return list.filter((game) => game.hasCommunityVisibleStats);
    case "top10":
      return list.slice(0, 10);
    case "top50":
      return list.slice(0, 50);
    default:
      return list;
  }
}
