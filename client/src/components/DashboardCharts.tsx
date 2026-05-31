import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ArchiveResponse } from "../types/steam";
import type { Copy } from "../i18n";

interface Props {
  archive: ArchiveResponse;
  labels?: Copy;
}

const palette = ["#C2A66D", "#A8894B", "#7D8B6F", "#8A806F", "#4A3E2D", "#9E4A3F"];

export function DashboardCharts({ archive, labels }: Props) {
  const zh = labels?.subtitle === "记录游戏库、累计时长与最近活动。";
  const top10 = archive.games.slice(0, 10).map((game) => ({ name: game.name, hours: game.playtimeForeverHours }));
  const recent = [...archive.games].sort((a, b) => b.playtime2WeeksMinutes - a.playtime2WeeksMinutes).slice(0, 10).map((game) => ({
    name: game.name,
    hours: Number((game.playtime2WeeksMinutes / 60).toFixed(1))
  }));
  const opened = [
    { name: "Opened", value: archive.playedGameCount },
    { name: "Unopened", value: archive.unplayedGameCount }
  ];
  const buckets = [
    ["0h", (m: number) => m === 0],
    ["0-1h", (m: number) => m > 0 && m <= 60],
    ["1-10h", (m: number) => m > 60 && m <= 600],
    ["10-50h", (m: number) => m > 600 && m <= 3000],
    ["50-100h", (m: number) => m > 3000 && m <= 6000],
    ["100h+", (m: number) => m > 6000]
  ] as const;
  const distribution = buckets.map(([name, fn]) => ({ name, count: archive.games.filter((game) => fn(game.playtimeForeverMinutes)).length }));

  return (
    <section>
      <div className="section-heading">
        <p>{labels?.report ?? "DOSSIER REPORT"}</p>
        <span>{labels?.visualSummary ?? "VISUAL SUMMARY"}</span>
      </div>
      <div className="wrapped-card">
        <p>{zh ? `这份档案收录了 ${archive.gameCount} 款游戏。` : `You own ${archive.gameCount} titles in this archive.`}</p>
        <p>{zh ? `你已累计 ${archive.totalPlaytimeHours.toLocaleString()} 小时。` : `You have accumulated ${archive.totalPlaytimeHours.toLocaleString()} hours.`}</p>
        <p>{zh ? `主导记录是 ${archive.topGame?.name ?? "未指定"}。` : `Your dominant record is ${archive.topGame?.name ?? "unassigned"}.`}</p>
        <p>{zh ? `前 10 条记录占总时长的 ${archive.top10Share}%。` : `Your Top 10 records account for ${archive.top10Share}% of all logged hours.`}</p>
        <p>{zh ? `还有 ${archive.unplayedGameCount} 款游戏未打开。` : `${archive.unplayedGameCount} titles remain unopened.`}</p>
      </div>
      <div className="chart-grid">
        <ChartShell title={zh ? "按时长排序的前 10 记录" : "TOP RECORDS BY HOURS"}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={top10}>
              <CartesianGrid stroke="#3A3124" vertical={false} />
              <XAxis dataKey="name" hide />
              <YAxis stroke="#9B907E" />
              <Tooltip contentStyle={{ background: "#15120E", border: "1px solid #4A3E2D" }} />
              <Bar dataKey="hours" fill="#C2A66D" />
            </BarChart>
          </ResponsiveContainer>
        </ChartShell>
        <ChartShell title={zh ? "最近活动 / 14 天" : "RECENT ACTIVITY / 14 DAYS"}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={recent}>
              <CartesianGrid stroke="#3A3124" vertical={false} />
              <XAxis dataKey="name" hide />
              <YAxis stroke="#9B907E" />
              <Tooltip contentStyle={{ background: "#15120E", border: "1px solid #4A3E2D" }} />
              <Bar dataKey="hours" fill="#7D8B6F" />
            </BarChart>
          </ResponsiveContainer>
        </ChartShell>
        <ChartShell title={zh ? "玩过 / 未打开游戏" : "OPENED VS UNOPENED TITLES"}>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={opened} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95}>
                {opened.map((_, index) => <Cell key={index} fill={palette[index]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "#15120E", border: "1px solid #4A3E2D" }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartShell>
        <ChartShell title={zh ? "游戏时长分布" : "PLAYTIME DISTRIBUTION"}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={distribution}>
              <CartesianGrid stroke="#3A3124" vertical={false} />
              <XAxis dataKey="name" stroke="#9B907E" />
              <YAxis stroke="#9B907E" />
              <Tooltip contentStyle={{ background: "#15120E", border: "1px solid #4A3E2D" }} />
              <Bar dataKey="count" fill="#A8894B" />
            </BarChart>
          </ResponsiveContainer>
        </ChartShell>
      </div>
    </section>
  );
}

function ChartShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="chart-card">
      <h3>{title}</h3>
      {children}
    </div>
  );
}
