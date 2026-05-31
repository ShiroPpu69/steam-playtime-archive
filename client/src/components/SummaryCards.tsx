import type { ArchiveResponse } from "../types/steam";
import { formatHours } from "../utils/formatTime";
import type { Copy } from "../i18n";

interface Props {
  archive: ArchiveResponse;
  labels?: Copy;
}

export function SummaryCards({ archive, labels }: Props) {
  const zh = labels?.subtitle === "记录游戏库、累计时长与最近活动。";
  const cards = [
    [zh ? "记录 01" : "RECORD 01", "STEAMID64", archive.steamid64],
    [zh ? "记录 02" : "RECORD 02", zh ? "游戏总数" : "TOTAL TITLES", archive.gameCount],
    [zh ? "记录 03" : "RECORD 03", zh ? "总小时数" : "TOTAL HOURS", archive.totalPlaytimeHours.toLocaleString()],
    [zh ? "记录 04" : "RECORD 04", zh ? "14 天活动" : "14 DAY ACTIVITY", formatHours(archive.recent2WeeksMinutes)],
    [zh ? "记录 05" : "RECORD 05", zh ? "玩过游戏" : "OPENED TITLES", archive.playedGameCount],
    [zh ? "记录 06" : "RECORD 06", zh ? "未打开游戏" : "UNOPENED TITLES", archive.unplayedGameCount],
    [zh ? "记录 07" : "RECORD 07", zh ? "平均小时数" : "AVERAGE HOURS", archive.averagePlaytimeHours],
    [zh ? "记录 08" : "RECORD 08", zh ? "主要记录" : "PRIMARY RECORD", archive.topGame?.name ?? "None"],
    [zh ? "记录 09" : "RECORD 09", zh ? "前 10 占比" : "TOP 10 SHARE", `${archive.top10Share}%`]
  ];

  return (
    <section>
      <div className="section-heading">
        <p>{labels?.summary ?? "ARCHIVE SUMMARY"}</p>
        <span>{archive.fromCache ? (labels?.cacheCopy ?? "CACHE COPY") : (labels?.freshCapture ?? "FRESH CAPTURE")}</span>
      </div>
      <div className="summary-grid">
        {cards.map(([id, label, value]) => (
          <article className="summary-card" key={id}>
            <span>{id}</span>
            <p>{label}</p>
            <strong>{value}</strong>
          </article>
        ))}
      </div>
    </section>
  );
}
