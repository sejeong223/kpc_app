"use client";
import { DadamSelect } from "@/components/ui/DadamControls";
import type { ProjectWorkspaceState } from "@/types/workspace-production";
export function projectHistoryOptions(state: ProjectWorkspaceState) {
  return [
    {
      id: "",
      label:
        state.currentRound +
        "회차 현재 " +
        (state.phase === "completed" ? "완성 · 리뷰" : "작업"),
    },
    ...[...state.snapshots]
      .reverse()
      .map((s) => ({
        id: s.id,
        label:
          s.round +
          "회차 " +
          (s.kind === "complete" ? "완성본" : "미완성 이력"),
      })),
  ];
}
export default function ProjectHistorySelector({
  state,
  snapshotId,
  onSelect,
}: {
  state: ProjectWorkspaceState;
  snapshotId: string | null;
  onSelect(id: string | null): void;
}) {
  return (
    <DadamSelect
      aria-label="프로젝트 회차 이력"
      value={snapshotId ?? ""}
      onChange={(_, d) => onSelect(d.value || null)}
    >
      {projectHistoryOptions(state).map((o) => (
        <option key={o.id} value={o.id}>
          {o.label}
        </option>
      ))}
    </DadamSelect>
  );
}
