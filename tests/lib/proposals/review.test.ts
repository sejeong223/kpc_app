import { describe, expect, it } from "vitest";

import {
  applyAllFactCheckIssues,
  applyFactCheckIssue,
  calculateProposalReviewSummary,
  collectPassedFacts,
  createFactCheckRules,
  detectFactCheckIssues,
} from "@/lib/proposals/review";
import type {
  ProposalRequirement,
  ProposalSection,
  ProposalSectionItem,
} from "@/types/proposals";

const legacySections: ProposalSection[] = [
  { id: "s10", projectId: "p", number: "10", title: "결론", status: "완료", assignee: "정소담", reviewer: "김세정", dueDate: "2026-10-01", targetCharacters: 2, content: "완료", requirementIds: [], updatedAt: "" },
  { id: "s2", projectId: "p", number: "2", title: "전략", status: "작성 중", assignee: "정소담", reviewer: "김세정", dueDate: "2026-09-30", targetCharacters: 2, content: "TBD 000 추후 확인", requirementIds: ["r1"], updatedAt: "" },
];
const requirements: ProposalRequirement[] = [
  { id: "r1", projectId: "p", category: "기능", title: "요구", sourcePage: "p. 1", priority: "높음", status: "반영", assignee: "정소담", checked: true },
  { id: "r2", projectId: "p", category: "기능", title: "미반영", sourcePage: "p. 2", priority: "보통", status: "미반영", assignee: "정소담", checked: false },
];

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
  it("calculates the legacy review summary used by workspace state tests", () => {
    expect(calculateProposalReviewSummary(legacySections, requirements)).toEqual({
      totalSections: 2,
      completedSections: 1,
      totalCharacters: 12,
      targetCharacters: 4,
      coveredRequirements: 1,
      totalRequirements: 2,
      completionRate: 100,
    });
    expect(calculateProposalReviewSummary([], []).completionRate).toBe(0);
  });

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
