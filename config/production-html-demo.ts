import type { ProposalSlide } from "@/types/workspace-production";

export const HTML_DEMO_PROJECT_ID = "production-html-demo";
export const HTML_DEMO_PROJECT_NAME = "[HTML 예시] 행정업무 AI 에이전트 구축";
export const HTML_DEMO_PROPOSAL_NAME = "초거대 AI 기반 맞춤형 지능 행정업무 에이전트 구축";
export const HTML_DEMO_SECTION_ID = "html-demo-s11";
export type HtmlDemoLayout = "cards" | "process" | "kpi" | "table";

// KPC_제안서_UI_v12 8.html: DECK.mois.s11. 원본 스크립트는 실행하지 않는다.
export const HTML_DEMO_SLIDES = [
  {
    title: "사업 추진 배경",
    lead: "공공 행정업무의 문서 작업 부담이 커지면서 생성형 AI 기반 업무 혁신이 요구되고 있습니다",
    layout: "cards",
    items: [
      ["정책 동향", "디지털플랫폼정부 실현계획에 따라 범정부 AI 활용 확대"],
      ["업무 현황", "기안 · 보고 · 회의록 등 반복 문서 작성이 업무 시간의 40% 차지"],
      ["기술 환경", "국산 초거대 AI 모델과 공공 클라우드 보안 인증 체계 성숙"],
    ],
  },
  {
    title: "사업 목적",
    lead: "검색 · 초안 · 검토를 하나로 잇는 지능형 행정업무 에이전트를 구축합니다",
    layout: "process",
    items: [
      ["검색", "흩어진 행정문서를 의미 기반으로 즉시 탐색"],
      ["초안", "행정서식 12종의 초안을 근거와 함께 자동 생성"],
      ["검토", "담당자 검토 · 수정 후 결재 시스템과 연계"],
    ],
  },
  {
    title: "기대 효과",
    lead: "문서 작성 시간 단축과 행정 품질 표준화를 동시에 달성합니다",
    layout: "kpi",
    items: [
      ["40%", "문서 작성 · 검색 시간 단축"],
      ["12종", "자동 초안 대상 행정서식"],
      ["95%", "근거 기반 답변 정확도 목표"],
    ],
  },
  {
    title: "RFP 핵심 요구 분석",
    lead: "평가 배점이 높은 기술 부문과 보안 요구사항에 역량을 집중합니다",
    layout: "table",
    items: [
      ["SFR-001~012", "지능형 검색 · 초안 자동화 기능 요구사항"],
      ["SER-001~004", "국정원 보안성 검토 · CSAP · 망연계 요구"],
      ["PMR-001~003", "단계별 일정 · 산출물 · 이관 1개월 확보"],
    ],
  },
  {
    title: "사업 범위",
    lead: "플랫폼 구축부터 시범 운영 · 확산 준비까지 전 과정을 수행합니다",
    layout: "cards",
    items: [
      ["플랫폼", "RAG 검색 · 초안 생성 · 관리자 콘솔 구축"],
      ["연계", "온나라 · 전자결재 · 문서관리시스템 연계"],
      ["운영", "시범 부서 3곳 운영 및 확산 계획 수립"],
    ],
  },
  {
    title: "과업 구성",
    lead: "6개 과업을 단계적으로 수행해 위험을 분산합니다",
    layout: "process",
    items: [
      ["분석 · 설계", "현행 업무 분석, 목표 아키텍처 확정"],
      ["구축 · 시험", "기능 개발, 보안 · 성능 시험"],
      ["이관 · 확산", "운영 이관, 교육, 확산 로드맵"],
    ],
  },
] as const satisfies readonly { title: string; lead: string; layout: HtmlDemoLayout; items: readonly (readonly [string, string])[] }[];

export const htmlDemoSlideId = (index: number): string => `html-demo-slide-${index + 1}`;

export function htmlDemoLayout(projectId: string, slide: ProposalSlide): HtmlDemoLayout | null {
  if (projectId !== HTML_DEMO_PROJECT_ID || slide.template) return null;
  const demo = HTML_DEMO_SLIDES.find((_, index) => htmlDemoSlideId(index) === slide.id);
  if (!demo) return null;
  const blocks = slide.content.blocks;
  // 구조를 편집한 경우 모든 블록을 지원하는 기본 미리보기로 돌아간다.
  if (demo.layout === "table") {
    const block = blocks[0];
    return blocks.length === 1 && block?.kind === "table" && block.columns.length === 2
      ? "table" : null;
  }
  return blocks.length === 3 && blocks.every(block => block.kind === "text") ? demo.layout : null;
}
