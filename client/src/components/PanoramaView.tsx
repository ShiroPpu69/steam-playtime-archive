import type { ArchiveGame } from "../types/steam";
import { formatHours } from "../utils/formatTime";
import { gameImage, handleImageError } from "../utils/imageFallback";
import type { Copy } from "../i18n";

interface Props {
  games: ArchiveGame[];
  onSelect: (game: ArchiveGame) => void;
  labels?: Copy;
}

export function PanoramaView({ games, onSelect, labels }: Props) {
  const zh = labels?.subtitle === "记录游戏库、累计时长与最近活动。";
  const top = games.slice(0, 24);
  return (
    <section>
      <div className="section-heading">
        <p>{zh ? "档案墙" : "ARCHIVE WALL"}</p>
        <span>{zh ? "胶片接触印样" : "FILM CONTACT SHEET"}</span>
      </div>
      <div className="panorama">
        {top.map((game, index) => (
          <button
            key={game.appid}
            className={`wall-tile rank-${Math.min(index + 1, 6)}`}
            onClick={() => onSelect(game)}
          >
            {index === 0 && <em>{zh ? "主要记录" : "PRIMARY RECORD"}</em>}
            <img src={gameImage(game)} alt="" onError={handleImageError(game.appid)} />
            <strong>{game.name}</strong>
            <span>{formatHours(game.playtimeForeverMinutes)}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
