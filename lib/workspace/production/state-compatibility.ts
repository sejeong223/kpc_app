import { z } from "zod";
import type { LegacyProjectWorkspaceState, LegacyRoundBody, ProjectWorkspaceState, RoundBody } from "@/types/workspace-production";
import { emptyCanvasComments } from "./canvas-schemas";
import { LegacyWorkspaceStateSchema, WorkspaceStateSchema } from "./schemas";
export function upgradeWorkspaceState(source: LegacyProjectWorkspaceState): ProjectWorkspaceState {
    const state = structuredClone(source);
    const body = (value: LegacyRoundBody): RoundBody => ({ ...value, canvasComments: emptyCanvasComments() });
    return { ...state, schemaVersion: 2, body: body(state.body),
        snapshots: state.snapshots.map(s => ({ ...s, body: body(s.body) })),
        undo: state.undo ? { ...state.undo, previousBody: body(state.undo.previousBody) } : null };
}
// 버전별 엄격한 검증 후에만 변환한다. 손상된 v2를 빈 v1로 복구하지 않는다.
// 기본값이 있는 필드의 입력(누락 가능)과 정규화된 출력 타입을 분리한다.
export const StoredWorkspaceStateSchema = z.union([
    LegacyWorkspaceStateSchema.transform(upgradeWorkspaceState), WorkspaceStateSchema,
]).pipe(z.preprocess(value => value, WorkspaceStateSchema));
