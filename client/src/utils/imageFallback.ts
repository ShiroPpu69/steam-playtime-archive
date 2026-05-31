import type { ArchiveGame, RecentGame } from "../types/steam";
import type React from "react";

export function gameImage(game: Pick<ArchiveGame | RecentGame, "appid" | "iconUrl" | "imageUrl">): string {
  return game.iconUrl || game.imageUrl || fallbackImage(game.appid);
}

export function fallbackImage(appid: number): string {
  return `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/capsule_184x69.jpg`;
}

export function handleImageError(appid: number) {
  return (event: React.SyntheticEvent<HTMLImageElement>) => {
    const next = fallbackImage(appid);
    if (event.currentTarget.src !== next) {
      event.currentTarget.src = next;
      return;
    }
    event.currentTarget.style.display = "none";
  };
}
