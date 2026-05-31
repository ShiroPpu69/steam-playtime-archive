import { FileJson, FileSpreadsheet } from "lucide-react";
import { useState } from "react";
import { exportUrl } from "../api/steamApi";
import type { Copy } from "../i18n";
import type { ArchiveGame, ArchiveResponse } from "../types/steam";
import { downloadCsv, downloadJson } from "../utils/csv";

interface Props {
  archive: ArchiveResponse;
  visibleGames?: ArchiveGame[];
  labels?: Copy;
}

export function ExportButtons({ archive, visibleGames, labels }: Props) {
  const currentArchive = visibleGames ? { ...archive, games: visibleGames, gameCount: visibleGames.length } : archive;
  const zh = labels?.subtitle === "记录游戏库、累计时长与最近活动。";
  const [feedback, setFeedback] = useState("");

  function markGenerated() {
    setFeedback(zh ? "档案副本已生成。" : "Archive copy generated.");
    window.setTimeout(() => setFeedback(""), 1600);
  }

  return (
    <section>
      <div className="section-heading">
        <p>{labels?.export ?? "EXPORT RECORDS"}</p>
        <span>{feedback || (visibleGames ? (zh ? "当前筛选" : "CURRENT FILTER") : (zh ? "本地副本" : "LOCAL COPY"))}</span>
      </div>
      <div className="export-row">
        <button className="brass-button" onClick={() => { downloadCsv(currentArchive); markGenerated(); }}>
          <FileSpreadsheet size={16} />
          {labels?.exportCsv ?? "EXPORT / CSV"}
        </button>
        <button className="ghost-button" onClick={() => { downloadJson(currentArchive); markGenerated(); }}>
          <FileJson size={16} />
          {labels?.exportJson ?? "EXPORT / JSON"}
        </button>
        <a className="ghost-button" href={exportUrl("markdown", archive.steamid64)} onClick={markGenerated}>
          <FileJson size={16} />
          {labels?.exportMd ?? "EXPORT / MD"}
        </a>
      </div>
    </section>
  );
}
