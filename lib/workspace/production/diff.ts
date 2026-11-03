import type {
  ContentBlock,
  ImportMapping,
  PptVersion,
  ProjectView,
  ProposalItem,
  WorkspaceProposal,
} from "@/types/workspace-production";
import { slidePinIds } from "./clipboard";
export function pinsAvailable(
  view: ProjectView,
  ids: readonly string[],
): boolean {
  return ids.every(
    (id) =>
      view.assetAccess.find((a) => a.pinId === id)?.access.status ===
      "available",
  );
}
export interface DiffLine {
  index: number;
  before: string | null;
  after: string | null;
  changed: boolean;
}
export function contentText(value: string | ContentBlock): string {
  if (typeof value === "string") return value;
  if (value.kind === "text") return value.text;
  if (value.kind === "list") return value.items.join("\n");
  if (value.kind === "image") return value.alt;
  return [value.columns, ...value.rows]
    .map((row) => row.map((cell) => JSON.stringify(cell)).join(" | "))
    .join("\n");
}
export function diffLines(before: string, after: string): DiffLine[] {
  const a = before.split("\n"),
    b = after.split("\n");
  return Array.from({ length: Math.max(a.length, b.length) }, (_, index) => ({
    index,
    before: a[index] ?? null,
    after: b[index] ?? null,
    changed: a[index] !== b[index],
  }));
}
export function proposalItemAllowed(
  view: ProjectView,
  proposal: WorkspaceProposal,
  item: ProposalItem,
): boolean {
  if (
    view.state.phase !== "writing" ||
    view.state.currentRound !== proposal.round
  )
    return false;
  const affected = view.state.body.slides.filter((s) =>
    item.affectedSectionIds.includes(s.sectionId),
  );
  if (!pinsAvailable(view, slidePinIds(affected))) return false;
  if (
    proposal.kind === "recommend-toc" ||
    proposal.kind === "edit-toc" ||
    proposal.kind === "check"
  )
    return (
      view.capabilities.actions.outline &&
      item.affectedSectionIds.every(
        (id) => !view.state.body.sections.find((s) => s.id === id)?.locked,
      )
    );
  return (
    item.affectedSectionIds.every((id) =>
      view.capabilities.editableSectionIds.includes(id),
    ) && item.affectedSectionIds.length > 0
  );
}
export function versionPage(versions: readonly PptVersion[], page: number) {
  const sorted = [...versions].sort((a, b) => b.index - a.index),
    current = Math.min(
      Math.max(1, page),
      Math.max(1, Math.ceil(sorted.length / 10)),
    );
  return {
    rows: sorted.slice((current - 1) * 10, current * 10),
    page: current,
    total: sorted.length,
  };
}
export function versionHasLaterChanges(version: PptVersion, view: ProjectView) {
  const input = version.snapshotId
    ? view.state.snapshots.find((s) => s.id === version.snapshotId)
        ?.inputRevision
    : version.round === view.state.currentRound
      ? view.state.inputRevision
      : view.state.snapshots.find((s) => s.round === version.round)
          ?.inputRevision;
  return input !== undefined && input > version.inputRevision;
}
export function mappingConflict(mapping: readonly ImportMapping[]): boolean {
  return (
    new Set(mapping.map((m) => m.externalPath + "|" + m.externalShapeId))
      .size !== mapping.length ||
    new Set(mapping.map((m) => m.slideId + "|" + m.key)).size !== mapping.length
  );
}
