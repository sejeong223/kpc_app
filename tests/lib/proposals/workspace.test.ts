import { describe, expect, it } from "vitest";

import {
  canOpenProposalStep,
  createInitialProposalWorkspaceState,
  createSourceProposalWorkspaceState,
  filterProposalProjects,
  groupProjectsByStage,
  getSelectedProposalDocuments,
  getSelectedProposalRequirements,
  getSelectedProposalSections,
  getFilesForSourceProject,
  proposalWorkspaceReducer,
  sourceProposalWorkspaceReducer,
} from "@/lib/proposals/workspace";
import { INITIAL_KPC_CHECKLIST, INITIAL_PROPOSAL_SECTIONS } from "@/data/proposals/authoring";
import { SAMPLE_LIBRARY_ITEMS } from "@/data/proposals/library";
import { INITIAL_RFPS, SAMPLE_PROJECTS } from "@/data/proposals/projects";
import { SAMPLE_TASKS } from "@/data/proposals/tasks";
import { calculateProposalReviewSummary } from "@/lib/proposals/review";
import type { ProposalDocument, ProposalProject } from "@/types/proposals";

describe("proposal workspace state", () => {
  it("creates independent state including nested fixture arrays", () => {
    const first = createInitialProposalWorkspaceState();
    const second = createInitialProposalWorkspaceState();

    first.projects[0].teamMembers.push("추가 구성원");
    first.sections[0].requirementIds.push("extra-requirement");
    first.libraryItems[0].tags.push("추가 태그");

    expect(second.projects[0].teamMembers).not.toContain("추가 구성원");
    expect(second.sections[0].requirementIds).not.toContain("extra-requirement");
    expect(second.libraryItems[0].tags).not.toContain("추가 태그");
  });

  it("filters projects by department and normalized search query", () => {
    const initial = createInitialProposalWorkspaceState();
    const byDepartment = proposalWorkspaceReducer(initial, {
      type: "set-department",
      department: "AI사업본부",
    });
    const bySearch = proposalWorkspaceReducer(byDepartment, {
      type: "set-search-query",
      query: "  enterprise  ",
    });

    expect(filterProposalProjects(bySearch).map((project) => project.id)).toEqual([
      "project-enterprise-ai",
    ]);
  });

  it("groups filtered projects into all four pipeline stages", () => {
    const initial = createInitialProposalWorkspaceState();
    const groups = groupProjectsByStage(filterProposalProjects(initial));

    expect(Object.keys(groups)).toEqual(["검토 대기", "검토 중", "진행", "진행 안 함"]);
    expect(groups["검토 대기"]).toHaveLength(2);
    expect(groups["검토 중"]).toHaveLength(1);
    expect(groups["진행"]).toHaveLength(2);
    expect(groups["진행 안 함"]).toHaveLength(1);
  });

  it("moves a project to another pipeline group through the reducer", () => {
    const initial = createInitialProposalWorkspaceState();
    const moved = proposalWorkspaceReducer(initial, {
      type: "update-stage",
      projectId: "project-ai-academy",
      stage: "검토 중",
    });
    const groups = groupProjectsByStage(moved.projects);

    expect(groups["검토 대기"].map((project) => project.id)).not.toContain(
      "project-ai-academy",
    );
    expect(groups["검토 중"].map((project) => project.id)).toContain(
      "project-ai-academy",
    );
    expect(initial.projects.find((project) => project.id === "project-ai-academy")?.stage).toBe(
      "검토 대기",
    );
  });

  it("adds a project and its documents without mutating the source state", () => {
    const initial = createInitialProposalWorkspaceState();
    const project: ProposalProject = {
      ...initial.projects[0],
      id: "project-new",
      title: "신규 제안",
      teamMembers: ["담당자"],
    };
    const document: ProposalDocument = {
      id: "document-new",
      projectId: project.id,
      name: "신규_RFP.pdf",
      kind: "RFP",
      size: "1.0 MB",
      status: "업로드 완료",
      isPrimary: true,
    };

    const next = proposalWorkspaceReducer(initial, {
      type: "add-project",
      project,
      documents: [document],
    });

    expect(next.projects).toHaveLength(initial.projects.length + 1);
    expect(next.documents).toHaveLength(initial.documents.length + 1);
    expect(next.selectedProjectId).toBe(project.id);
    expect(initial.projects.find((item) => item.id === project.id)).toBeUndefined();
  });

  it("registers, reviews, approves, and opens a project setup lifecycle", () => {
    const initial = createInitialProposalWorkspaceState();
    const project: ProposalProject = {
      ...initial.projects[0],
      id: "project-lifecycle",
      title: "검토 lifecycle 제안",
      stage: "검토 대기",
      activeStep: "setup",
      analysisStatus: "분석 전",
    };
    const document: ProposalDocument = {
      id: "document-lifecycle",
      projectId: project.id,
      name: "lifecycle-rfp.pdf",
      kind: "RFP",
      size: "2.0 MB",
      status: "업로드 완료",
      isPrimary: true,
    };

    const registered = proposalWorkspaceReducer(initial, {
      type: "add-project",
      project,
      documents: [document],
    });
    const reviewing = proposalWorkspaceReducer(registered, {
      type: "update-stage",
      projectId: project.id,
      stage: "검토 중",
    });
    const approved = proposalWorkspaceReducer(reviewing, {
      type: "update-stage",
      projectId: project.id,
      stage: "진행",
    });
    const opened = proposalWorkspaceReducer(approved, {
      type: "navigate",
      view: "workspace",
      step: "setup",
    });

    expect(registered.projects.at(-1)?.stage).toBe("검토 대기");
    expect(getSelectedProposalDocuments(registered)).toEqual([document]);
    expect(reviewing.projects.at(-1)?.stage).toBe("검토 중");
    expect(approved.projects.at(-1)?.stage).toBe("진행");
    expect(opened).toMatchObject({ view: "workspace", activeStep: "setup" });
  });

  it("updates setup documents, writing mode, and analysis status immutably", () => {
    const initial = createInitialProposalWorkspaceState();
    const document: ProposalDocument = {
      id: "document-reference",
      projectId: "project-enterprise-ai",
      name: "reference.docx",
      kind: "참고자료",
      size: "500 KB",
      status: "업로드 완료",
      isPrimary: false,
    };
    const withDocument = proposalWorkspaceReducer(initial, {
      type: "add-document",
      document,
    });
    const withMode = proposalWorkspaceReducer(withDocument, {
      type: "set-workflow-mode",
      projectId: "project-enterprise-ai",
      mode: "qa",
    });
    const analyzing = proposalWorkspaceReducer(withMode, {
      type: "set-analysis-status",
      projectId: "project-enterprise-ai",
      status: "분석 중",
    });
    const completed = proposalWorkspaceReducer(analyzing, {
      type: "set-analysis-status",
      projectId: "project-enterprise-ai",
      status: "분석 완료",
    });
    const removed = proposalWorkspaceReducer(completed, {
      type: "remove-document",
      documentId: document.id,
    });

    expect(getSelectedProposalDocuments(withDocument)).toContainEqual(document);
    expect(withMode.projects.find((project) => project.id === "project-enterprise-ai")?.workflowMode).toBe("qa");
    expect(analyzing.projects.find((project) => project.id === "project-enterprise-ai")?.analysisStatus).toBe("분석 중");
    expect(completed.projects.find((project) => project.id === "project-enterprise-ai")?.analysisStatus).toBe("분석 완료");
    expect(getSelectedProposalDocuments(removed)).not.toContainEqual(document);
    expect(initial.documents).not.toContainEqual(document);
  });

  it("approves and rejects a project while keeping previous state immutable", () => {
    const initial = createInitialProposalWorkspaceState();
    const projectId = "project-smart-factory";
    const approved = proposalWorkspaceReducer(initial, {
      type: "update-stage",
      projectId,
      stage: "진행",
    });
    const rejected = proposalWorkspaceReducer(approved, {
      type: "update-stage",
      projectId,
      stage: "진행 안 함",
      rejectionReason: "전문 인력 일정이 맞지 않음",
    });

    expect(initial.projects.find((project) => project.id === projectId)?.stage).toBe(
      "검토 중",
    );
    expect(approved.projects.find((project) => project.id === projectId)?.stage).toBe(
      "진행",
    );
    expect(rejected.projects.find((project) => project.id === projectId)).toMatchObject({
      stage: "진행 안 함",
      rejectionReason: "전문 인력 일정이 맞지 않음",
    });
  });

  it("guards workspace entry and post-analysis steps", () => {
    const initial = createInitialProposalWorkspaceState();
    const pendingProject = initial.projects.find(
      (project) => project.id === "project-smart-factory",
    );
    const activeProject = initial.projects.find(
      (project) => project.id === "project-enterprise-ai",
    );

    expect(pendingProject).toBeDefined();
    expect(activeProject).toBeDefined();
    expect(canOpenProposalStep(pendingProject!, "setup")).toBe(false);
    expect(canOpenProposalStep(activeProject!, "review")).toBe(true);

    const analysisPendingProject = { ...activeProject!, analysisStatus: "분석 전" as const };
    expect(canOpenProposalStep(analysisPendingProject, "setup")).toBe(true);
    expect(canOpenProposalStep(analysisPendingProject, "analysis")).toBe(false);
    expect(canOpenProposalStep(analysisPendingProject, "requirements")).toBe(false);

    const selectedPending = proposalWorkspaceReducer(initial, {
      type: "select-project",
      projectId: pendingProject!.id,
    });
    expect(
      proposalWorkspaceReducer(selectedPending, {
        type: "navigate",
        view: "workspace",
        step: "analysis",
      }),
    ).toBe(selectedPending);

    const selectedAnalyzing = proposalWorkspaceReducer(initial, {
      type: "select-project",
      projectId: "project-cx-platform",
    });
    expect(
      proposalWorkspaceReducer(selectedAnalyzing, {
        type: "navigate",
        view: "workspace",
        step: "requirements",
      }),
    ).toBe(selectedAnalyzing);
  });

  it("does not change state for an unknown project selection", () => {
    const initial = createInitialProposalWorkspaceState();

    expect(
      proposalWorkspaceReducer(initial, {
        type: "select-project",
        projectId: "missing-project",
      }),
    ).toBe(initial);
  });

  it("toggles a requirement and partially updates a section immutably", () => {
    const initial = createInitialProposalWorkspaceState();
    const toggled = proposalWorkspaceReducer(initial, {
      type: "toggle-requirement",
      requirementId: "requirement-security",
    });
    const updated = proposalWorkspaceReducer(toggled, {
      type: "update-section",
      sectionId: "section-strategy",
      changes: {
        status: "검토 요청",
        assignee: "정소담",
        reviewer: "서은채",
        dueDate: "2026-09-30",
      },
    });
    const selected = proposalWorkspaceReducer(updated, {
      type: "select-section",
      sectionId: "section-strategy",
    });
    const opened = proposalWorkspaceReducer(selected, {
      type: "navigate",
      view: "workspace",
      step: "editor",
    });

    expect(
      initial.requirements.find((item) => item.id === "requirement-security")?.checked,
    ).toBe(false);
    expect(
      toggled.requirements.find((item) => item.id === "requirement-security")?.checked,
    ).toBe(true);
    expect(
      toggled.requirements.find((item) => item.id === "requirement-security")?.status,
    ).toBe("반영");
    expect(updated.sections.find((item) => item.id === "section-strategy")).toMatchObject({
      status: "검토 요청",
      assignee: "정소담",
      reviewer: "서은채",
      dueDate: "2026-09-30",
    });
    expect(opened).toMatchObject({
      selectedSectionId: "section-strategy",
      activeStep: "editor",
      taskManagementOpen: false,
    });
    expect(initial.sections.find((item) => item.id === "section-strategy")?.status).toBe(
      "작성 중",
    );
  });

  it("adds and deletes requirements and opens section task management", () => {
    const initial = createInitialProposalWorkspaceState();
    const requirement = {
      ...initial.requirements[0],
      id: "requirement-new",
      title: "신규 추적 요구사항",
    };
    const added = proposalWorkspaceReducer(initial, {
      type: "add-requirement",
      requirement,
    });
    const deleted = proposalWorkspaceReducer(added, {
      type: "delete-requirement",
      requirementId: requirement.id,
    });
    const taskManagement = proposalWorkspaceReducer(initial, {
      type: "open-task-management",
    });

    expect(getSelectedProposalRequirements(added)).toContainEqual(requirement);
    expect(getSelectedProposalRequirements(deleted)).not.toContainEqual(requirement);
    expect(getSelectedProposalSections(initial)).toHaveLength(3);
    expect(taskManagement).toMatchObject({
      view: "workspace",
      taskManagementOpen: true,
    });
  });

  it("imports a library item into the selected project only once", () => {
    const initial = createInitialProposalWorkspaceState();
    const item = initial.libraryItems[0];
    const imported = proposalWorkspaceReducer(initial, {
      type: "import-library-item",
      item,
      projectId: initial.selectedProjectId,
    });
    const duplicated = proposalWorkspaceReducer(imported, {
      type: "import-library-item",
      item,
      projectId: initial.selectedProjectId,
    });

    expect(getSelectedProposalDocuments(imported).at(-1)).toMatchObject({
      name: `${item.title}.${item.fileFormat.toLocaleLowerCase("en-US")}`,
      kind: "참고자료",
      isPrimary: false,
    });
    expect(duplicated).toBe(imported);
  });

  it("runs the complete pipeline-to-review reducer lifecycle", () => {
    let state = createInitialProposalWorkspaceState();
    state = proposalWorkspaceReducer(state, {
      type: "update-stage",
      projectId: "project-enterprise-ai",
      stage: "검토 대기",
    });
    state = proposalWorkspaceReducer(state, {
      type: "select-project",
      projectId: "project-enterprise-ai",
    });
    state = proposalWorkspaceReducer(state, { type: "navigate", view: "project-review" });
    state = proposalWorkspaceReducer(state, {
      type: "update-stage",
      projectId: "project-enterprise-ai",
      stage: "검토 중",
    });
    state = proposalWorkspaceReducer(state, {
      type: "update-stage",
      projectId: "project-enterprise-ai",
      stage: "진행",
    });
    state = proposalWorkspaceReducer(state, {
      type: "navigate",
      view: "workspace",
      step: "setup",
    });
    state = proposalWorkspaceReducer(state, {
      type: "set-analysis-status",
      projectId: "project-enterprise-ai",
      status: "분석 완료",
    });
    state = proposalWorkspaceReducer(state, {
      type: "toggle-requirement",
      requirementId: "requirement-security",
    });
    state = proposalWorkspaceReducer(state, {
      type: "update-section",
      sectionId: "section-strategy",
      changes: { status: "완료", content: "검토가 완료된 제안 본문입니다." },
    });
    state = proposalWorkspaceReducer(state, {
      type: "navigate",
      view: "workspace",
      step: "review",
    });

    const summary = calculateProposalReviewSummary(
      getSelectedProposalSections(state),
      getSelectedProposalRequirements(state),
    );
    expect(state).toMatchObject({ view: "workspace", activeStep: "review" });
    expect(summary.completedSections).toBe(1);
    expect(summary.coveredRequirements).toBe(2);
  });
});

