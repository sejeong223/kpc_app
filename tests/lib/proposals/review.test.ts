import { describe, expect, it } from "vitest";

import {
  buildProposalTextExport,
  calculateProposalReviewSummary,
  findMockFactIssues,
} from "@/lib/proposals/review";
import type { ProposalProject, ProposalRequirement, ProposalSection } from "@/types/proposals";

const project = { title: "한국어 제안서", agency: "발주 기관" } as ProposalProject;
const sections: ProposalSection[] = [
  { id: "s10", projectId: "p", number: "10", title: "결론", status: "완료", assignee: "정소담", reviewer: "김세정", dueDate: "2026-10-01", targetCharacters: 2, content: "완료", requirementIds: [], updatedAt: "" },
  { id: "s2", projectId: "p", number: "2", title: "전략", status: "작성 중", assignee: "정소담", reviewer: "김세정", dueDate: "2026-09-30", targetCharacters: 2, content: "TBD 000 추후 확인", requirementIds: ["r1"], updatedAt: "" },
];
const requirements: ProposalRequirement[] = [
  { id: "r1", projectId: "p", category: "기능", title: "요구", sourcePage: "p. 1", priority: "높음", status: "반영", assignee: "정소담", checked: true },
  { id: "r2", projectId: "p", category: "기능", title: "미반영", sourcePage: "p. 2", priority: "보통", status: "미반영", assignee: "정소담", checked: false },
];

describe("proposal review helpers", () => {
  it("calculates clamped section and requirement summary", () => {
    expect(calculateProposalReviewSummary(sections, requirements)).toEqual({
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

  it("finds only the explicit mock fact patterns", () => {
    const issues = findMockFactIssues(sections);
    expect(issues.map((issue) => issue.excerpt)).toEqual(["추후 확인", "TBD", "000"]);
  });

  it("exports sections in numeric order while preserving Korean text", () => {
    const output = buildProposalTextExport(project, sections);
    expect(output).toContain("한국어 제안서\n발주 기관");
    expect(output.indexOf("2 전략")).toBeLessThan(output.indexOf("10 결론"));
  });
});