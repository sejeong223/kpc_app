import { describe, expect, it } from "vitest";

import {
  INITIAL_KPC_CHECKLIST,
  INITIAL_PROPOSAL_SECTIONS,
} from "@/data/proposals/authoring";
import { SAMPLE_LIBRARY_ITEMS } from "@/data/proposals/library";
import { INITIAL_RFPS, SAMPLE_PROJECTS } from "@/data/proposals/projects";
import { SAMPLE_TASKS } from "@/data/proposals/tasks";
import {
  createSourceProposalWorkspaceState,
  getFilesForSourceProject,
  sourceProposalWorkspaceReducer,
} from "@/lib/proposals/workspace";

describe("source-equivalent proposal workspace state", () => {
  it("keeps the source pipeline stage counts and department filtering contract", () => {
    const initial = createSourceProposalWorkspaceState();
    const counts = Object.fromEntries(
      ["검토 대기", "검토 중", "진행", "진행 안 함"].map((stage) => [
        stage,
        initial.rfpList.filter((rfp) => rfp.stage === stage).length,
      ]),
    );

    expect(counts).toEqual({
      "검토 대기": 3,
      "검토 중": 3,
      진행: 3,
      "진행 안 함": 1,
    });
    expect(
      initial.rfpList
        .filter((rfp) => rfp.department === "AI산업본부")
        .map((rfp) => rfp.id),
    ).toEqual(["rfp-001", "rfp-008", "rfp-009"]);
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

  it("returns saved project files or the source default RFP bundle", () => {
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

  it("runs registration, approval, analysis, checklist, and section transitions", () => {
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
    expect(opened).toMatchObject({
      activeProject: { id: project.id },
      activeProposalLnb: "rfp_upload",
    });
    expect(analyzing.projects[0].analysisStatus).toBe("분석 중");
    expect(analyzed.projects[0].analysisStatus).toBe("분석 완료");
    expect(withRequirement.checklistRequirements[0]).toEqual(requirement);
    expect(withSection.proposalSections[0]).toEqual(section);
    expect(initial.projects.find((item) => item.id === project.id)).toBeUndefined();
  });

  it("keeps navigation, editor selection, file updates, and toast state isolated", () => {
    const initial = createSourceProposalWorkspaceState();
    const navigated = sourceProposalWorkspaceReducer(initial, {
      type: "select-department",
      department: "교육사업본부",
    });
    const edited = sourceProposalWorkspaceReducer(navigated, {
      type: "open-editor-section",
      sectionId: "section-3-1",
    });
    const file = { ...initial.projectFilesMap["proj-1"][0], id: "replacement" };
    const withFiles = sourceProposalWorkspaceReducer(edited, {
      type: "set-project-files",
      projectId: "proj-1",
      files: [file],
    });
    const closed = sourceProposalWorkspaceReducer(
      sourceProposalWorkspaceReducer(withFiles, {
        type: "show-toast",
        message: "저장 완료",
      }),
      { type: "close-toast" },
    );

    expect(navigated).toMatchObject({
      selectedDepartment: "교육사업본부",
      activeProposalLnb: "pipeline",
    });
    expect(edited).toMatchObject({
      activeProposalLnb: "editor",
      selectedEditorSectionId: "section-3-1",
    });
    expect(withFiles.projectFilesMap["proj-1"]).toEqual([file]);
    expect(closed.toastMessage).toBeNull();
    expect(initial.projectFilesMap["proj-1"][0].id).not.toBe("replacement");
  });
});