describe("source-equivalent proposal workspace state", () => {
  it("keeps the source pipeline stage counts and department filtering contract", () => {
    const initial = createSourceProposalWorkspaceState();
    const counts = Object.fromEntries(
      ["검토 대기", "검토 중", "진행", "진행 안 함"].map((stage) => [
        stage,
        initial.rfpList.filter((rfp) => rfp.stage === stage).length,
      ]),
    );
    const filtered = initial.rfpList.filter(
      (rfp) => rfp.department === "AI산업본부",
    );

    expect(counts).toEqual({
      "검토 대기": 3,
      "검토 중": 3,
      진행: 3,
      "진행 안 함": 1,
    });
    expect(filtered.map((rfp) => rfp.id)).toEqual(["rfp-001", "rfp-008", "rfp-009"]);
  });

  it("keeps the source fixture counts, order, and representative values", () => {
    expect(INITIAL_RFPS).toHaveLength(10);
    expect(SAMPLE_PROJECTS).toHaveLength(10);
    expect(SAMPLE_TASKS).toHaveLength(5);
    expect(SAMPLE_LIBRARY_ITEMS).toHaveLength(6);
    expect(INITIAL_KPC_CHECKLIST).toHaveLength(15);
    expect(INITIAL_PROPOSAL_SECTIONS).toHaveLength(10);

    expect(INITIAL_RFPS[0]).toMatchObject({
      id: "rfp-001",
      title: "공공기관 생성형 AI 업무혁신 플랫폼 구축",
      agency: "한국산업진흥원",
      budget: 1_200_000_000,
      deadline: "2026.10.15",
      pwin: 76,
      assignee: "정소담",
    });
    expect(SAMPLE_PROJECTS[2]).toMatchObject({
      id: "proj-3",
      stage: "진행",
      rfpId: "rfp-003",
      manager: "이서연",
    });
  });

  it("creates independent controller state with the source defaults", () => {
    const first = createSourceProposalWorkspaceState();
    const second = createSourceProposalWorkspaceState();

    expect(first).toMatchObject({
      activeProposalLnb: "pipeline",
      selectedDepartment: "전체",
      activeProject: { id: "proj-3" },
      selectedReviewProject: { id: "proj-1" },
      rfpToConvert: { id: "rfp-001" },
      convertModalOpen: false,
      toastMessage: null,
    });
    expect(first.projectFilesMap["proj-1"]).toHaveLength(8);

    first.projects[0].teamMembers.push("추가 구성원");
    first.checklistRequirements[0].checked = false;
    expect(second.projects[0].teamMembers).not.toContain("추가 구성원");
    expect(second.checklistRequirements[0].checked).toBe(true);
  });

  it("returns the saved project files or the source default RFP bundle", () => {
    const state = createSourceProposalWorkspaceState();

    expect(getFilesForSourceProject(state, state.projects[0])).toHaveLength(8);
    const generated = getFilesForSourceProject(state, state.projects[1]);
    expect(generated).toHaveLength(8);
    expect(generated[0]).toMatchObject({
      id: "rfp-proj-2",
      category: "RFP 문서",
      status: "분석 준비 완료",
    });
    expect(getFilesForSourceProject(state, null)).toEqual([]);
  });

  it("runs registration, review, stage, analysis, checklist, and section transitions", () => {
    const initial = createSourceProposalWorkspaceState();
    const project = {
      ...initial.projects[0],
      id: "proj-source-new",
      rfpId: "rfp-source-new",
      title: "신규 원본 계약 프로젝트",
      stage: "검토 대기" as const,
      status: "검토 대기",
    };
    const registered = sourceProposalWorkspaceReducer(initial, {
      type: "register-project",
      project,
      startReview: true,
    });
    const approved = sourceProposalWorkspaceReducer(registered, {
      type: "update-project-stage",
      projectId: project.id,
      stage: "진행",
    });
    const opened = sourceProposalWorkspaceReducer(approved, {
      type: "start-proposal",
      project: approved.projects[0],
    });
    const analyzing = sourceProposalWorkspaceReducer(opened, {
      type: "start-analysis",
      projectId: project.id,
    });
    const analyzed = sourceProposalWorkspaceReducer(analyzing, {
      type: "complete-analysis",
      projectId: project.id,
    });
    const requirement = {
      ...analyzed.checklistRequirements[0],
      checked: !analyzed.checklistRequirements[0].checked,
    };
    const withRequirement = sourceProposalWorkspaceReducer(analyzed, {
      type: "update-checklist",
      requirement,
    });
    const section = {
      ...withRequirement.proposalSections[0],
      status: "검토 중" as const,
    };
    const withSection = sourceProposalWorkspaceReducer(withRequirement, {
      type: "update-section",
      section,
    });

    expect(registered).toMatchObject({
      activeProposalLnb: "project_review",
      selectedReviewProject: { id: project.id },
    });
    expect(registered.rfpList[0]).toMatchObject({
      id: project.rfpId,
      source: "직접 등록",
      stage: "검토 대기",
    });
    expect(approved.projects[0].stage).toBe("진행");
    expect(opened).toMatchObject({ activeProject: { id: project.id }, activeProposalLnb: "rfp_upload" });
    expect(analyzing.projects[0].analysisStatus).toBe("분석 중");
    expect(analyzed.projects[0].analysisStatus).toBe("분석 완료");
    expect(withRequirement.checklistRequirements[0]).toEqual(requirement);
    expect(withSection.proposalSections[0]).toEqual(section);
    expect(initial.projects.find((item) => item.id === project.id)).toBeUndefined();
  });
});
