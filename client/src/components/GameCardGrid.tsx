import type { ArchiveGame } from "../types/steam";
import { formatHours } from "../utils/formatTime";
import { gameImage, handleImageError } from "../utils/imageFallback";
import type { Copy } from "../i18n";

interface Props {
  games: ArchiveGame[];
  onSelect: (game: ArchiveGame) => void;
  labels?: Copy;
}

export function GameCardGrid({ games, onSelect, labels }: Props) {
  const zh = labels?.subtitle === "记录游戏库、累计时长与最近活动。";
  return (
    <section>
      <div className="section-heading">
        <p>{zh ? "个案卡片" : "CASE CARD FILES"}</p>
        <span>{games.length} {zh ? "张卡片" : "CARDS"}</span>
      </div>
      <div className="card-grid">
        {games.map((game, index) => (
          <button className="game-card" key={game.appid} onClick={() => onSelect(game)}>
            <span>{zh ? "文件" : "FILE"} / {String(index + 1).padStart(3, "0")}</span>
            <img src={gameImage(game)} alt="" onError={handleImageError(game.appid)} />
            <strong>{game.name}</strong>
            <p>APPID / {game.appid}</p>
            <p>{zh ? "总计" : "TOTAL"} / {formatHours(game.playtimeForeverMinutes)}</p>
            <p>{zh ? "14 天" : "14 DAYS"} / {formatHours(game.playtime2WeeksMinutes)}</p>
            <a href={game.storeUrl} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>
              {labels?.storeRecord ?? "STORE RECORD"}
            </a>
          </button>
        ))}
      </div>
    </section>
  );
}
