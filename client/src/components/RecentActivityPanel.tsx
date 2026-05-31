import type { RecentGame } from "../types/steam";
import { formatHours } from "../utils/formatTime";
import { gameImage, handleImageError } from "../utils/imageFallback";
import type { Copy } from "../i18n";

interface Props {
  title: string;
  games: RecentGame[];
  labels?: Copy;
}

export function RecentActivityPanel({ title, games, labels }: Props) {
  const zh = labels?.subtitle === "记录游戏库、累计时长与最近活动。";
  return (
    <section>
      <div className="section-heading">
        <p>{title}</p>
        <span>{games.length} {labels?.entries ?? "ENTRIES"}</span>
      </div>
      <div className="recent-log">
        {games.length === 0 && <p className="empty-state">{zh ? "Steam 没有返回最近公开活动。" : "No recent public activity returned by Steam."}</p>}
        {games.slice(0, 8).map((game) => (
          <a href={game.storeUrl} target="_blank" rel="noreferrer" key={game.appid}>
            <img src={gameImage(game)} alt="" onError={handleImageError(game.appid)} />
            <strong>{game.name}</strong>
            <span>{formatHours(game.playtime2WeeksMinutes)} / {zh ? "14天" : "14D"}</span>
          </a>
        ))}
      </div>
    </section>
  );
}
