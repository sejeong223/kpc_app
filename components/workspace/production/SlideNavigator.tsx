"use client";
import { useState } from "react";
import { DadamButton, DadamCheckbox } from "@/components/ui/DadamControls";
import type {
  ProjectView,
  WorkspaceOperation,
} from "@/types/workspace-production";
import { workspaceCard } from "../shared/WorkspaceUi";
export interface SlideNavigatorProps {
  view: ProjectView;
  sectionId: string | null;
  selectedIds: string[];
  activeId: string | null;
  busy?: boolean;
  onSelect(id: string, multiple: boolean, range?: boolean): void;
  onCommand(operation: WorkspaceOperation): void;
  onCopy(): void;
  canCopy?: boolean;
  onPaste(): void;
  canPaste: boolean;
  onRemove(ids: string[]): void;
}
export default function SlideNavigator({
  view,
  sectionId,
  selectedIds,
  activeId,
  busy = false,
  onSelect,
  onCommand,
  onCopy,
  canCopy = false,
  onPaste,
  canPaste,
  onRemove,
}: SlideNavigatorProps) {
  const [context, setContext] = useState<string | null>(null),
    slides = view.state.body.slides.filter((s) => s.sectionId === sectionId),
    section = view.state.body.sections.find((s) => s.id === sectionId),
    editable =
      !!section && view.capabilities.editableSectionIds.includes(section.id);
  return (
    <section className={workspaceCard} aria-label="슬라이드 탐색">
      <h2 className="tw:mt-0 tw:text-sm">
        {section?.title ?? "소목차를 선택하세요"}{" "}
        <small>{slides.length}장</small>
      </h2>
      {editable && (
        <DadamButton
          disabled={busy}
          onClick={() =>
            onCommand({
              type: "add-slide",
              sectionId: section!.id,
              afterId: activeId,
              template: null,
            })
          }
        >
          슬라이드 추가
        </DadamButton>
      )}
      <ol className="tw:list-none tw:space-y-2 tw:p-0">
        {slides.map((slide, index) => (
          <li
            key={slide.id}
            className={
              "tw:rounded-lg tw:border tw:border-solid tw:p-2 " +
              (activeId === slide.id
                ? "tw:border-(--kpc-brand) tw:bg-(--dadam-accent-soft)"
                : "tw:border-(--kpc-line)")
            }
            onContextMenu={(e) => {
              e.preventDefault();
              onSelect(slide.id, false);
              setContext(slide.id);
            }}
          >
            <div className="tw:flex tw:items-start tw:gap-1">
              <DadamCheckbox
                aria-label={index + 1 + "번 슬라이드 다중 선택"}
                checked={selectedIds.includes(slide.id)}
                onChange={() => onSelect(slide.id, true)}
              />
              <button
                type="button"
                disabled={busy}
                aria-current={activeId === slide.id ? "true" : undefined}
                className="tw:min-w-0 tw:flex-1 tw:cursor-pointer tw:border-0 tw:bg-transparent tw:p-1 tw:text-left tw:text-sm"
                onClick={(e) =>
                  onSelect(slide.id, e.ctrlKey || e.metaKey, e.shiftKey)
                }
              >
                {index + 1}. {slide.content.title || "제목 없음"}
              </button>
            </div>
            <div
              aria-label={index + 1 + "번 슬라이드 내용 요약"}
              className="tw:my-2 tw:aspect-video tw:overflow-hidden tw:rounded tw:border tw:border-solid tw:border-(--kpc-line) tw:bg-white tw:p-3 tw:text-[10px]"
            >
              <strong className="tw:block tw:truncate">
                {slide.content.title || "제목 없음"}
              </strong>
              <p className="tw:my-1 tw:line-clamp-2 tw:text-(--kpc-muted)">
                {slide.content.lead}
              </p>
              {slide.content.blocks.slice(0, 2).map((b) => (
                <p key={b.id} className="tw:my-1 tw:line-clamp-2">
                  {b.kind === "text"
                    ? b.text
                    : b.kind === "list"
                      ? b.items.join(" · ")
                      : b.kind === "table"
                        ? b.columns.join(" | ")
                        : "이미지 · " + b.alt}
                </p>
              ))}
            </div>
            <p className="tw:my-1 tw:text-xs tw:text-(--kpc-muted)">
              {section?.assigneeIds
                .map((id) => view.members.find((m) => m.id === id)?.name)
                .join(", ")}{" "}
              ·{" "}
              {section?.locked
                ? "고정"
                : section?.state === "done"
                  ? "완료"
                  : "작성 중"}{" "}
              · 의견{" "}
              {
                view.state.body.threads.filter(
                  (t) => t.slideId === slide.id && t.status === "open",
                ).length
              }
            </p>
            {editable && (
              <div className="tw:flex tw:flex-wrap tw:gap-1">
                <DadamButton
                  size="small"
                  disabled={busy || index === 0}
                  aria-label={index + 1 + "번 슬라이드 위로"}
                  onClick={() =>
                    onCommand({
                      type: "move-slide",
                      id: slide.id,
                      sectionId: section!.id,
                      beforeId: slides[index - 1].id,
                    })
                  }
                >
                  ↑
                </DadamButton>
                <DadamButton
                  size="small"
                  disabled={busy || index === slides.length - 1}
                  aria-label={index + 1 + "번 슬라이드 아래로"}
                  onClick={() =>
                    onCommand({
                      type: "move-slide",
                      id: slide.id,
                      sectionId: section!.id,
                      beforeId: slides[index + 2]?.id ?? null,
                    })
                  }
                >
                  ↓
                </DadamButton>
                <DadamButton
                  size="small"
                  disabled={busy}
                  onClick={() =>
                    onCommand({
                      type: "duplicate-slide",
                      id: slide.id,
                      targetSectionId: section!.id,
                      afterId: slide.id,
                    })
                  }
                >
                  복제
                </DadamButton>
                <DadamButton
                  size="small"
                  disabled={busy}
                  onClick={() => onRemove([slide.id])}
                >
                  삭제
                </DadamButton>
              </div>
            )}
            {context === slide.id && (
              <div
                role="menu"
                aria-label="슬라이드 작업"
                className="tw:mt-2 tw:flex tw:flex-wrap tw:gap-1"
              >
                {canCopy && (
                  <DadamButton
                    role="menuitem"
                    disabled={busy}
                    onClick={() => {
                      onCopy();
                      setContext(null);
                    }}
                  >
                    복사
                  </DadamButton>
                )}
                {editable && (
                  <>
                    <DadamButton
                      role="menuitem"
                      disabled={busy || !canPaste}
                      onClick={() => {
                        onPaste();
                        setContext(null);
                      }}
                    >
                      붙여넣기
                    </DadamButton>
                    <DadamButton
                      role="menuitem"
                      disabled={busy}
                      onClick={() => {
                        onCommand({
                          type: "duplicate-slide",
                          id: slide.id,
                          targetSectionId: section!.id,
                          afterId: slide.id,
                        });
                        setContext(null);
                      }}
                    >
                      복제
                    </DadamButton>
                    <DadamButton
                      role="menuitem"
                      disabled={busy}
                      onClick={() => {
                        onRemove([slide.id]);
                        setContext(null);
                      }}
                    >
                      삭제
                    </DadamButton>
                  </>
                )}
                <DadamButton role="menuitem" onClick={() => setContext(null)}>
                  닫기
                </DadamButton>
              </div>
            )}
          </li>
        ))}
      </ol>
      {!slides.length && (
        <p className="tw:text-sm">등록된 슬라이드가 없습니다.</p>
      )}
    </section>
  );
}
