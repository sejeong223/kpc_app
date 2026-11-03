// 헤더 UI 예시. 로그인 권한·실제 프로젝트·코멘트 저장소와는 별개다.
export type ProjectHeaderId = "mois" | "edu";
export type ProjectPermission = "done" | "redo" | "setup" | "assign" | "grant";
export type ProjectRole = "PM" | "작성자" | "리뷰자";
export type ProjectStage = "review" | "active" | "done" | "drop";

export interface ProjectSection {
  readonly id: string;
  readonly no: string;
  readonly title: string;
  readonly state: "done" | "doing";
}
export interface ProjectVersion {
  readonly round: number;
  readonly at: string;
  readonly by: string;
  readonly done: number;
  readonly doing: number;
  readonly slides: number;
}
export interface ProjectMember {
  readonly id: string;
  readonly name: string;
  readonly department: string;
  readonly isPm: boolean;
  readonly permissions: readonly ProjectPermission[];
}
export interface ProjectNotifications {
  readonly deadline: boolean;
  readonly complete: boolean;
  readonly rework: boolean;
  readonly comment: boolean;
  readonly inApp: boolean;
  readonly email: boolean;
}
export interface ProjectLog {
  readonly id: string;
  readonly name: string;
  readonly department: string;
  readonly role: string;
  readonly detail: string;
  readonly at: string;
}
export interface ProjectHeaderData {
  readonly id: ProjectHeaderId;
  readonly name: string;
  readonly organization: string;
  readonly dueDate: string;
  readonly budgetEok: number;
  readonly stage: ProjectStage;
  readonly roles: readonly ProjectRole[];
  readonly permissions: readonly ProjectPermission[];
  readonly round: number;
  readonly writeState: "writing" | "done";
  readonly sections: readonly ProjectSection[];
  readonly openCommentCount: number;
  readonly reviewCommentCount: number;
  readonly versions: readonly ProjectVersion[];
  readonly members: readonly ProjectMember[];
  readonly notifications: ProjectNotifications;
  readonly logs: readonly ProjectLog[];
}
export interface ProjectHeaderView {
  readonly isPm: boolean;
  readonly roleLabel: string;
  readonly roundLabel: string;
  readonly showRound: boolean;
  readonly showRedo: boolean;
  readonly showHistory: boolean;
  readonly showComplete: boolean;
  readonly completeDisabled: boolean;
  readonly doneCount: number;
  readonly doingCount: number;
  readonly historyCount: number;
}

const allPermissions: readonly ProjectPermission[] = ["done", "redo", "setup", "assign", "grant"];
const notifications: ProjectNotifications = { deadline: true, complete: true, rework: true, comment: true, inApp: true, email: true };

