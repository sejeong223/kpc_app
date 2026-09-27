import { describe, expect, it } from "vitest";

import {
  applyAllFactCheckIssues,
  applyFactCheckIssue,
  collectPassedFacts,
  createFactCheckRules,
  detectFactCheckIssues,
} from "@/lib/proposals/review";
import type { ProposalSectionItem } from "@/types/proposals";

const sourceSection: ProposalSectionItem = {
  id: "sec-source",
  sectionNumber: "1",
  title: "1. 사업 이해",
  level: 1,
  status: "작성 중",
  author: "정소담",
  reviewer: "김민수",
  updatedAt: "2026-09-27",
  charLimit: 4000,
  currentCharCount: 0,
  content: "한국생산성진흥회 삼성SDS 노규성 회장 구현모 대표이사 2024년도 AI 선도사업 8개월 이내 KPC AI 플랫폼 쿠버네티스",
};

describe("proposal review helpers", () => {
  it("detects the source company, person, year, and duration rules in source order", () => {
    const rules = createFactCheckRules();
    const issues = detectFactCheckIssues([sourceSection], rules);

    expect(rules).toHaveLength(6);
    expect(issues).toHaveLength(6);
    expect(issues.map((issue) => issue.ruleId)).toEqual([
      "rule-client-wrong",
      "rule-other-vendor",
      "rule-client-leader",
      "rule-vendor-leader",
      "rule-project-year",
      "rule-project-duration",
    ]);
    expect(issues.every((issue) => issue.sectionId === sourceSection.id)).toBe(true);
  });

  it("collects the same passed fact counters as the source modal", () => {
    expect(collectPassedFacts([sourceSection]).map((fact) => [fact.matchedText, fact.matchCount])).toEqual([
      ["KPC", 1],
      ["AI 플랫폼", 1],
      ["쿠버네티스", 1],
    ]);
  });

  it("applies an immutable single correction and updates the character count", () => {
    const [issue] = detectFactCheckIssues([sourceSection]);
    const [updated] = applyFactCheckIssue([sourceSection], issue);

    expect(updated).not.toBe(sourceSection);
    expect(sourceSection.content).toContain("한국생산성진흥회");
    expect(updated.content).toContain("한국생산성본부 (KPC)");
    expect(updated.currentCharCount).toBe(updated.content.length);
  });

  it("applies all source corrections until no configured issue remains", () => {
    const issues = detectFactCheckIssues([sourceSection]);
    const updated = applyAllFactCheckIssues([sourceSection], issues);

    expect(detectFactCheckIssues(updated)).toHaveLength(0);
    expect(updated[0].content).toContain("KT 컨소시엄");
    expect(updated[0].content).toContain("안완기 회장");
    expect(updated[0].content).toContain("2026년도");
    expect(updated[0].content).toContain("6개월 이내");
  });
});
