import { countKoreanCharacters } from "@/lib/proposals/editor-mocks";
import type {
  ProposalFactIssue,
  ProposalProject,
  ProposalRequirement,
  ProposalReviewSummary,
  ProposalSection,
} from "@/types/proposals";

export function calculateProposalReviewSummary(
  sections: readonly ProposalSection[],
  requirements: readonly ProposalRequirement[],
): ProposalReviewSummary {
  const totalCharacters = sections.reduce(
    (total, section) => total + countKoreanCharacters(section.content),
    0,
  );
  const targetCharacters = sections.reduce(
    (total, section) => total + Math.max(0, section.targetCharacters),
    0,
  );

  return {
    totalSections: sections.length,
    completedSections: sections.filter((section) => section.status === "완료").length,
    totalCharacters,
    targetCharacters,
    coveredRequirements: requirements.filter(
      (requirement) => requirement.checked || requirement.status === "반영",
    ).length,
    totalRequirements: requirements.length,
    completionRate:
      targetCharacters === 0
        ? 0
        : Math.max(0, Math.min(100, Math.round((totalCharacters / targetCharacters) * 100))),
  };
}

export function findMockFactIssues(
  sections: readonly ProposalSection[],
): ProposalFactIssue[] {
  const issues: ProposalFactIssue[] = [];

  for (const section of sections) {
    const patterns = [
      { token: "추후 확인", severity: "주의" as const, message: "확정되지 않은 표현이 있습니다." },
      { token: "TBD", severity: "주의" as const, message: "TBD 표시를 확정된 내용으로 교체하세요." },
      { token: "000", severity: "확인 필요" as const, message: "임시 숫자 표기를 확인하세요." },
    ];
    for (const pattern of patterns) {
      if (section.content.includes(pattern.token)) {
        issues.push({
          id: `${section.id}-${pattern.token}`,
          sectionId: section.id,
          severity: pattern.severity,
          message: pattern.message,
          excerpt: pattern.token,
        });
      }
    }
    if (section.status === "완료" && section.content.trim().length === 0) {
      issues.push({
        id: `${section.id}-empty-complete`,
        sectionId: section.id,
        severity: "확인 필요",
        message: "완료 상태인 Section의 본문이 비어 있습니다.",
        excerpt: "빈 본문",
      });
    }
  }

  return issues;
}

export function buildProposalTextExport(
  project: ProposalProject,
  sections: readonly ProposalSection[],
): string {
  const sortedSections = [...sections].sort((left, right) =>
    left.number.localeCompare(right.number, "ko-KR", { numeric: true }),
  );
  const body = sortedSections
    .map((section) => `${section.number} ${section.title}\n\n${section.content.trim()}`)
    .join("\n\n---\n\n");

  return `${project.title}\n${project.agency}\n\n${body}`.trimEnd();
}