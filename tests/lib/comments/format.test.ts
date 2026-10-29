import { describe, expect, it } from "vitest";
import { formatCommentTime } from "@/lib/comments/format";
const now = Date.parse("2026-10-29T03:00:00.000Z");
describe("comment timestamps", () => {
  it.each([[0, "방금"], [59000, "방금"], [60000, "1분 전"], [3599000, "59분 전"], [3600000, "1시간 전"], [86399000, "23시간 전"], [86400000, "10.28 12:00"], [-60000, "방금"]])("formats elapsed %s", (elapsed, label) => {
    expect(formatCommentTime(new Date(now - Number(elapsed)).toISOString(), now).label).toBe(label);
  });
  it("uses Seoul dates across UTC date boundaries", () => {
    expect(formatCommentTime("2026-10-28T15:00:00Z", now).full).toBe("2026.10.29 00:00");
  });
  it("handles invalid timestamps", () => {
    expect(formatCommentTime("invalid", now).label).toBe("알 수 없음");
    expect(formatCommentTime(new Date(now).toISOString(), NaN).label).toBe("알 수 없음");
  });
});
