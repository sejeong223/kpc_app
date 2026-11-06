import { MFG_DEMO_PROJECT_ID } from "@/config/production-mfg-demo";
import type { HeaderPermissionKey, HeaderSettingsDraft, HeaderSettingsLogRow, WorkspaceHeaderModel } from "@/types/workspace-header";
import type { ProjectPermission, ProjectView } from "@/types/workspace-production";

export const HEADER_PERMISSION_COLUMNS = [
  { key: "done", label: "완성", description: "작성이 끝났다고 보고 완성 처리" },
  { key: "redo", label: "재작업", description: "파일 업로드부터 다시 진행 (작성 완료 섹션은 고정)" },
  { key: "setup", label: "제작 설정", description: "제작 설정의 프롬프트 세트 · Skill · Template 선택과 프로젝트 프롬프트 수정" },
  { key: "assign", label: "담당 지정", description: "목차 담당자 · 리뷰자 지정" },
  { key: "grant", label: "권한 부여", description: "이 화면에서 다른 사람에게 권한 부여" },
] as const;
export const HEADER_NOTIFICATION_FIELDS = [
  { key: "deadline", label: "제출 마감 리마인더", description: "7일 전 · 3일 전 · 1일 전 · 당일" },
  { key: "complete", label: "완성 알림", description: "PM 및 프로젝트 참여자에게" },
  { key: "rework", label: "재작업 시작 알림", description: "작성 중 섹션 담당자에게" },
  { key: "comment", label: "의견 등록 알림", description: "담당 작성자에게" },
] as const;
const permissionMap: Partial<Record<ProjectPermission, HeaderPermissionKey>> = { complete: "done", rework: "redo", setup: "setup", assign: "assign" };

export function canEditHeaderPermissionDraft(project: WorkspaceHeaderModel, view: ProjectView): boolean {
  return project.projectId === view.project.id && !project.snapshotId &&
    (view.actor.id === project.pmId || view.actor.role === "super_admin" ||
      (project.projectId === MFG_DEMO_PROJECT_ID && view.members.some(m => m.id === view.actor.id)));
}
export function createHeaderSettingsDraft(project: WorkspaceHeaderModel, view: ProjectView): HeaderSettingsDraft {
  return {
    projectId: project.projectId, name: project.name, organization: project.organization ?? "",
    budgetEok: project.budgetKrw === null ? "" : `${project.budgetKrw / 100000000}억원`, dueDate: project.dueDate ?? "",
    permissionsByMember: Object.fromEntries(view.members.map(member => {
      const fixed = member.id === project.pmId || member.role === "super_admin";
      const permissions: HeaderPermissionKey[] = fixed ? HEADER_PERMISSION_COLUMNS.map(c => c.key) :
        [...new Set((view.state.grants.find(g => g.userId === member.id)?.permissions ?? []).flatMap(key => permissionMap[key] ? [permissionMap[key]!] : []))];
      if (!fixed && project.projectId === MFG_DEMO_PROJECT_ID && member.id === view.actor.id) permissions.push("grant");
      return [member.id, permissions];
    })),
    notifications: { deadline: true, complete: true, rework: true, comment: true, inApp: true, email: true },
  };
}
const commonLogs: readonly HeaderSettingsLogRow[] = [
  { id: "1", name: "정소담", department: "수석", role: "작성자", detail: "3.3 보안 체계 본문 수정 (자동 저장)", at: "2분 전" },
  { id: "2", name: "김민수", department: "수석", role: "작성자", detail: "의견 등록 · 3.3 보안 체계", at: "35분 전" },
  { id: "3", name: "박성훈", department: "책임", role: "작성자", detail: "의견 등록 · 4.1 추진 일정", at: "2시간 전" },
  { id: "4", name: "정소담", department: "수석", role: "작성자", detail: "RFP 문서 심층 분석 및 8개 평가 지표 산출 완료", at: "10.08" },
  { id: "5", name: "시스템", department: "-", role: "-", detail: "RFP 공고문 업로드 및 프로젝트 초기 등록", at: "2026.09.18" },
];
const manufacturingLogs: readonly HeaderSettingsLogRow[] = [
  { id: "1", name: "정소담", department: "생산성본부", role: "작성자", detail: "3.1 공정 데이터 연계 체계 본문 수정", at: "2분 전" },
  { id: "2", name: "이서연", department: "생산성본부", role: "PM", detail: "의견 등록 · 3.1 공정 데이터 연계 체계", at: "35분 전" },
  { id: "3", name: "김민수", department: "생산성본부", role: "작성자", detail: "의견 등록 · 4.1 추진 일정 및 WBS", at: "2시간 전" },
  { id: "4", name: "정소담", department: "생산성본부", role: "작성자", detail: "제조업 PoC 요구사항 12건 분석", at: "10.15" },
  { id: "5", name: "시스템", department: "-", role: "-", detail: "제조 AI 자율공정 PoC 제안요청서 등록", at: "2026.10.12" },
];
export function headerSettingsDemoLogs(projectId: string): readonly HeaderSettingsLogRow[] {
  return projectId === MFG_DEMO_PROJECT_ID ? manufacturingLogs : commonLogs;
}
