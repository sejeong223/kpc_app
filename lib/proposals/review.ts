import { countKoreanCharacters } from "@/lib/proposals/editor-mocks";
import type {
  ProposalRequirement,
  ProposalReviewSummary,
  ProposalSection,
  ProposalSectionItem,
} from "@/types/proposals";

export type FactCheckCategory = "company" | "person" | "project";
export type FactCheckSeverity = "critical" | "warning";

export interface FactBaseline {
  clientName: string;
  clientLeader: string;
  vendorName: string;
  vendorLeader: string;
  projectName: string;
  projectYear: string;
  projectDuration: string;
}

export interface FactCheckRule {
  id: string;
  category: FactCheckCategory;
  categoryLabel: string;
  wrongPattern: RegExp | string;
  wrongTextDisplay: string;
  correctText: string;
  title: string;
  reason: string;
  severity: FactCheckSeverity;
}

export interface FactCheckIssue {
  id: string;
  ruleId: string;
  category: FactCheckCategory;
  categoryLabel: string;
  severity: FactCheckSeverity;
  title: string;
  wrongText: string;
  correctText: string;
  reason: string;
  sectionId: string;
  sectionTitle: string;
  sectionNumber: string;
  contextSnippet: string;
}

export interface FactPassedItem {
  id: string;
  category: FactCheckCategory;
  categoryLabel: string;
  title: string;
  matchedText: string;
  matchCount: number;
  description: string;
}

export const DEFAULT_FACT_BASELINE: FactBaseline = {
  clientName: "한국생산성본부 (KPC)",
  clientLeader: "안완기 회장",
  vendorName: "KT 컨소시엄",
  vendorLeader: "김영섭 대표이사",
  projectName: "AX 생성형 AI 플랫폼 구축 및 PoC 사업",
  projectYear: "2026년도",
  projectDuration: "6개월",
};

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

export function createFactCheckRules(
  baseline: FactBaseline = DEFAULT_FACT_BASELINE,
): FactCheckRule[] {
  return [
    {
      id: "rule-client-wrong",
      category: "company",
      categoryLabel: "회사/기관명",
      wrongPattern: /한국생산성진흥회|한국생산성진흥원|생산성연구원|한국생산본부|KPA\b/g,
      wrongTextDisplay: "한국생산성진흥회 / 생산성연구원",
      correctText: "한국생산성본부 (KPC)",
      title: "발주처 공식 기관명 오류",
      reason: "발주기관의 공식 명칭은 \"한국생산성본부(KPC)\"입니다. 잘못된 기관명 표기는 기술평가 시 심각한 결격 및 감점 사유가 됩니다.",
      severity: "critical",
    },
    {
      id: "rule-other-vendor",
      category: "company",
      categoryLabel: "회사/기관명",
      wrongPattern: /삼성SDS|LG CNS|SK C&C|A사 컨소시엄|OO공사/g,
      wrongTextDisplay: "삼성SDS / LG CNS / 타사명",
      correctText: baseline.vendorName || "KT 컨소시엄",
      title: "타 제안서 재활용 사명 잔재",
      reason: "타사 제안서 또는 이전 사업 문서 복사-붙여넣기로 추정되는 타 기업 사명이 발견되었습니다. 제안 신뢰도에 치명적입니다.",
      severity: "critical",
    },
    {
      id: "rule-client-leader",
      category: "person",
      categoryLabel: "회장/대표자/직책",
      wrongPattern: /노규성\s*회장|안완기\s*이사장|안원기\s*회장|김회장\b/g,
      wrongTextDisplay: "노규성 회장(전임) / 안완기 이사장(직책 오기)",
      correctText: baseline.clientLeader || "안완기 회장",
      title: "발주처 회장 성명 및 직책 오류",
      reason: "한국생산성본부 현 19대 기관장은 \"안완기 회장\"입니다. 전임 회장명(노규성) 또는 잘못된 직위(이사장) 표기는 반드시 정정해야 합니다.",
      severity: "critical",
    },
    {
      id: "rule-vendor-leader",
      category: "person",
      categoryLabel: "회장/대표자/직책",
      wrongPattern: /구현모\s*대표|구현모\s*대표이사|황창규\s*회장/g,
      wrongTextDisplay: "구현모 대표이사(전임)",
      correctText: baseline.vendorLeader || "김영섭 대표이사",
      title: "제안사 대표이사 전임자 표기 오류",
      reason: "제안사 대표이사로 전임 대표 명칭이 기재되어 있습니다. 현 \"김영섭 대표이사\"로 정정해야 합니다.",
      severity: "critical",
    },
    {
      id: "rule-project-year",
      category: "project",
      categoryLabel: "사업명/연도/기간",
      wrongPattern: /2024년도\s*AI\s*선도사업|2024년도|2023년도/g,
      wrongTextDisplay: "2024년도 / 과거 연도 표기",
      correctText: baseline.projectYear || "2026년도",
      title: "사업 기준 연도 사실 불일치",
      reason: "본 제안 공고는 2026년도 사업입니다. 과거 제안서 서식에서 비롯된 구연도(2024년 등) 표기를 정정해야 합니다.",
      severity: "warning",
    },
    {
      id: "rule-project-duration",
      category: "project",
      categoryLabel: "사업명/연도/기간",
      wrongPattern: /8개월\s*이내|8개월간|1년\s*이내/g,
      wrongTextDisplay: "8개월 이내",
      correctText: `${baseline.projectDuration || "6개월"} 이내`,
      title: "사업 수행 기간(납기) 불일치",
      reason: "RFP 상 공고된 사업 기간은 착수일로부터 6개월입니다. 8개월 등으로 잘못 기재된 기간 사실관계를 확인하십시오.",
      severity: "warning",
    },
  ];
}

