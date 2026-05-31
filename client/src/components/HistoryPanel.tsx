import type { HistoryRun } from "../types/steam";
import { formatDate, formatHours } from "../utils/formatTime";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Copy } from "../i18n";

interface Props {
  runs: HistoryRun[];
  title?: string;
  labels?: Copy;
}

export function HistoryPanel({ runs, title = "CHRONOLOGY", labels }: Props) {
  const chartData = [...runs].reverse().map((run) => ({
    date: formatDate(run.createdAt),
    hours: Number((run.totalPlaytimeMinutes / 60).toFixed(1)),
    delta: Number(((run.totalDeltaMinutes ?? 0) / 60).toFixed(1))
  }));
  return (
    <section>
      <div className="section-heading">
        <p>{title}</p>
        <span>{runs.length} {labels?.syncRuns ?? "SYNC RUNS"}</span>
      </div>
      {chartData.length > 1 && (
        <div className="chronology-chart">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData}>
              <XAxis dataKey="date" hide />
              <YAxis stroke="#9B907E" />
              <Tooltip contentStyle={{ background: "#15120E", border: "1px solid #4A3E2D" }} />
              <Line type="monotone" dataKey="hours" stroke="#C2A66D" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="delta" stroke="#7D8B6F" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      <div className="chronology">
        {runs.length === 0 && <p className="empty-state">{labels?.noChronology ?? "No local chronology yet. Open a live dossier to begin tracking."}</p>}
        {runs.map((run) => (
          <article key={run.id}>
            <time>{formatDate(run.createdAt)}</time>
            <p>{labels?.libraryIndexed ?? "Library indexed."} +{formatHours(run.totalDeltaMinutes ?? 0)} {labels?.sinceLast ?? "since last capture."}</p>
            <span>
              {labels?.primaryDelta ?? "Primary delta"}: {run.primaryDeltaName ? `${run.primaryDeltaName} +${formatHours(run.primaryDeltaMinutes ?? 0)}` : (labels?.noMovement ?? "No movement recorded")}
            </span>
          </article>
        ))}
      </div>
    </section>
  );
}
