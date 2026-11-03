"use client";
import { useState } from "react";
import WorkspacePage from "@/components/layout/WorkspacePage";
import ModalFrame from "@/components/ui/ModalFrame";
import { DadamButton, DadamSelect } from "@/components/ui/DadamControls";
import {
  loadProjectView,
  useWorkspaceCommand,
  useWorkspaceAction,
} from "@/hooks/workspace/use-workspace-production";
import { useSlideDraft } from "@/hooks/workspace/use-slide-draft";
import { useSlideClipboard } from "@/hooks/workspace/use-slide-clipboard";
import {
  isTypingTarget,
  normalizeSelectedSlides,
  plainTextBlock,
} from "@/lib/workspace/production/editor";
import { selectDeletionImpact } from "@/lib/workspace/production/selectors";
import { slidePinIds } from "@/lib/workspace/production/clipboard";
import type {
  ProjectView,
  ProposalSlide,
  SlideBatchRequest,
  WorkspaceReceipt,
  MockRequest,
} from "@/types/workspace-production";
import { useWorkspaceRuntime } from "../WorkspaceProjectProvider";
import type { WorkspaceSceneProps } from "../WorkspaceScreen";
import { WorkspaceLinks } from "../WorkspaceScreen";
import {
  DraftProtection,
  requestFor,
  workspaceCard,
  WorkspaceErrorText,
} from "../shared/WorkspaceUi";
import WorkspaceUndoNotice from "../shared/WorkspaceUndoNotice";
import ProductionToolbar from "./ProductionToolbar";
import ProductionPanels from "./ProductionPanels";
import SlideNavigator from "./SlideNavigator";
import SlideContentEditor from "./SlideContentEditor";
import SlideTemplatePicker from "./SlideTemplatePicker";
import ProductionPreview from "./ProductionPreview";
import SourcePanel from "./SourcePanel";
import ProductionAiPanel from "./ProductionAiPanel";
import ProjectComments from "./comments/ProjectComments";
import ProjectCommentPins from "./comments/ProjectCommentPins";
import ReviewRequestDialog from "./comments/ReviewRequestDialog";
import LegacyCommentsArchive from "./comments/LegacyCommentsArchive";
interface ProductionExtras {
  actions?: React.ReactNode;
  comments?(slide: ProposalSlide): React.ReactNode;
  overlay?(slide: ProposalSlide): React.ReactNode;
  onPropose?(request: MockRequest): void;
}
function ActiveSlide({
  view,
  slide,
  snapshotId,
  overlay,
}: {
  view: ProjectView;
  slide: ProposalSlide;
  snapshotId: string | null;
  overlay?: React.ReactNode;
}) {
  const editor = useSlideDraft(view, slide),
    clipboard = useSlideClipboard(),
    [error, setError] = useState<string | null>(null),
    can = view.capabilities.editableSectionIds.includes(slide.sectionId),
    busy = editor.busy || clipboard.image.isPending;
  const save = () =>
    editor.save().catch((e) => {
      setError(e instanceof Error ? e.message : "저장하지 못했습니다.");
      throw e;
    });
  const image = (file: File) => {
    if (editor.draft.dirty) {
      setError("이미지를 넣기 전에 편집 중인 내용을 저장해 주세요.");
      return;
    }
    clipboard.image.mutate({
      ...requestFor(view),
      slideId: slide.id,
      file,
      afterBlockId: null,
    });
  };
  return (
    <div
      className="tw:space-y-(--layout-section-gap)"
      onKeyDown={(e) => {
        if (
          (e.ctrlKey || e.metaKey) &&
          e.key.toLowerCase() === "s" &&
          !e.nativeEvent.isComposing &&
          can
        ) {
          e.preventDefault();
          if (!busy) void save().catch(() => {});
        }
      }}
      onPaste={(e) => {
        if (!can || busy || isTypingTarget(e.target)) return;
        e.preventDefault();
        const file = e.clipboardData.files[0];
        if (file) {
          image(file);
          return;
        }
        try {
          const block = plainTextBlock(
            e.clipboardData.getData("text/plain"),
            () => crypto.randomUUID(),
          );
          editor.setContent({
            ...editor.draft.content,
            blocks: [...editor.draft.content.blocks, block],
          });
          setError(null);
        } catch (failure) {
          setError(
            failure instanceof Error
              ? failure.message
              : "지원하지 않는 붙여넣기입니다.",
          );
        }
      }}
    >
      {editor.conflict && (
        <div role="alert" className={workspaceCard}>
          <p>
            다른 변경이 저장되었습니다. 현재 입력을 보존했습니다. 최신 내용과
            비교한 뒤 다시 편집해 주세요.
          </p>
          <details>
            <summary>현재 저장된 내용</summary>
            <pre className="tw:whitespace-pre-wrap tw:text-xs">
              {JSON.stringify(slide.content, null, 2)}
            </pre>
          </details>
          <DadamButton
            onClick={() => {
              editor.discard();
              setError(null);
            }}
          >
            내 입력을 버리고 최신 내용 불러오기
          </DadamButton>
        </div>
      )}
      {can && editor.draft.dirty && (
        <div className="tw:flex tw:gap-2">
          <span role="status">미저장 변경</span>
          <DadamButton
            disabled={busy}
            onClick={() => {
              editor.discard();
              setError(null);
            }}
          >
            변경 취소
          </DadamButton>
        </div>
      )}
      <SlideContentEditor
        value={editor.draft.content}
        readOnly={!can}
        busy={busy}
        error={editor.error ?? error ?? clipboard.image.error?.message ?? null}
        onChange={editor.setContent}
        onSave={() => {
          void save().catch(() => {});
        }}
        onImage={can ? image : undefined}
      />
      <SlideTemplatePicker
        view={view}
        content={editor.draft.content}
        value={editor.draft.template}
        readOnly={!can || busy}
        onChange={editor.setTemplate}
      />
      <ProductionPreview
        view={view}
        slide={slide}
        snapshotId={snapshotId}
        content={editor.draft.content}
        template={editor.draft.template}
        dirty={editor.draft.dirty}
        overlay={overlay}
      />
      <DraftProtection
        dirty={editor.draft.dirty}
        busy={busy}
        onSave={can ? save : undefined}
        onDiscard={editor.discard}
      />
    </div>
  );
}
export default function ProductionWorkspace({
  view,
  selection,
  choose,
  selector,
  actions,
  comments,
  overlay,
  onPropose,
}: WorkspaceSceneProps & ProductionExtras) {
  const runtime = useWorkspaceRuntime(),
    command = useWorkspaceCommand(),
    batch = useWorkspaceAction<WorkspaceReceipt, SlideBatchRequest>((r, i) =>
      r.service.editSlides(i),
    ),
    clipboard = useSlideClipboard(),
    [selected, setSelected] = useState<string[] | null>(null),
    [dialog, setDialog] = useState<SlideBatchRequest | null>(null),
    [target, setTarget] = useState(""),
    [notice, setNotice] = useState<string | null>(null),
    [review, setReview] = useState(false);
  const section = view.state.body.sections.find(
      (s) => s.id === selection.sectionId,
    ),
    slides = view.state.body.slides.filter((s) => s.sectionId === section?.id),
    slide = slides.find((s) => s.id === selection.slideId) ?? slides[0] ?? null,
    ids = normalizeSelectedSlides(
      view.state.body.slides,
      selected ?? (slide ? [slide.id] : []),
    ),
    busy =
      command.isPending ||
      batch.isPending ||
      clipboard.copy.isPending ||
      clipboard.paste.isPending,
    editable =
      !!section && view.capabilities.editableSectionIds.includes(section.id),
    allEditable =
      ids.length > 0 &&
      ids.every((id) =>
        view.capabilities.editableSectionIds.includes(
          view.state.body.slides.find((s) => s.id === id)!.sectionId,
        ),
      ),
    selectedSlides = view.state.body.slides.filter((s) => ids.includes(s.id)),
    copyAllowed =
      !selection.snapshotId &&
      slidePinIds(selectedSlides).every(
        (id) =>
          view.assetAccess.find((a) => a.pinId === id)?.access.status ===
          "available",
      );
  const go = (id: string) => {
    const selectedSlide = view.state.body.slides.find((s) => s.id === id);
    if (selectedSlide)
      void choose({
        ...selection,
        sectionId: selectedSlide.sectionId,
        slideId: id,
      }).catch(() => {});
  };
  const copy = () => {
    if (!copyAllowed || !ids.length) return;
    void runtime
      .navigate(async () => {
        const result = await clipboard.copy.mutateAsync({
          projectId: view.project.id,
          slideIds: ids,
        });
        setNotice(
          result.count +
            "장 복사했습니다. 10분 안에 같은 사용자 범위에서 붙여넣을 수 있습니다.",
        );
      })
      .catch(() => {});
  };
  const paste = () => {
    const token = clipboard.getToken();
    if (token && section && editable)
      void runtime
        .navigate(async () => {
          const fresh = await loadProjectView(runtime, view.project.id);
          const r = await clipboard.paste.mutateAsync({
            ...requestFor(fresh),
            sectionId: section.id,
            afterId: slide?.id ?? null,
            token,
          });
          setNotice(r.notices?.join(" ") || "슬라이드를 붙여넣었습니다.");
          setSelected(r.createdIds);
        })
        .catch(() => {});
  };
  const remove = (slideIds: string[]) => {
    void runtime
      .navigate(async () => {
        batch.reset();
        const fresh = await loadProjectView(runtime, view.project.id);
        setDialog({
          ...requestFor(fresh),
          operation: "remove",
          slideIds,
          sectionId: null,
          beforeId: null,
        });
      })
      .catch(() => {});
  };
  const chooseSlide = (id: string, multiple: boolean, range = false) => {
    if (range && slide) {
      const a = slides.findIndex((s) => s.id === slide.id),
        b = slides.findIndex((s) => s.id === id);
      setSelected(
        slides.slice(Math.min(a, b), Math.max(a, b) + 1).map((s) => s.id),
      );
    } else if (multiple)
      setSelected((v) =>
        ids.includes(id)
          ? ids.filter((i) => i !== id)
          : [
              ...(v ?? []).filter((i) => ids.includes(i)),
              ...ids.filter((i) => !(v ?? []).includes(i)),
              id,
            ],
      );
    else {
      setSelected([id]);
      go(id);
    }
  };
  const applyBatch = async () => {
    if (!dialog) return;
    const r = await batch.mutateAsync(dialog);
    setDialog(null);
    setSelected([]);
    if (dialog.operation === "move" && dialog.sectionId)
      void choose({
        ...selection,
        sectionId: dialog.sectionId,
        slideId: dialog.slideIds[0],
      }).catch(() => {});
    setNotice(r.notices?.join(" ") ?? null);
  };
  const center = slide ? (
    <ActiveSlide
      key={
        view.project.id +
        ":" +
        view.state.currentRound +
        ":" +
        slide.id +
        ":" +
        (selection.snapshotId ?? "current") +
        ":" +
        view.capabilities.editableSectionIds.includes(slide.sectionId)
      }
      view={view}
      slide={slide}
      snapshotId={selection.snapshotId}
      overlay={
        overlay?.(slide) ?? (
          <ProjectCommentPins
            view={view}
            slideId={slide.id}
            snapshotId={selection.snapshotId}
          />
        )
      }
    />
  ) : (
    <section className={workspaceCard}>
      <p>
        {section
          ? "슬라이드를 추가하거나 목차 화면에서 작성할 구성을 확인해 주세요."
          : "목차를 추가한 뒤 소목차를 선택해 주세요."}
      </p>
    </section>
  );
  return (
    <WorkspacePage
      title="제작"
      leading={selector}
      actions={<WorkspaceLinks current="write" selection={selection} />}
    >
      <ProductionToolbar
        view={view}
        sectionId={section?.id ?? null}
        busy={busy}
        onState={(state) => {
          if (section)
            void runtime
              .navigate(async () => {
                const fresh = await loadProjectView(runtime, view.project.id);
                await command.mutateAsync({
                  ...requestFor(fresh),
                  operation: {
                    type: "set-section-state",
                    id: section.id,
                    state,
                  },
                });
              })
              .catch(() => {});
        }}
        onSection={(id) => {
          void choose({ ...selection, sectionId: id, slideId: null }).catch(
            () => {},
          );
        }}
        actions={
          <>
            {actions}
            <LegacyCommentsArchive />
            {slide &&
              !selection.snapshotId &&
              (view.actor.role === "super_admin" ||
                view.project.pmId === view.actor.id ||
                section?.assigneeIds.includes(view.actor.id)) && (
                <DadamButton
                  onClick={() => {
                    void runtime.navigate(async () => setReview(true));
                  }}
                >
                  검토 요청
                </DadamButton>
              )}
          </>
        }
      />
      <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-2">
        {slides.length > 0 && (
          <>
            <DadamButton onClick={() => setSelected(slides.map((s) => s.id))}>
              모두 선택
            </DadamButton>
            <DadamButton onClick={() => setSelected([])}>선택 해제</DadamButton>
            <span>{ids.length}장 선택</span>
            {copyAllowed && (
              <DadamButton disabled={busy || !ids.length} onClick={copy}>
                복사
              </DadamButton>
            )}
          </>
        )}
        {editable && (
          <DadamButton disabled={busy || !clipboard.getToken()} onClick={paste}>
            붙여넣기
          </DadamButton>
        )}
        {allEditable && (
          <>
            <DadamSelect
              aria-label="선택 슬라이드를 이동할 소목차"
              value={target}
              disabled={busy}
              onChange={(_, d) => setTarget(d.value)}
            >
              <option value="">이동할 소목차</option>
              {view.state.body.sections
                .filter((s) =>
                  view.capabilities.editableSectionIds.includes(s.id),
                )
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
            </DadamSelect>
            <DadamButton
              disabled={busy || !target}
              onClick={() => {
                void runtime.navigate(async () => {
                  const fresh = await loadProjectView(runtime, view.project.id);
                  setDialog({
                    ...requestFor(fresh),
                    operation: "move",
                    slideIds: ids,
                    sectionId: target,
                    beforeId: null,
                  });
                });
              }}
            >
              선택 이동
            </DadamButton>
            <DadamButton disabled={busy} onClick={() => remove(ids)}>
              선택 삭제
            </DadamButton>
            {onPropose && (
              <DadamButton
                disabled={busy}
                onClick={() => {
                  void runtime.navigate(async () =>
                    onPropose({
                      ...requestFor(view),
                      kind: "polish",
                      sectionIds: [],
                      slideIds: ids,
                      instruction: "문장을 간결하고 명확하게 다듬어 주세요.",
                    }),
                  );
                }}
              >
                AI 다듬기
              </DadamButton>
            )}
          </>
        )}
        {editable && onPropose && (
          <DadamButton
            disabled={busy}
            onClick={() => {
              void runtime.navigate(async () =>
                onPropose({
                  ...requestFor(view),
                  kind: "draft",
                  sectionIds: [section!.id],
                  slideIds: [],
                  instruction: "소목차에 맞는 초안을 작성해 주세요.",
                }),
              );
            }}
          >
            AI 초안
          </DadamButton>
        )}
        {section &&
          view.capabilities.unlockableSectionIds.includes(section.id) && (
            <DadamButton
              disabled={busy}
              onClick={() =>
                command.mutate({
                  ...requestFor(view),
                  operation: { type: "unlock-section", id: section.id },
                })
              }
            >
              고정 해제
            </DadamButton>
          )}
      </div>
      {notice && <p role="status">{notice}</p>}
      <WorkspaceErrorText
        error={command.error ?? clipboard.copy.error ?? clipboard.paste.error}
      />
      <div
        tabIndex={0}
        aria-label="제작 작업 영역"
        onKeyDown={(e) => {
          if (isTypingTarget(e.target) || e.nativeEvent.isComposing || busy)
            return;
          const modifier = e.ctrlKey || e.metaKey,
            key = e.key.toLowerCase();
          if (modifier && key === "c" && copyAllowed && ids.length) {
            e.preventDefault();
            copy();
          } else if (
            modifier &&
            key === "v" &&
            editable &&
            clipboard.getToken()
          ) {
            e.preventDefault();
            paste();
          } else if (modifier && key === "d" && editable && slide) {
            e.preventDefault();
            void runtime
              .navigate(async () => {
                const fresh = await loadProjectView(runtime, view.project.id);
                await command.mutateAsync({
                  ...requestFor(fresh),
                  operation: {
                    type: "duplicate-slide",
                    id: slide.id,
                    targetSectionId: section!.id,
                    afterId: slide.id,
                  },
                });
              })
              .catch(() => {});
          } else if (e.key === "Delete" && allEditable) {
            e.preventDefault();
            remove(ids);
          }
        }}
      >
        <ProductionPanels
          namespace={runtime.identity.namespace}
          left={
            <SlideNavigator
              view={view}
              sectionId={section?.id ?? null}
              selectedIds={ids}
              activeId={slide?.id ?? null}
              busy={busy}
              onSelect={chooseSlide}
              onCommand={(operation) => {
                void runtime
                  .navigate(async () => {
                    const fresh = await loadProjectView(
                      runtime,
                      view.project.id,
                    );
                    const r = await command.mutateAsync({
                      ...requestFor(fresh),
                      operation,
                    });
                    if (r.createdIds[0])
                      void choose({
                        ...selection,
                        slideId: r.createdIds[0],
                      }).catch(() => {});
                  })
                  .catch(() => {});
              }}
              onCopy={copy}
              canCopy={copyAllowed}
              onPaste={paste}
              canPaste={editable && !!clipboard.getToken()}
              onRemove={remove}
            />
          }
          center={center}
          right={
            <SourcePanel
              view={view}
              slide={slide}
              snapshotId={selection.snapshotId}
              onSlide={go}
              comments={
                slide
                  ? (comments?.(slide) ?? (
                      <ProjectComments
                        key={slide.id}
                        view={view}
                        slideId={slide.id}
                        snapshotId={selection.snapshotId}
                      />
                    ))
                  : null
              }
            />
          }
        />
      </div>
      {onPropose && !selection.snapshotId && (
        <ProductionAiPanel
          view={view}
          slideIds={ids}
          sectionId={section?.id ?? null}
          onPropose={onPropose}
        />
      )}
      <WorkspaceUndoNotice view={view} />
      {dialog && (
        <ModalFrame
          open
          title={
            dialog.operation === "remove"
              ? "선택 슬라이드 삭제"
              : "선택 슬라이드 이동"
          }
          contentKey={dialog.operation}
          onClose={() => {
            if (!batch.isPending) setDialog(null);
          }}
          footer={
            <>
              <DadamButton
                disabled={batch.isPending}
                onClick={() => setDialog(null)}
              >
                취소
              </DadamButton>
              <DadamButton
                appearance="primary"
                disabled={batch.isPending}
                onClick={() => {
                  void applyBatch().catch(() => {});
                }}
              >
                확인
              </DadamButton>
            </>
          }
        >
          <p>
            {dialog.slideIds.length}장
            {dialog.operation === "remove"
              ? "과 연결된 의견을 삭제합니다."
              : "을 선택한 소목차로 이동합니다."}{" "}
            미처리 의견{" "}
            {dialog.slideIds.reduce(
              (n, id) => n + selectDeletionImpact(view, id).openComments,
              0,
            )}
            개가 연결되어 있습니다.
          </p>
          <p>
            다른 변경 전에 15초 동안 되돌릴 수 있습니다. 고정되었거나 권한이
            없는 항목이 있으면 전체 작업을 거절합니다.
          </p>
          <WorkspaceErrorText error={batch.error} />
        </ModalFrame>
      )}
      {review && slide && (
        <ReviewRequestDialog
          view={view}
          slide={slide}
          onClose={() => setReview(false)}
        />
      )}
    </WorkspacePage>
  );
}
