import { describe, expect, it } from "vitest";

import {
  canOpenProposalStep,
  createInitialProposalWorkspaceState,
  filterProposalProjects,
  groupProjectsByStage,
  getSelectedProposalDocuments,
  proposalWorkspaceReducer,
} from "@/lib/proposals/workspace";
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
      changes: { status: "검토 요청", reviewer: "서은채" },
    });

    expect(
      initial.requirements.find((item) => item.id === "requirement-security")?.checked,
    ).toBe(false);
    expect(
      toggled.requirements.find((item) => item.id === "requirement-security")?.checked,
    ).toBe(true);
    expect(updated.sections.find((item) => item.id === "section-strategy")).toMatchObject({
      status: "검토 요청",
      reviewer: "서은채",
    });
    expect(initial.sections.find((item) => item.id === "section-strategy")?.status).toBe(
      "작성 중",
    );
  });
});
