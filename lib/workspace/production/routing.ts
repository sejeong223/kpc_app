import { z } from "zod";
import { MFG_DEMO_PROJECT_ID } from "@/config/production-mfg-demo";
import type {
  ProjectView,
  WorkspaceSelection,
} from "@/types/workspace-production";
import { workspaceAssert as check } from "./errors";
const id = z
  .string()
  .min(1)
  .max(400)
  .refine((value) => !/[\u0000-\u0020\u007f]/.test(value));
export function parseWorkspaceSelection(
  params: URLSearchParams,
): WorkspaceSelection {
  const read = (key: string) => {
    const values = params.getAll(key);
    check(values.length <= 1, "VALIDATION", "중복된 이동 정보입니다: " + key);
    if (!values.length) return null;
    const parsed = id.safeParse(values[0]);
    check(parsed.success, "VALIDATION", "이동 정보를 확인해 주세요: " + key);
    return parsed.data;
  };
  const value = {
    projectId: read("project"),
    sectionId: read("section"),
    slideId: read("slide"),
    snapshotId: read("snapshot"),
  };
  check(
    !!value.projectId ||
      (!value.sectionId && !value.slideId && !value.snapshotId),
    "VALIDATION",
    "목차와 이력을 조회할 프로젝트가 필요합니다.",
  );
  return value;
}
export type WorkspaceScreenId="analysis"|"files"|"toc"|"setup"|"write"|"review";
export function isWorkspaceScreenId(value:string):value is WorkspaceScreenId {
  return ["analysis","files","toc","setup","write","review"].includes(value);
}
export function workspaceHref(
  screen: WorkspaceScreenId,
  selection: WorkspaceSelection,
): string {
  const params = new URLSearchParams();
  for (const [key, value] of [
    ["project", selection.projectId],
    ["section", selection.sectionId],
    ["slide", selection.slideId],
    ["snapshot", selection.snapshotId],
  ])
    if (value !== null) params.set(key!, value!);
  const query = params.toString();
  return "/workspace/" + screen + (query ? "?" + query : "");
}
export function resolveWorkspaceSelection(
  selection: WorkspaceSelection,
  view: ProjectView,
): { selection: WorkspaceSelection; notice: string | null } {
  check(
    selection.projectId === view.project.id,
    "FORBIDDEN",
    "다른 프로젝트의 이동 정보입니다.",
  );
  const snapshot =
    selection.snapshotId === null
      ? null
      : view.state.snapshots.find((s) => s.id === selection.snapshotId);
  check(
    selection.snapshotId === null || !!snapshot,
    "NOT_FOUND",
    "이 프로젝트의 보관본을 찾을 수 없습니다.",
  );
  const body = snapshot?.body ?? view.state.body,
    requestedSlide = body.slides.find((s) => s.id === selection.slideId),
    section =
      body.sections.find((s) => s.id === selection.sectionId) ??
      (selection.sectionId === null
        ? body.sections.find((s) => s.id === requestedSlide?.sectionId)
        : undefined) ??
      (view.project.id === MFG_DEMO_PROJECT_ID && !selection.sectionId && !selection.slideId
        ? body.sections.find(s => s.id === "s31") : undefined) ?? body.sections[0];
  const slide =
      requestedSlide?.sectionId === section?.id
        ? requestedSlide
        : body.slides.find((s) => s.sectionId === section?.id),
    next = {
      ...selection,
      sectionId: section?.id ?? null,
      slideId: slide?.id ?? null,
    };
  const corrected =
    (!!selection.sectionId && next.sectionId !== selection.sectionId) ||
    (!!selection.slideId && next.slideId !== selection.slideId);
  return {
    selection: next,
    notice: corrected
      ? "선택한 목차 또는 슬라이드가 없어 프로젝트 내 첫 항목으로 이동했습니다."
      : null,
  };
}
