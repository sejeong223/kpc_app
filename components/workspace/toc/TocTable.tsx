"use client";
import { useState } from "react";
import {
  DadamButton,
  DadamInput,
  DadamSelect,
} from "@/components/ui/DadamControls";
import type {
  ProjectView,
  WorkspaceOperation,
} from "@/types/workspace-production";
import type { TocRow } from "@/lib/workspace/production/selectors";
import { workspaceTable } from "../shared/WorkspaceUi";
import TocRowActions from "./TocRowActions";
export interface TocTableProps {
  view: ProjectView;
  rows: TocRow[];
  collapsed: string[];
  busy: boolean;
  titleDraft: { id: string; value: string } | null;
  onTitle(value: string): void;
  onRename(row: TocRow): void;
  onSaveTitle(): void;
  onCancelTitle(): void;
  onToggle(id: string): void;
  onOperation(op: WorkspaceOperation): void;
  onAdd(row: TocRow, position: "before" | "after" | "child"): void;
  onAssign(row: TocRow): void;
  onDelete(row: TocRow): void;
  onOpen(row: TocRow): void;
}
export default function TocTable(props: TocTableProps) {
  const { view, rows, collapsed, busy, titleDraft } = props,
    [drag, setDrag] = useState<string | null>(null),
    [drop, setDrop] = useState<string | null>(null),
    names = (ids: string[]) =>
      ids
        .map((id) => view.members.find((m) => m.id === id)?.name ?? "참여자")
        .join(", ");
  return (
    <div className="tw:overflow-x-auto">
      <table className={workspaceTable}>
        <caption className="tw:sr-only">프로젝트 목차</caption>
        <thead>
          <tr>
            {[
              "번호",
              "목차",
              "담당자",
              "리뷰자",
              "상태",
              "슬라이드",
              "RFP 반영",
              "미처리 의견",
              "관리",
            ].map((s) => (
              <th key={s} scope="col">
                {s}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows
            .filter(
              (r) => r.kind === "chapter" || !collapsed.includes(r.chapterId!),
            )
            .map((row) => {
              const siblings = rows.filter(
                  (r) =>
                    r.kind === row.kind &&
                    (row.kind === "chapter" || r.chapterId === row.chapterId),
                ),
                index = siblings.findIndex((r) => r.id === row.id),
                dragRow = rows.find((r) => r.id === drag),
                canDrop =
                  !busy &&
                  row.id !== drag &&
                  dragRow?.canStructure &&
                  (dragRow.kind === "chapter"
                    ? row.kind === "chapter"
                    : row.kind === "section");
              return (
                <tr
                  key={row.id}
                  draggable={row.canStructure && !busy && !titleDraft}
                  onDragStart={(e) => {
                    setDrag(row.id);
                    e.dataTransfer.setData("text/plain", row.id);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onDragEnd={() => {
                    setDrag(null);
                    setDrop(null);
                  }}
                  onDragOver={(e) => {
                    if (canDrop) {
                      e.preventDefault();
                      setDrop(row.id);
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (canDrop && dragRow)
                      props.onOperation(
                        dragRow.kind === "chapter"
                          ? {
                              type: "move-chapter",
                              id: dragRow.id,
                              beforeId: row.id,
                            }
                          : {
                              type: "move-section",
                              id: dragRow.id,
                              chapterId: row.chapterId!,
                              beforeId: row.id,
                            },
                      );
                    setDrag(null);
                    setDrop(null);
                  }}
                  className={
                    (row.kind === "chapter"
                      ? "tw:bg-(--kpc-bg) tw:font-semibold "
                      : "") +
                    (drop === row.id
                      ? "tw:outline-2 tw:outline-(--kpc-brand)"
                      : "")
                  }
                >
                  <td>
                    {row.number}
                    {drop === row.id && (
                      <span role="status">
                        {" "}
                        앞에{" "}
                        {dragRow?.kind === "chapter"
                          ? "대목차 묶음"
                          : "소목차"}{" "}
                        이동
                      </span>
                    )}
                  </td>
                  <td className="tw:min-w-48">
                    {row.kind === "chapter" && (
                      <DadamButton
                        size="small"
                        appearance="subtle"
                        aria-label={
                          row.title +
                          (collapsed.includes(row.id) ? " 펼치기" : " 접기")
                        }
                        aria-expanded={!collapsed.includes(row.id)}
                        onClick={() => props.onToggle(row.id)}
                      >
                        {collapsed.includes(row.id) ? "▸" : "▾"}
                      </DadamButton>
                    )}
                    {titleDraft?.id === row.id ? (
                      <div className="tw:flex tw:gap-1">
                        <DadamInput
                          autoFocus
                          aria-label="목차명"
                          value={titleDraft.value}
                          onChange={(_, d) => props.onTitle(d.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") props.onSaveTitle();
                            if (e.key === "Escape") props.onCancelTitle();
                          }}
                        />
                        <DadamButton
                          disabled={busy || !titleDraft.value.trim()}
                          onClick={props.onSaveTitle}
                        >
                          저장
                        </DadamButton>
                        <DadamButton
                          disabled={busy}
                          onClick={props.onCancelTitle}
                        >
                          취소
                        </DadamButton>
                      </div>
                    ) : row.canStructure ? (
                      <DadamButton
                        appearance="subtle"
                        disabled={busy}
                        onClick={() => props.onRename(row)}
                      >
                        {row.title}
                      </DadamButton>
                    ) : (
                      <span>{row.title}</span>
                    )}
                    {row.kind === "section" && (
                      <DadamButton
                        size="small"
                        appearance="subtle"
                        onClick={() => props.onOpen(row)}
                      >
                        제작 →
                      </DadamButton>
                    )}
                  </td>
                  <td>{names(row.assigneeIds) || "—"}</td>
                  <td>{names(row.reviewerIds) || "—"}</td>
                  <td>
                    {row.kind === "chapter" ? (
                      row.doneCount + "/" + row.sectionCount
                    ) : row.canEdit ? (
                      <DadamSelect
                        aria-label={row.title + " 상태"}
                        size="small"
                        value={row.state!}
                        disabled={busy}
                        onChange={(_, d) =>
                          props.onOperation({
                            type: "set-section-state",
                            id: row.id,
                            state: d.value === "done" ? "done" : "writing",
                          })
                        }
                      >
                        <option value="writing">작성 중</option>
                        <option value="done">완료</option>
                      </DadamSelect>
                    ) : row.locked ? (
                      "완료 · 고정"
                    ) : row.state === "done" ? (
                      "완료"
                    ) : (
                      "작성 중"
                    )}
                  </td>
                  <td>{row.slideCount}</td>
                  <td>
                    전체 {row.coverage.full} · 일부 {row.coverage.partial} ·
                    미반영 {row.coverage.none}
                  </td>
                  <td>{row.openComments}</td>
                  <td>
                    <TocRowActions
                      row={row}
                      chapters={view.state.body.chapters}
                      previousId={siblings[index - 1]?.id ?? null}
                      nextBeforeId={siblings[index + 2]?.id ?? null}
                      first={index === 0}
                      last={index === siblings.length - 1}
                      busy={busy || !!titleDraft}
                      onOperation={props.onOperation}
                      onAdd={(position) => props.onAdd(row, position)}
                      onAssign={() => props.onAssign(row)}
                      onDelete={() => props.onDelete(row)}
                    />
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>
      {!rows.length && (
        <p className="tw:p-4">
          대목차와 소목차를 추가하여 제안서 구성을 시작하세요.
        </p>
      )}
    </div>
  );
}
