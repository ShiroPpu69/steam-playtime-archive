export function minutesToHours(minutes: number): number {
  return Number((minutes / 60).toFixed(1));
}

export function minutesToText(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h} 小时 ${m} 分钟`;
}

export function nowIso(): string {
  return new Date().toISOString();
}