export const PROJECT_HEADER_PROJECTS: readonly ProjectHeaderData[] = [
  {
    id: "mois", name: "초거대 AI 기반 맞춤형 지능 행정업무 에이전트 구축", organization: "행정안전부",
    dueDate: "2026-11-04", budgetEok: 9.8, stage: "active", roles: ["PM", "작성자", "리뷰자"], permissions: allPermissions,
    round: 2, writeState: "writing", openCommentCount: 2, reviewCommentCount: 0,
    sections: [
      { id: "s11", no: "1.1", title: "사업 배경 및 목적", state: "done" },
      { id: "s21", no: "2.1", title: "추진 전략", state: "done" },
      { id: "s31", no: "3.1", title: "지능형 RAG 검색 체계", state: "done" },
      { id: "s32", no: "3.2", title: "Multi-LLM 행정서식 초안 자동화", state: "doing" },
      { id: "s33", no: "3.3", title: "보안 체계 (CSAP 망연계)", state: "doing" },
      { id: "s41", no: "4.1", title: "추진 일정 및 WBS", state: "doing" },
    ],
    versions: [{ round: 1, at: "2026.10.17 18:20", by: "정소담", done: 3, doing: 3, slides: 42 }],
    members: [
      { id: "sodam", name: "정소담", department: "수석", isPm: true, permissions: allPermissions },
      { id: "minsu", name: "김민수", department: "수석", isPm: false, permissions: ["done", "redo", "assign"] },
      { id: "seoyeon", name: "이서연", department: "선임", isPm: false, permissions: ["assign"] },
      { id: "sunghoon", name: "박성훈", department: "책임", isPm: false, permissions: [] },
    ],
    notifications,
    logs: [
      { id: "m-log-1", name: "정소담", department: "수석", role: "작성자", detail: "3.3 보안 체계 본문 수정 (자동 저장)", at: "2분 전" },
      { id: "m-log-2", name: "김민수", department: "수석", role: "작성자", detail: "의견 등록 · 3.3 보안 체계", at: "35분 전" },
      { id: "m-log-3", name: "박성훈", department: "책임", role: "작성자", detail: "의견 등록 · 4.1 추진 일정", at: "2시간 전" },
    ],
  },
  {
    id: "edu", name: "지능형 디지털 인재양성 AI 교육 통합 플랫폼 구축", organization: "한국지역정보개발원",
    dueDate: "2026-11-20", budgetEok: 6.2, stage: "active", roles: ["작성자", "리뷰자"], permissions: ["assign"],
    round: 1, writeState: "writing", openCommentCount: 0, reviewCommentCount: 0,
    sections: [
      { id: "s11", no: "1.1", title: "사업 배경 및 목표", state: "done" },
      { id: "s21", no: "2.1", title: "교육과정 체계도", state: "doing" },
      { id: "s22", no: "2.2", title: "모듈별 학습 목표", state: "doing" },
      { id: "s31", no: "3.1", title: "지역 거점 교육 운영", state: "doing" },
      { id: "s32", no: "3.2", title: "온라인 학습 플랫폼", state: "doing" },
      { id: "s41", no: "4.1", title: "3단계 성과 평가", state: "doing" },
    ],
    versions: [],
    members: [
      { id: "minsu", name: "김민수", department: "수석", isPm: true, permissions: allPermissions },
      { id: "sodam", name: "정소담", department: "수석", isPm: false, permissions: ["assign"] },
    ],
    notifications,
    logs: [{ id: "e-log-1", name: "시스템", department: "-", role: "-", detail: "프로젝트 초기 등록", at: "2026.10.01" }],
  },
];

export function getProjectHeaderData(id: string): ProjectHeaderData {
  return PROJECT_HEADER_PROJECTS.find(project => project.id === id) ?? PROJECT_HEADER_PROJECTS[0];
}

export function isProjectPm(project: ProjectHeaderData): boolean {
  return project.roles.includes("PM");
}

export function canProjectAction(project: ProjectHeaderData, permission: ProjectPermission): boolean {
  return isProjectPm(project) || project.permissions.includes(permission);
}

export function getProjectHeaderView(project: ProjectHeaderData): ProjectHeaderView {
  const showRound = project.stage !== "review";
  const doneCount = project.sections.filter(section => section.state === "done").length;
  const roles: readonly ProjectRole[] = ["PM", "작성자", "리뷰자"];
  return {
    isPm: isProjectPm(project),
    roleLabel: roles.filter(role => project.roles.includes(role)).join(" · ") || (project.stage === "review" ? "검토자" : "참여자"),
    roundLabel: `${project.round}차 ${project.writeState === "done" ? "완성" : project.round === 1 ? "작성 중" : "재작업 중"}`,
    showRound,
    showRedo: showRound && canProjectAction(project, "redo"),
    showHistory: showRound && project.versions.length > 0,
    showComplete: showRound && canProjectAction(project, "done"),
    completeDisabled: project.writeState === "done",
    doneCount, doingCount: project.sections.length - doneCount, historyCount: project.versions.length,
  };
}
