import { PromptStoreSchema } from "@/lib/admin/prompts/schemas";
import type { AdminStoreState } from "@/types/admin";
import type { PromptItem, PromptStore } from "@/types/admin-prompts";
export function createPromptSeed(state: AdminStoreState): PromptStore {
  const store: PromptStore = { records: [], revisions: [], usages: [] };
  const examples = [
    { department: "d-ai", name: "공공 AI 플랫폼 구축 제안서", description: "공공기관 생성형 AI · RAG 플랫폼 구축 사업의 대표 목차", focus: "RFP 요구사항과 보안 체계를 연결하고 검증 방법을 제시합니다." },
    { department: "d-cx", name: "CX 혁신 컨설팅 제안서", description: "고객경험 진단 · 서비스 개선 컨설팅의 대표 목차", focus: "고객 여정별 문제를 정량 지표와 근거로 설명합니다." },
    { department: "d-edu", name: "교육 · 인재양성 운영 제안서", description: "교육과정 설계 · 운영 · 성과관리 사업의 대표 목차", focus: "교육 대상과 목표 역량에 맞춰 단계별 성과 지표를 제시합니다." },
    { department: "d-product", name: "생산성 진단 컨설팅 제안서", description: "생산성 진단 · 개선 과제 도출 컨설팅의 대표 목차", focus: "가치사슬별 손실 요인과 개선 효과를 표로 정리합니다." },
    { department: "d-consult", name: "정보화 전략 계획 제안서", description: "현황 진단부터 이행 계획까지 ISP 사업의 대표 목차", focus: "현황과 목표 시스템의 차이를 분석하고 실행 과제를 우선순위화합니다." },
    { department: "d-industry", name: "산업 디지털 전환 제안서", description: "산업 현장의 업무 혁신과 디지털 전환 사업의 대표 목차", focus: "현장 데이터를 활용해 개선 방향과 검증 방법을 제시합니다." },
  ];
  examples.forEach((example, index) => {
    const id = "prompt-set-" + (index + 1), owner = state.users.find(user => user.departmentId === example.department && user.status === "active") ?? state.users[0];
    const items: PromptItem[] = [
      { id: id + "-1", level: 1, title: "사업 이해", prompt: example.focus, sources: ["proposal", "related", "web"] },
      { id: id + "-2", level: 2, title: "사업 배경 및 목적", prompt: "사업 배경과 목적을 연결하고 RFP 요구사항을 근거로 작성합니다.", sources: null },
      { id: id + "-3", level: 2, title: "현황 분석 및 시사점", prompt: "", sources: null },
      { id: id + "-4", level: 1, title: "추진 전략", prompt: "추진 전략과 차별화 방안을 근거와 함께 제시합니다.", sources: ["related", "proposal", "web"] },
      { id: id + "-5", level: 2, title: "단계별 실행 로드맵", prompt: "단계별 산출물과 기간을 표로 정리합니다.", sources: ["proposal", "web"] },
      { id: id + "-6", level: 1, title: "사업 관리", prompt: "추진 일정, 투입 인력, 품질 관리 방안을 표 중심으로 작성합니다.", sources: ["proposal", "related"] },
      { id: id + "-7", level: 2, title: "추진 일정 및 투입 인력", prompt: "", sources: null },
    ];
    const createdAt = "2026-10-" + String(20 - index).padStart(2, "0") + "T00:00:00.000Z";
    store.records.push({ id, version: 1, currentRevision: 1, createdAt, updatedAt: createdAt, createdBy: owner.id, ownerDepartmentId: example.department, status: index < 4 ? "active" : "draft", deletedAt: null, visibility: index === 0 ? { all: true, targets: [] } : { all: false, targets: [{ type: "department", id: example.department }] } });
    store.revisions.push({ id: id + "-v1", promptSetId: id, revision: 1, name: example.name, description: example.description, items, createdAt, createdBy: owner.id });
    if (index < 4) state.rfps.filter(project => project.departmentId === example.department).slice(0, 2).forEach((project, i) => store.usages.push({ id: id + "-usage-" + i, promptSetId: id, projectId: project.id, revision: 1, mode: i === 0 ? "project" : "section" }));
  });
  return PromptStoreSchema.parse(store);
}
