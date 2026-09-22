import { describe, expect, it } from "vitest";

import {
  countKoreanCharacters,
  expandMockText,
  generateMockDraft,
  reduceMockText,
  refineMockText,
} from "@/lib/proposals/editor-mocks";
import type { ProposalRequirement, ProposalSection } from "@/types/proposals";

const section: ProposalSection = {
  id: "section-test",
  projectId: "project-test",
  number: "1.1",
  title: "추진 전략",
  status: "작성 중",
  assignee: "정소담",
  reviewer: "김세정",
  dueDate: "2026-09-30",
  targetCharacters: 1000,
  content: "",
  requirementIds: ["requirement-test"],
  updatedAt: "2026-09-22",
};
const requirements: ProposalRequirement[] = [{
  id: "requirement-test",
  projectId: "project-test",
  category: "기능",
  title: "근거 출처 표시",
  sourcePage: "p. 18",
  priority: "높음",
  status: "미반영",
  assignee: "정소담",
  checked: false,
}];

describe("proposal editor mock helpers", () => {
  it("generates the same plain-text draft for the same input", () => {
    const first = generateMockDraft(section, requirements);
    const second = generateMockDraft(section, requirements);

    expect(first).toBe(second);
    expect(first).toContain("근거 출처 표시");
    expect(first).not.toMatch(/```|<[^>]+>/);
  });

  it("refines, expands, and reduces text deterministically", () => {
    expect(refineMockText("  핵심   전략  ")).toBe("핵심 전략.");
    expect(expandMockText("핵심 전략")).toContain("세부 실행 과제");
    expect(reduceMockText("첫 문장입니다. 두 번째 문장입니다.")).toBe("첫 문장입니다.");
  });

  it("returns an empty string for empty transformations", () => {
    expect(refineMockText("   ")).toBe("");
    expect(expandMockText("\n")).toBe("");
    expect(reduceMockText("")).toBe("");
  });

  it("counts visible Korean characters without whitespace", () => {
    expect(countKoreanCharacters("한글 문장\n테스트")).toBe(7);
  });
});