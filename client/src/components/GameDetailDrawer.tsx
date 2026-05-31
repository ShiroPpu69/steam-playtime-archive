import { X } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { AchievementSummary, AppDetails, ArchiveGame, GameHistoryPoint } from "../types/steam";
import { formatHours } from "../utils/formatTime";
import { gameImage, handleImageError } from "../utils/imageFallback";

interface Props {
  game: ArchiveGame | null;
  steamid64?: string;
  achievements?: AchievementSummary | null;
  appDetails?: AppDetails | null;
  historyPoints?: GameHistoryPoint[];
  achievementError?: string;
  metadataError?: string;
  loadingAchievements: boolean;
  loadingMetadata: boolean;
  loadingHistory: boolean;
  labels?: {
    caseFile: string;
    loadAchievements: string;
    loadMetadata: string;
    loadHistory: string;
    totalPlaytime: string;
    recentActivity: string;
    communityStats: string;
    storeRecord: string;
    available: string;
    limited: string;
    developer: string;
    publisher: string;
    genre: string;
    unknown: string;
    unclassified: string;
    complete: string;
    open: string;
  };
  onClose: () => void;
  onLoadAchievements: () => void;
  onLoadMetadata: () => void;
  onLoadHistory: () => void;
}

export function GameDetailDrawer({ game, achievements, appDetails, historyPoints = [], achievementError, metadataError, loadingAchievements, loadingMetadata, loadingHistory, labels, onClose, onLoadAchievements, onLoadMetadata, onLoadHistory }: Props) {
  if (!game) return null;
  const zh = labels?.caseFile === "个案文件";
  const chartData = historyPoints.map((point) => ({
    capturedAt: new Date(point.capturedAt).toLocaleDateString(),
    hours: Number((point.playtimeForeverMinutes / 60).toFixed(1))
  }));
  return (
    <aside className="drawer">
      <button className="icon-button" onClick={onClose} aria-label="Close case file">
        <X size={18} />
      </button>
      <p className="kicker">{labels?.caseFile ?? "CASE FILE"}: APP/{game.appid}</p>
      <h2>{game.name}</h2>
      <img className="drawer-image" src={gameImage(game)} alt="" onError={handleImageError(game.appid)} />
      <dl>
        <dt>{labels?.totalPlaytime ?? "TOTAL PLAYTIME"}</dt>
        <dd>{formatHours(game.playtimeForeverMinutes)}</dd>
        <dt>{labels?.recentActivity ?? "RECENT ACTIVITY"}</dt>
        <dd>{formatHours(game.playtime2WeeksMinutes)} / {zh ? "14 天" : "14 DAYS"}</dd>
        <dt>{labels?.communityStats ?? "COMMUNITY STATS"}</dt>
        <dd>{game.hasCommunityVisibleStats ? (labels?.available ?? "AVAILABLE") : (labels?.limited ?? "LIMITED")}</dd>
        <dt>{labels?.storeRecord ?? "STORE RECORD"}</dt>
        <dd><a href={game.storeUrl} target="_blank" rel="noreferrer">{labels?.open ?? "OPEN"}</a></dd>
      </dl>
      <div className="achievement-box">
        <button className="ghost-button" onClick={onLoadMetadata} disabled={loadingMetadata}>
          {labels?.loadMetadata ?? "LOAD STORE METADATA"}
        </button>
        {appDetails && (
          <div className="metadata-record">
            {appDetails.capsuleImage && <img src={appDetails.capsuleImage} alt="" />}
            <p>{labels?.developer ?? "DEVELOPER"}: {appDetails.developers.join(", ") || (labels?.unknown ?? "Unknown")}</p>
            <p>{labels?.publisher ?? "PUBLISHER"}: {appDetails.publishers.join(", ") || (labels?.unknown ?? "Unknown")}</p>
            <p>{labels?.genre ?? "GENRE"}: {appDetails.genres.join(", ") || (labels?.unclassified ?? "Unclassified")}</p>
          </div>
        )}
        {metadataError && <p className="inline-error">{metadataError}</p>}
      </div>
      <div className="achievement-box">
        <button className="ghost-button" onClick={onLoadHistory} disabled={loadingHistory}>
          {labels?.loadHistory ?? "LOAD PLAYTIME TRACE"}
        </button>
        {chartData.length > 0 && (
          <ResponsiveContainer width="100%" height={150}>
            <LineChart data={chartData}>
              <XAxis dataKey="capturedAt" hide />
              <YAxis stroke="#9B907E" />
              <Tooltip contentStyle={{ background: "#15120E", border: "1px solid #4A3E2D" }} />
              <Line type="monotone" dataKey="hours" stroke="#C2A66D" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
      {game.hasCommunityVisibleStats && (
        <div className="achievement-box">
          <button className="brass-button" onClick={onLoadAchievements} disabled={loadingAchievements}>
            {labels?.loadAchievements ?? "ACHIEVEMENTS: LOAD RECORD"}
          </button>
          {achievements && <p>{achievements.achieved} / {achievements.total} {labels?.complete ?? "complete"} ({achievements.completionRate}%)</p>}
          {achievementError && <p className="inline-error">{achievementError}</p>}
        </div>
      )}
    </aside>
  );
}
