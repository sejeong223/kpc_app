import type { ProposalRequirement, ProposalSection } from "@/types/proposals";

export function countKoreanCharacters(text: string): number {
  return Array.from(text.replace(/\s/g, "")).length;
}

export function generateMockDraft(
  section: ProposalSection,
  requirements: ProposalRequirement[],
): string {
  const linkedRequirements = requirements.filter((requirement) =>
    section.requirementIds.includes(requirement.id),
  );
  const requirementSummary = linkedRequirements.length
    ? linkedRequirements.map((requirement) => requirement.title).join(", ")
    : "연결된 요구사항을 기준으로 한 핵심 과업";

  return `${section.title}\n\n본 절에서는 ${requirementSummary}을 중심으로 실행 가능한 추진 방안을 제시합니다. 현황 진단과 단계별 이행 계획을 연결하고, 담당 조직과 측정 지표를 명확히 정의하여 사업 목표 달성을 지원합니다.`;
}

export function refineMockText(text: string): string {
  const normalized = text.trim().replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n");
  if (!normalized) return "";
  return /[.!?。]$/.test(normalized) ? normalized : `${normalized}.`;
}

export function expandMockText(text: string): string {
  const normalized = text.trim();
  if (!normalized) return "";
  return `${normalized}\n\n이를 위해 세부 실행 과제를 단계별로 정의하고, 담당자와 완료 기준을 명확히 설정합니다. 각 단계의 결과는 정량 지표로 점검하여 다음 의사결정에 반영합니다.`;
}

export function reduceMockText(text: string): string {
  const normalized = text.trim();
  if (!normalized) return "";
  const firstSentence = normalized.match(/^.*?[.!?。](?:\s|$)/)?.[0]?.trim();
  if (firstSentence) return firstSentence;
  return Array.from(normalized).slice(0, 100).join("");
}