export function detectFactCheckIssues(
  sections: readonly ProposalSectionItem[],
  rules: readonly FactCheckRule[] = createFactCheckRules(),
): FactCheckIssue[] {
  const issues: FactCheckIssue[] = [];

  for (const section of sections) {
    const fullText = `${section.title}\n${section.content || ""}`;
    for (const rule of rules) {
      const pattern =
        typeof rule.wrongPattern === "string"
          ? new RegExp(rule.wrongPattern, "g")
          : new RegExp(rule.wrongPattern.source, "g");
      let match: RegExpExecArray | null;

      while ((match = pattern.exec(fullText)) !== null) {
        const matchedText = match[0];
        const startIndex = Math.max(0, match.index - 25);
        const endIndex = Math.min(fullText.length, match.index + matchedText.length + 30);
        const snippet = fullText.substring(startIndex, endIndex).replace(/\n/g, " ");
        issues.push({
          id: `issue-${rule.id}-${section.id}-${match.index}`,
          ruleId: rule.id,
          category: rule.category,
          categoryLabel: rule.categoryLabel,
          severity: rule.severity,
          title: rule.title,
          wrongText: matchedText,
          correctText: rule.correctText,
          reason: rule.reason,
          sectionId: section.id,
          sectionTitle: section.title,
          sectionNumber: section.sectionNumber,
          contextSnippet: `...${snippet}...`,
        });
      }
    }
  }

  return issues;
}

export function collectPassedFacts(
  sections: readonly ProposalSectionItem[],
): FactPassedItem[] {
  const facts: Array<Omit<FactPassedItem, "id" | "matchCount"> & { text: string }> = [
    { text: "한국생산성본부", category: "company", categoryLabel: "회사/기관명", title: "발주처 공식 기관명 표기 일치", matchedText: "한국생산성본부", description: "공식 한글 명칭 \"한국생산성본부\"가 제안서 본문 내에 정상 기재되어 있습니다." },
    { text: "KPC", category: "company", categoryLabel: "회사/기관명", title: "발주처 공식 영문 약칭(KPC) 일치", matchedText: "KPC", description: "영문 공식 약칭 \"KPC\"가 대분류 및 아키텍처 항목에 일관되게 적용되었습니다." },
    { text: "안완기", category: "person", categoryLabel: "회장/대표자/직책", title: "발주처 회장명 사실관계 부합", matchedText: "안완기", description: "한국생산성본부 제19대 안완기 회장 성명이 정확히 명시되었습니다." },
    { text: "AI 플랫폼", category: "project", categoryLabel: "사업명/연도/기간", title: "제안 목표 시스템 명칭 부합", matchedText: "AI 플랫폼", description: "RFP 요구 규격인 엔터프라이즈 AI 플랫폼 용어가 정확히 부합합니다." },
    { text: "쿠버네티스", category: "project", categoryLabel: "사업명/연도/기간", title: "인프라 아키텍처 사실관계 부합", matchedText: "쿠버네티스", description: "컨테이너 오케스트레이션 기반 기술 사양이 규격에 맞게 기재되었습니다." },
  ];

  return facts.map((fact, index) => {
    const matchCount = sections.reduce((count, section) => {
      const text = `${section.title} ${section.content || ""}`;
      return count + (text.match(new RegExp(fact.text, "g"))?.length || 0);
    }, 0);
    return {
      id: `passed-${index}`,
      category: fact.category,
      categoryLabel: fact.categoryLabel,
      title: fact.title,
      matchedText: fact.matchedText,
      matchCount,
      description: fact.description,
    };
  }).filter((fact) => fact.matchCount > 0);
}

export function applyFactCheckIssue(
  sections: readonly ProposalSectionItem[],
  issue: FactCheckIssue,
): ProposalSectionItem[] {
  return sections.map((section) => {
    if (section.id !== issue.sectionId) return { ...section };
    const content = (section.content || "").replaceAll(issue.wrongText, issue.correctText);
    return {
      ...section,
      title: section.title.replaceAll(issue.wrongText, issue.correctText),
      content,
      currentCharCount: content.length,
    };
  });
}

export function applyAllFactCheckIssues(
  sections: readonly ProposalSectionItem[],
  issues: readonly FactCheckIssue[],
): ProposalSectionItem[] {
  return issues.reduce(
    (updated, issue) => applyFactCheckIssue(updated, issue),
    sections.map((section) => ({ ...section })),
  );
}
