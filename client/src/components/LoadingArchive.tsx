const enSteps = [
  "Resolving subject...",
  "Retrieving public records...",
  "Indexing library...",
  "Writing local archive snapshot..."
];

export function LoadingArchive({ title = "INDEXING PUBLIC RECORDS" }: { title?: string }) {
  const steps = title === "正在索引公开记录"
    ? ["解析主体...", "读取公开记录...", "索引游戏库...", "写入档案快照..."]
    : enSteps;
  return (
    <div className="loading-archive">
      <span>{title}</span>
      {steps.map((step) => (
        <p key={step}>{step}</p>
      ))}
    </div>
  );
}
