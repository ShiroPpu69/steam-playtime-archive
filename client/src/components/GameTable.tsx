import type { ArchiveGame } from "../types/steam";
import { gameImage, handleImageError } from "../utils/imageFallback";
import { formatHours } from "../utils/formatTime";
import type { Copy } from "../i18n";

interface Props {
  games: ArchiveGame[];
  onSelect: (game: ArchiveGame) => void;
  labels?: Copy;
}

export function GameTable({ games, onSelect, labels }: Props) {
  const zh = labels?.subtitle === "记录游戏库、累计时长与最近活动。";
  return (
    <section>
      <div className="section-heading">
        <p>{zh ? "馆藏目录" : "CATALOGUE INDEX"}</p>
        <span>{games.length} {labels?.records ?? "RECORDS"}</span>
      </div>
      <div className="table-wrap">
        <table className="game-table">
          <thead>
            <tr>
              <th>{zh ? "编号" : "CAT. NO."}</th>
              <th>{zh ? "标题" : "TITLE"}</th>
              <th>APPID</th>
              <th>{zh ? "总小时数" : "TOTAL HOURS"}</th>
              <th>{zh ? "最近活动" : "RECENT ACTIVITY"}</th>
              <th>{zh ? "记录" : "RECORD"}</th>
            </tr>
          </thead>
          <tbody>
            {games.map((game, index) => (
              <tr key={game.appid} onClick={() => onSelect(game)}>
                <td>CAT-{String(index + 1).padStart(4, "0")}</td>
                <td className="title-cell">
                  <img src={gameImage(game)} alt="" onError={handleImageError(game.appid)} />
                  <span>
                    <strong>{game.name}</strong>
                    <small>APP/{game.appid}</small>
                  </span>
                </td>
                <td>{game.appid}</td>
                <td>{formatHours(game.playtimeForeverMinutes)}</td>
                <td>{formatHours(game.playtime2WeeksMinutes)}</td>
                <td>
                  <a className="store-record" href={game.storeUrl} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>
                    {labels?.storeRecord ?? "STORE RECORD"}
                  </a>
                  <small className="record-state">{game.hasCommunityVisibleStats ? (labels?.available ?? "VISIBLE") : (labels?.limited ?? "LIMITED")}</small>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
