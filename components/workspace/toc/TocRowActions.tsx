"use client";
import { DadamButton, DadamSelect } from "@/components/ui/DadamControls";
import type { TocRow } from "@/lib/workspace/production/selectors";
import type { Chapter, WorkspaceOperation } from "@/types/workspace-production";
export interface TocRowActionProps {
  row: TocRow;
  chapters: Chapter[];
  previousId: string | null;
  nextBeforeId: string | null;
  first: boolean;
  last: boolean;
  busy: boolean;
  onOperation(op: WorkspaceOperation): void;
  onAdd(position: "before" | "after" | "child"): void;
  onAssign(): void;
  onDelete(): void;
}
export default function TocRowActions({
  row,
  chapters,
  previousId,
  nextBeforeId,
  first,
  last,
  busy,
  onOperation,
  onAdd,
  onAssign,
  onDelete,
}: TocRowActionProps) {
  const move = (beforeId: string | null) =>
    onOperation(
      row.kind === "chapter"
        ? { type: "move-chapter", id: row.id, beforeId }
        : {
            type: "move-section",
            id: row.id,
            chapterId: row.chapterId!,
            beforeId,
          },
    );
  return (
    <div className="tw:flex tw:flex-wrap tw:gap-1">
      {row.canStructure && (
        <>
          <DadamButton
            size="small"
            disabled={busy || first}
            aria-label={row.title + " 위로 이동"}
            onClick={() => move(previousId)}
          >
            ↑
          </DadamButton>
          <DadamButton
            size="small"
            disabled={busy || last}
            aria-label={row.title + " 아래로 이동"}
            onClick={() => move(nextBeforeId)}
          >
            ↓
          </DadamButton>
          <DadamButton
            size="small"
            disabled={busy}
            onClick={() => onAdd("before")}
          >
            위 추가
          </DadamButton>
          <DadamButton
            size="small"
            disabled={busy}
            onClick={() => onAdd("after")}
          >
            아래 추가
          </DadamButton>
          {row.kind === "chapter" ? (
            <DadamButton
              size="small"
              disabled={busy}
              onClick={() => onAdd("child")}
            >
              소목차 추가
            </DadamButton>
          ) : (
            <DadamSelect
              size="small"
              aria-label={row.title + " 대목차 이동"}
              value={row.chapterId!}
              disabled={busy}
              onChange={(_, d) =>
                onOperation({
                  type: "move-section",
                  id: row.id,
                  chapterId: d.value,
                  beforeId: null,
                })
              }
            >
              {chapters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </DadamSelect>
          )}
          <DadamButton size="small" disabled={busy} onClick={onDelete}>
            삭제
          </DadamButton>
        </>
      )}
      {row.locked && (
        <span className="tw:text-(--kpc-muted)">고정된 소목차 포함</span>
      )}
      {row.canAssign && (
        <DadamButton size="small" disabled={busy} onClick={onAssign}>
          담당·리뷰
        </DadamButton>
      )}
      {row.canUnlock && (
        <DadamButton
          size="small"
          disabled={busy}
          onClick={() => onOperation({ type: "unlock-section", id: row.id })}
        >
          고정 해제
        </DadamButton>
      )}
    </div>
  );
}
