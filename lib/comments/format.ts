export function formatCommentTime(createdAt: string, now: number): { label: string; full: string } {
  const time = Date.parse(createdAt);
  if (!Number.isFinite(time) || !Number.isFinite(now)) return { label: "알 수 없음", full: "알 수 없음" };
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(time);
  const get = (key: Intl.DateTimeFormatPartTypes) => parts.find(p => p.type === key)?.value ?? "";
  const full = `${get("year")}.${get("month")}.${get("day")} ${get("hour")}:${get("minute")}`;
  const minutes = Math.max(0, Math.floor((now - time) / 60000));
  const label = minutes < 1 ? "방금" : minutes < 60 ? `${minutes}분 전` : minutes < 1440 ? `${Math.floor(minutes / 60)}시간 전` : full.slice(5);
  return { label, full };
}
