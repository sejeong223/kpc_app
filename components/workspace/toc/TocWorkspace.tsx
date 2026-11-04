"use client";
import { workspaceHref } from "@/lib/workspace/production/routing";
import { useRouter } from "next/navigation";
import { useState } from "react";
import ProjectHeader from "@/components/common/ProjectHeader";
import WorkspacePage from "@/components/layout/WorkspacePage";
import ModalFrame from "@/components/ui/ModalFrame";
import {
  DadamButton,
  DadamInput,
  DadamTextarea,
} from "@/components/ui/DadamControls";
import type { WorkspaceSceneProps } from "../WorkspaceScreen";
import { WorkspaceLinks } from "../WorkspaceScreen";
import { useWorkspaceRuntime } from "../WorkspaceProjectProvider";
import { useWorkspaceCommand } from "@/hooks/workspace/use-workspace-production";
import {
  selectTocRows,
  selectDeletionImpact,
  type TocRow,
} from "@/lib/workspace/production/selectors";
import type {
  ChecklistItem,
  MockRequest,
  ProjectRequest,
  WorkspaceOperation,
} from "@/types/workspace-production";
import {
  requestFor,
  workspaceCard,
  DraftProtection,
  WorkspaceErrorText,
} from "../shared/WorkspaceUi";
import MemberPicker from "../shared/MemberPicker";
import WorkspaceDeleteDialog from "../shared/WorkspaceDeleteDialog";
import WorkspaceUndoNotice from "../shared/WorkspaceUndoNotice";
import TocTable from "./TocTable";
import AdministrativeChecklist from "./AdministrativeChecklist";
type FormDraft = {
  request: ProjectRequest;
  title: string;
  source: string;
  assigneeIds: string[];
  reviewerIds: string[];
  operation: WorkspaceOperation;
  mode: "title" | "check" | "assign" | "assign-check" | "delete";
};
export default function TocWorkspace({
  view,
  selection,
  selector,
  onPropose,
  actions,
}: WorkspaceSceneProps & {
  onPropose?(request: MockRequest): void;
  actions?: React.ReactNode;
}) {
  const router = useRouter(),
    runtime = useWorkspaceRuntime(),
    mutation = useWorkspaceCommand(),
    [draft, setDraft] = useState<FormDraft | null>(null),
    [collapsed, setCollapsed] = useState<string[]>([]),
    [instruction, setInstruction] = useState(""),
    [inline, setInline] = useState<{
      row: TocRow;
      value: string;
      request: ProjectRequest;
    } | null>(null);
  const rows = selectTocRows(view),
    busy = mutation.isPending,
    chapterRows = rows.filter((r) => r.kind === "chapter");
  const begin = (
    operation: WorkspaceOperation,
    mode: FormDraft["mode"],
    title = "",
    source = "",
    assigneeIds: string[] = [],
    reviewerIds: string[] = [],
  ) => {
    mutation.reset();
    setDraft({
      operation,
      mode,
      title,
      source,
      assigneeIds: [...assigneeIds],
      reviewerIds: [...reviewerIds],
      request: requestFor(view),
    });
  };
  const save = async () => {
    if (inline) {
      await mutation.mutateAsync({
        ...inline.request,
        operation:
          inline.row.kind === "chapter"
            ? { type: "rename-chapter", id: inline.row.id, title: inline.value }
            : {
                type: "rename-section",
                id: inline.row.id,
                title: inline.value,
              },
      });
      setInline(null);
      return;
    }
    if (!draft) return;
    let operation = draft.operation;
    if (operation.type === "add-chapter" || operation.type === "add-section")
      operation = { ...operation, title: draft.title };
    if (operation.type === "add-check" || operation.type === "edit-check")
      operation = { ...operation, title: draft.title, source: draft.source };
    if (operation.type === "assign-section")
      operation = {
        ...operation,
        assigneeIds: draft.assigneeIds,
        reviewerIds: draft.reviewerIds,
      };
    if (operation.type === "assign-check")
      operation = { ...operation, assigneeIds: draft.assigneeIds };
    await mutation.mutateAsync({ ...draft.request, operation });
    setDraft(null);
  };
  const run = (operation: WorkspaceOperation) => {
    if (!draft && !inline && !busy)
      mutation.mutate({ ...requestFor(view), operation });
  };
  const add = (row: TocRow, position: "before" | "after" | "child") => {
    const beforeId = position === "before" ? row.id : undefined,
      afterId = position === "after" ? row.id : null;
    begin(
      row.kind === "chapter" && position !== "child"
        ? { type: "add-chapter", title: "", afterId, beforeId }
        : {
            type: "add-section",
            chapterId: row.kind === "chapter" ? row.id : row.chapterId!,
            title: "",
            afterId,
            beforeId,
          },
      "title",
    );
  };
  const checkForm = (item: ChecklistItem) =>
    begin(
      {
        type: "edit-check",
        id: item.id,
        title: item.title,
        source: item.source,
      },
      "check",
      item.title,
      item.source,
    );
  const deletion =
    draft && "id" in draft.operation
      ? selectDeletionImpact(view, draft.operation.id)
      : {
          sectionIds: [],
          slideIds: [],
          openComments: 0,
          blocked: false,
          reasons: [],
        };
  if (draft?.operation.type === "remove-check") {
    deletion.blocked = !view.capabilities.actions.outline;
    deletion.reasons = deletion.blocked
      ? ["목차 구조 변경 권한이 필요합니다."]
      : [];
  }
  return (
    <WorkspacePage headerComponent={ProjectHeader}
      title="목차"
      leading={selector}
      actions={<WorkspaceLinks selection={selection} current="toc" />}
    >
      <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-3">
        <strong>
          {view.state.currentRound}회차 ·{" "}
          {view.state.phase === "completed" ? "완성" : "작성 중"}
        </strong>
        <span>
          소목차 {view.state.body.sections.length} · 완료{" "}
          {view.state.body.sections.filter((s) => s.state === "done").length} ·
          슬라이드 {view.state.body.slides.length} · 미처리 의견{" "}
          {chapterRows.reduce((n, r) => n + r.openComments, 0)}
        </span>
        {actions}
      </div>
      <section className={workspaceCard}>
        <header className="tw:mb-3 tw:flex tw:flex-wrap tw:items-center tw:gap-2">
          <DadamButton
            onClick={() =>
              setCollapsed(view.state.body.chapters.map((c) => c.id))
            }
          >
            모두 접기
          </DadamButton>
          <DadamButton onClick={() => setCollapsed([])}>
            모두 펼치기
          </DadamButton>
          {view.capabilities.actions.outline && (
            <DadamButton
              appearance="primary"
              disabled={busy || !!draft || !!inline}
              onClick={() =>
                begin(
                  { type: "add-chapter", title: "", afterId: null },
                  "title",
                )
              }
            >
              대목차 추가
            </DadamButton>
          )}
        </header>
        <WorkspaceErrorText error={!draft ? mutation.error : null} />
        <TocTable
          view={view}
          rows={rows}
          collapsed={collapsed}
          busy={busy || !!draft}
          titleDraft={
            inline ? { id: inline.row.id, value: inline.value } : null
          }
          onTitle={(value) => setInline((d) => (d ? { ...d, value } : d))}
          onRename={(row) => {
            if (!inline) {
              mutation.reset();
              setInline({ row, value: row.title, request: requestFor(view) });
            }
          }}
          onSaveTitle={() => {
            void save().catch(() => {});
          }}
          onCancelTitle={() => setInline(null)}
          onToggle={(id) =>
            setCollapsed((ids) =>
              ids.includes(id) ? ids.filter((v) => v !== id) : [...ids, id],
            )
          }
          onOperation={run}
          onAdd={add}
          onAssign={(row) =>
            begin(
              {
                type: "assign-section",
                id: row.id,
                assigneeIds: row.assigneeIds,
                reviewerIds: row.reviewerIds,
              },
              "assign",
              row.title,
              "",
              row.assigneeIds,
              row.reviewerIds,
            )
          }
          onDelete={(row) =>
            begin(
              row.kind === "chapter"
                ? { type: "remove-chapter", id: row.id }
                : { type: "remove-section", id: row.id },
              "delete",
              row.title,
            )
          }
          onOpen={(row) => {
            void runtime.navigate(async () => {
              router.push(
                workspaceHref("write", {
                  ...selection,
                  sectionId: row.id,
                  slideId: null,
                }),
              );
            });
          }}
        />
      </section>
      {view.capabilities.actions.outline && onPropose && (
        <section className={workspaceCard}>
          <div className="tw:flex tw:flex-wrap tw:gap-2">
            <DadamInput
              aria-label="목차 수정 요청"
              value={instruction}
              onChange={(_, d) => setInstruction(d.value)}
              placeholder="목차 수정 방향을 입력하세요"
            />
            <DadamButton
              disabled={busy || !!draft || !!inline}
              onClick={() =>
                onPropose({
                  ...requestFor(view),
                  kind: "recommend-toc",
                  sectionIds: [],
                  slideIds: [],
                  instruction:
                    instruction.trim() ||
                    "프로젝트에 맞는 목차 구성을 제안해 주세요.",
                })
              }
            >
              AI 목차 추천
            </DadamButton>
            <DadamButton
              disabled={
                busy || !!draft || !!inline || !view.state.body.chapters.length
              }
              onClick={() =>
                onPropose({
                  ...requestFor(view),
                  kind: "edit-toc",
                  sectionIds: [],
                  slideIds: [],
                  instruction:
                    instruction.trim() ||
                    "프로젝트에 맞는 목차 구성을 제안해 주세요.",
                })
              }
            >
              자연어 수정 제안
            </DadamButton>
          </div>
          <p className="tw:text-xs tw:text-(--kpc-muted)">
            Mock 제안을 비교한 뒤 선택 적용합니다.
          </p>
        </section>
      )}
      <AdministrativeChecklist
        view={view}
        actorId={runtime.identity.actor.id}
        busy={busy || !!draft || !!inline}
        onOperation={run}
        onEdit={checkForm}
        onAssign={(item) =>
          begin(
            {
              type: "assign-check",
              id: item.id,
              assigneeIds: item.assigneeIds,
            },
            "assign-check",
            item.title,
            "",
            item.assigneeIds,
          )
        }
        onAdd={() =>
          begin({ type: "add-check", title: "", source: "" }, "check")
        }
        onDelete={(item) =>
          begin({ type: "remove-check", id: item.id }, "delete", item.title)
        }
      />
      <WorkspaceUndoNotice view={view} />
      {draft && draft.mode !== "delete" && (
        <ModalFrame
          open
          title={
            draft.mode === "assign" || draft.mode === "assign-check"
              ? "담당자 지정"
              : draft.mode === "check"
                ? "체크리스트 편집"
                : "목차 추가"
          }
          contentKey={draft.operation.type}
          onClose={() => {
            if (!busy) setDraft(null);
          }}
          footer={
            <>
              <DadamButton disabled={busy} onClick={() => setDraft(null)}>
                취소
              </DadamButton>
              <DadamButton
                appearance="primary"
                disabled={
                  busy ||
                  ((draft.mode === "title" || draft.mode === "check") &&
                    !draft.title.trim())
                }
                onClick={() => {
                  void save().catch(() => {});
                }}
              >
                저장
              </DadamButton>
            </>
          }
        >
          {draft.mode === "title" || draft.mode === "check" ? (
            <label>
              항목명
              <DadamInput
                value={draft.title}
                onChange={(_, d) => setDraft({ ...draft, title: d.value })}
              />
            </label>
          ) : (
            <MemberPicker
              label="담당자"
              minimum={draft.mode === "assign" ? 1 : 0}
              members={view.members}
              selected={draft.assigneeIds}
              onChange={(assigneeIds) => setDraft({ ...draft, assigneeIds })}
            />
          )}
          {draft.mode === "check" && (
            <label>
              근거
              <DadamTextarea
                value={draft.source}
                onChange={(_, d) => setDraft({ ...draft, source: d.value })}
              />
            </label>
          )}
          {draft.mode === "assign" && (
            <MemberPicker
              label="리뷰자"
              minimum={0}
              members={view.members}
              selected={draft.reviewerIds}
              onChange={(reviewerIds) => setDraft({ ...draft, reviewerIds })}
            />
          )}
          <WorkspaceErrorText error={mutation.error} />
        </ModalFrame>
      )}
      {draft?.mode === "delete" && (
        <WorkspaceDeleteDialog
          open
          title={draft.title}
          impact={deletion}
          busy={busy}
          error={mutation.error?.message ?? null}
          onClose={() => setDraft(null)}
          onConfirm={() => {
            void save().catch(() => {});
          }}
        />
      )}
      <DraftProtection
        dirty={!!draft || !!inline}
        busy={busy}
        onSave={draft?.mode === "delete" ? undefined : save}
        onDiscard={() => {
          setDraft(null);
          setInline(null);
        }}
      />
    </WorkspacePage>
  );
}
