"use client";
import { useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { DadamButton } from "@/components/ui/DadamControls";
import TemplateSlidePreview from "@/components/admin/templates/workbench/TemplateSlidePreview";
import { useWorkspaceRuntime } from "../WorkspaceProjectProvider";
import { activeWorkspaceRead } from "@/hooks/workspace/use-workspace-production";
import { workspaceQueryKeys } from "@/lib/workspace/production/query-keys";
import type {
  ProjectView,
  ProposalSlide,
  SlideContent,
  SlideTemplateRef,
} from "@/types/workspace-production";
import type { WorkspaceError } from "@/lib/workspace/production/errors";
import type { TemplatePreviewData } from "@/types/template-work";
import { workspaceCard, WorkspaceErrorText } from "../shared/WorkspaceUi";
export default function ProductionPreview({
  view,
  slide,
  snapshotId,
  content,
  template,
  dirty,
  overlay,
}: {
  view: ProjectView;
  slide: ProposalSlide;
  snapshotId: string | null;
  content: SlideContent;
  template: SlideTemplateRef | null;
  dirty: boolean;
  overlay?: React.ReactNode;
}) {
  const runtime = useWorkspaceRuntime(),
    abort = useRef<AbortController | null>(null),
    signature = JSON.stringify([
      view.state.revision,
      slide.id,
      content,
      template,
      snapshotId,
      view.assetAccess,
    ]);
  const mutation = useMutation<
    { preview: TemplatePreviewData; warnings: string[]; signature: string },
    WorkspaceError,
    void
  >({
    mutationKey: workspaceQueryKeys(runtime.queryScope).mutation,
    retry: false,
    gcTime: 0,
    mutationFn: async () => {
      abort.current?.abort();
      const controller = new AbortController();
      abort.current = controller;
      const result = await activeWorkspaceRead(
        runtime,
        () =>
          runtime.service.previewSlide(
            {
              projectId: view.project.id,
              slideId: slide.id,
              snapshotId,
              ...(dirty ? { content, template: template ?? undefined } : {}),
            },
            controller.signal,
          ),
        controller.signal,
      );
      return { ...result, signature };
    },
  });
  useEffect(() => () => abort.current?.abort(), [signature]);
  const unavailable = [
      template?.pinId,
      slide.usedSettings.skillPinId,
      slide.usedSettings.promptPinId,
    ]
      .filter(Boolean)
      .some(
        (id) =>
          view.assetAccess.find((a) => a.pinId === id)?.access.status !==
          "available",
      ),
    data =
      mutation.data?.signature === signature && !mutation.error
        ? mutation.data
        : null;
  return (
    <section className={workspaceCard}>
      <header className="tw:mb-2 tw:flex tw:items-center tw:gap-2">
        <strong className="tw:mr-auto tw:text-sm">구조 미리보기</strong>
        {!unavailable && template && (
          <DadamButton
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            미리보기 갱신
          </DadamButton>
        )}
        {mutation.isPending && (
          <DadamButton onClick={() => abort.current?.abort()}>취소</DadamButton>
        )}
      </header>
      {unavailable ? (
        <p>
          사용 중인 자산의 원본 또는 현재 권한을 확인할 수 없습니다. 제작
          설정에서 재선택해 주세요.
        </p>
      ) : !template ? (
        <p>Template 슬라이드와 내용 칸을 연결해 주세요.</p>
      ) : data ? (
        <>
          <div className="tw:relative">
            <TemplateSlidePreview
              document={data.preview}
              slideIndex={
                data.preview.slides.find(
                  (s) => s.path === template.sourceSlidePath,
                )?.index ?? 0
              }
              selectedObjectId={null}
              onSelect={() => {}}
            />
            {overlay}
          </div>
          <ul>
            {data.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </>
      ) : (
        <p>
          {mutation.isPending
            ? "미리보기를 생성하고 있습니다."
            : "현재 내용의 미리보기를 갱신해 주세요."}
        </p>
      )}
      <WorkspaceErrorText error={mutation.error} />
      <small>PowerPoint 렌더링과 다를 수 있는 구조 미리보기입니다.</small>
    </section>
  );
}
