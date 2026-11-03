"use client";
import { useEffect, useRef, useState } from "react";
import CommentPin from "@/components/comments/CommentPin";
import ModalFrame from "@/components/ui/ModalFrame";
import { DadamButton, DadamInput } from "@/components/ui/DadamControls";
import { useWorkspaceRuntime } from "../../WorkspaceProjectProvider";
import { useProjectComments } from "@/hooks/workspace/use-project-comments";
import { pointInsideSlide } from "@/lib/workspace/production/comment-selectors";
import { ratioToClientPoint } from "@/lib/comments/geometry";
import type { ProjectView, ProjectRequest } from "@/types/workspace-production";
import type { CommentPoint } from "@/config/comments";
import {
  DraftProtection,
  requestFor,
  WorkspaceErrorText,
} from "../../shared/WorkspaceUi";
import ProjectComments from "./ProjectComments";
export default function ProjectCommentPins({
  view,
  slideId,
  snapshotId,
}: {
  view: ProjectView;
  slideId: string;
  snapshotId: string | null;
}) {
  const runtime = useWorkspaceRuntime(),
    comments = useProjectComments(view, slideId, snapshotId),
    surface = useRef<HTMLDivElement>(null),
    [size, setSize] = useState({ width: 0, height: 0 }),
    [placing, setPlacing] = useState(false),
    [opened, setOpened] = useState<{
      threadId: string | null;
      point: CommentPoint | null;
    } | null>(null),
    [move, setMove] = useState<{
      threadId: string;
      point: CommentPoint | null;
      request: ProjectRequest;
    } | null>(null);
  useEffect(() => {
    const node = surface.current;
    if (!node) return;
    const measure = () => {
      const rect = node.getBoundingClientRect();
      setSize({ width: rect.width, height: rect.height });
    };
    const frame = requestAnimationFrame(measure);
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);
  const requestMove = (threadId: string, point: CommentPoint | null) => {
    if (comments.movableThreadIds.includes(threadId))
      void runtime.navigate(async () =>
        setMove({ threadId, point, request: requestFor(view) }),
      );
  };
  const save = async () => {
    if (!move) return;
    await comments.mutation.mutateAsync({
      ...move.request,
      operation: {
        type: "comment-move",
        threadId: move.threadId,
        point: move.point,
        review: comments.review,
      },
    });
    setMove(null);
  };
  return (
    <>
      <div
        ref={surface}
        aria-label="슬라이드 의견 위치"
        className={
          "tw:absolute tw:inset-0 " +
          (placing ? "tw:cursor-crosshair" : "tw:pointer-events-none")
        }
        onClick={(e) => {
          if (
            !placing ||
            (e.target instanceof Element && e.target.closest("button"))
          )
            return;
          const rect = surface.current?.getBoundingClientRect();
          if (!rect) return;
          const point = pointInsideSlide({ x: e.clientX, y: e.clientY }, rect);
          if (point) {
            setPlacing(false);
            setOpened({ threadId: null, point });
          }
        }}
      >
        <div className="tw:pointer-events-auto tw:absolute tw:right-1 tw:top-1 tw:z-10">
          {comments.canCreate && (
            <DadamButton
              size="small"
              onClick={() => {
                void runtime.navigate(async () => setPlacing((v) => !v));
              }}
            >
              {placing ? "위치 선택 취소" : "위치에 의견"}
            </DadamButton>
          )}
        </div>
        {placing && (
          <p
            role="status"
            className="tw:pointer-events-none tw:absolute tw:bottom-0 tw:left-0 tw:right-0 tw:m-0 tw:bg-white/95 tw:p-2 tw:text-xs"
          >
            미리보기 안에서 위치를 선택하세요. 위치 없이도 출처·의견 패널에서
            작성할 수 있습니다.
          </p>
        )}
        <span id={"project-pin-help-" + slideId} className="tw:sr-only">
          Enter로 의견 열기. 내 의견은 방향키로 위치를 조정한 뒤 확인합니다.
        </span>
        {comments.threads
          .filter((t) => t.point)
          .map((t) => (
            <div key={t.id} className="tw:pointer-events-auto">
              <CommentPin
                pinId={t.id}
                number={t.number}
                status={t.status}
                position={ratioToClientPoint(t.point!, {
                  left: 0,
                  top: 0,
                  right: size.width,
                  bottom: size.height,
                })}
                selected={opened?.threadId === t.id}
                disabled={comments.mutation.isPending}
                previewId={"project-pin-help-" + slideId}
                onActivate={() => {
                  void runtime.navigate(async () =>
                    setOpened({ threadId: t.id, point: null }),
                  );
                }}
                onPreview={() => {}}
                onPointerDown={() => {}}
                onKeyDown={(e) => {
                  const delta = e.shiftKey ? 0.05 : 0.01;
                  if (
                    [
                      "ArrowLeft",
                      "ArrowRight",
                      "ArrowUp",
                      "ArrowDown",
                    ].includes(e.key) &&
                    comments.movableThreadIds.includes(t.id)
                  ) {
                    e.preventDefault();
                    requestMove(t.id, {
                      xRatio: Math.max(
                        0,
                        Math.min(
                          1,
                          t.point!.xRatio +
                            (e.key === "ArrowLeft"
                              ? -delta
                              : e.key === "ArrowRight"
                                ? delta
                                : 0),
                        ),
                      ),
                      yRatio: Math.max(
                        0,
                        Math.min(
                          1,
                          t.point!.yRatio +
                            (e.key === "ArrowUp"
                              ? -delta
                              : e.key === "ArrowDown"
                                ? delta
                                : 0),
                        ),
                      ),
                    });
                  }
                }}
              />
            </div>
          ))}
      </div>
      {opened && (
        <ModalFrame
          open
          title="슬라이드 의견"
          contentKey={opened.threadId ?? "new"}
          width={580}
          onClose={() => {
            void runtime.navigate(async () => setOpened(null));
          }}
          footer={
            <>
              <DadamButton
                onClick={() => {
                  void runtime.navigate(async () => setOpened(null));
                }}
              >
                닫기
              </DadamButton>
              {opened.threadId &&
                comments.movableThreadIds.includes(opened.threadId) && (
                  <DadamButton
                    onClick={() =>
                      requestMove(
                        opened.threadId!,
                        comments.threads.find((t) => t.id === opened.threadId)
                          ?.point ?? null,
                      )
                    }
                  >
                    위치 조정
                  </DadamButton>
                )}
            </>
          }
        >
          <ProjectComments
            key={opened.threadId ?? JSON.stringify(opened.point)}
            view={view}
            slideId={slideId}
            snapshotId={snapshotId}
            initialPoint={opened.point}
            initialThreadId={opened.threadId}
          />
        </ModalFrame>
      )}
      {move && (
        <ModalFrame
          open
          title="의견 위치 조정"
          contentKey={move.threadId}
          onClose={() => {
            if (!comments.mutation.isPending) setMove(null);
          }}
          footer={
            <>
              <DadamButton
                disabled={comments.mutation.isPending}
                onClick={() => setMove(null)}
              >
                취소
              </DadamButton>
              <DadamButton
                appearance="primary"
                disabled={comments.mutation.isPending}
                onClick={() => {
                  void save().catch(() => {});
                }}
              >
                위치 저장
              </DadamButton>
            </>
          }
        >
          <p>
            슬라이드 안의 상대 위치(0~100%)를 지정합니다. 확인 전에는 저장된
            핀이 이동하지 않습니다.
          </p>
          {(["xRatio", "yRatio"] as const).map((key, i) => (
            <label key={key}>
              {i === 0 ? "가로" : "세로"} 위치 %
              <DadamInput
                type="number"
                min={0}
                max={100}
                value={String(Math.round((move.point?.[key] ?? 0.5) * 100))}
                onChange={(_, d) => {
                  const value = Number(d.value);
                  if (Number.isFinite(value))
                    setMove({
                      ...move,
                      point: {
                        ...(move.point ?? { xRatio: 0.5, yRatio: 0.5 }),
                        [key]: Math.min(1, Math.max(0, value / 100)),
                      },
                    });
                }}
              />
            </label>
          ))}
          <DadamButton onClick={() => setMove({ ...move, point: null })}>
            위치 없음으로 변경
          </DadamButton>
          {move.point === null && <p>위치 없이 목록에만 표시합니다.</p>}
          <WorkspaceErrorText error={comments.mutation.error} />
        </ModalFrame>
      )}
      <DraftProtection
        dirty={!!move}
        busy={comments.mutation.isPending}
        onSave={save}
        onDiscard={() => setMove(null)}
      />
    </>
  );
}
