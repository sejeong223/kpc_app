import { z } from "zod";
import type { LegacyProjectWorkspaceState, LegacyRoundBody, V2ProjectWorkspaceState, V2RoundBody, ProjectWorkspaceState, RoundBody } from "@/types/workspace-production";
import { emptyCanvasComments } from "./canvas-schemas";
import { LegacyWorkspaceStateSchema, V2WorkspaceStateSchema, WorkspaceStateSchema } from "./schemas";
import { normalizeWorkspaceCompletion, syncSectionCompletion } from "./section-locks";
export function upgradeWorkspaceState(source: LegacyProjectWorkspaceState | V2ProjectWorkspaceState): ProjectWorkspaceState {
    const state = structuredClone(source);
    const body = (value: LegacyRoundBody | V2RoundBody): RoundBody => syncSectionCompletion({
      ...value,
      canvasComments: "canvasComments" in value ? value.canvasComments : emptyCanvasComments(),
      slides: value.slides.map(slide => ({
        ...slide, state: value.sections.find(section => section.id === slide.sectionId)!.state,
      })),
    });
    return { ...state, schemaVersion: 3, body: body(state.body),
        snapshots: state.snapshots.map(s => ({ ...s, body: body(s.body) })),
        undo: state.undo ? { ...state.undo, previousBody: body(state.undo.previousBody) } : null };
}
// 버전별 엄격한 검증 후에만 변환한다. 손상된 현재 저장본을 기본값으로 덮지 않는다.
// 기본값이 있는 필드의 입력(누락 가능)과 정규화된 출력 타입을 분리한다.
export const StoredWorkspaceStateSchema = z.union([
    LegacyWorkspaceStateSchema.transform(upgradeWorkspaceState),
    V2WorkspaceStateSchema.transform(upgradeWorkspaceState), WorkspaceStateSchema,
]).pipe(z.preprocess(value => value, WorkspaceStateSchema)).transform(normalizeWorkspaceCompletion);
