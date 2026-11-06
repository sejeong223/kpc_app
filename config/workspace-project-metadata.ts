import { createAdminSeed } from "@/config/admin-seed";
import { HTML_DEMO_PROJECT_ID } from "@/config/production-html-demo";
import type { WorkspaceHeaderMetadata } from "@/types/workspace-header";

// 로컬 프로젝트 목록과 같은 seed를 사용한다. 저장된 본문/권한을 건드리지 않는 표시용 목 데이터다.
const seed = createAdminSeed();
const organizations: Record<string, string> = {
  "d-ai": "행정안전부", "d-industry": "한국산업기술진흥원", "d-product": "중소벤처기업진흥공단",
  "d-consult": "한국지능정보사회진흥원", "d-cx": "공공행정혁신원", "d-edu": "한국교육학술정보원",
};
export const WORKSPACE_PROJECT_METADATA: Readonly<Record<string, WorkspaceHeaderMetadata>> = Object.fromEntries([
  ...seed.rfps.map((project, index) => [project.id, {
    organization: project.id === "edu" ? "한국지역정보개발원" : organizations[project.departmentId ?? ""] ?? "한국생산성본부",
    departmentName: seed.departments.find(department => department.id === project.departmentId)?.name ?? "사업지원본부",
    dueDate: project.id === "mois" ? "2026-11-04" : project.id === "edu" ? "2026-11-20" :
      new Date(Date.UTC(2026, 10, 6 + index * 3)).toISOString().slice(0, 10),
    budgetKrw: project.budgetKrw,
  }]),
  [HTML_DEMO_PROJECT_ID, { organization: "행정안전부", departmentName: "AI사업본부", dueDate: "2026-11-27", budgetKrw: 980000000 }],
]);
