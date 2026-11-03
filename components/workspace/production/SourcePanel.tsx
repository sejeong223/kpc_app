"use client";
import { useState } from "react";
import { DadamButton, DadamSelect } from "@/components/ui/DadamControls";
import { useFileWorkspace } from "@/hooks/workspace/use-workspace-files";
import {
  loadProjectView,
  useWorkspaceCommand,
} from "@/hooks/workspace/use-workspace-production";
import type {
  ProjectView,
  ProposalSlide,
  SourceRef,
} from "@/types/workspace-production";
import type { FileResourceView } from "@/types/workspace-files";
import FilePreviewDialog from "../files/FilePreviewDialog";
import {
  requestFor,
  workspaceCard,
  WorkspaceErrorText,
} from "../shared/WorkspaceUi";
import { useWorkspaceRuntime } from "../WorkspaceProjectProvider";
import RequirementCoverage from "./RequirementCoverage";
export default function SourcePanel({
  view,
  slide,
  snapshotId,
  onSlide,
  comments,
}: {
  view: ProjectView;
  slide: ProposalSlide | null;
  snapshotId: string | null;
  onSlide(id: string): void;
  comments?: React.ReactNode;
}) {
  const runtime = useWorkspaceRuntime(),
    [sourceError, setSourceError] = useState<string | null>(null);
  const [tab, setTab] = useState<"requirements" | "files" | "comments">(
      "requirements",
    ),
    [preview, setPreview] = useState<{
      resource: FileResourceView;
      round: number;
    } | null>(null),
    query = useFileWorkspace(view.project.id),
    mutation = useWorkspaceCommand(),
    round = view.state.currentRound,
    snapshot = view.state.snapshots.find((s) => s.id === snapshotId),
    resources =
      query.data?.rounds
        .find((r) => r.number === round)
        ?.resources.filter(
          (r) =>
            !snapshot ||
            snapshot.fileEntries.some((e) => e.versionId === r.version.id),
        ) ?? [],
    can =
      !!slide && view.capabilities.editableSectionIds.includes(slide.sectionId),
    open = [
      ...view.state.body.threads,
      ...view.state.reviews.filter((t) => t.round === round),
    ].filter((t) => t.status === "open");
  const updateSources = (update: (sources: SourceRef[]) => SourceRef[]) => {
    if (!slide) return;
    setSourceError(null);
    void runtime
      .navigate(async () => {
        const fresh = await loadProjectView(runtime, view.project.id),
          current = fresh.state.body.slides.find((s) => s.id === slide.id);
        if (!current) throw new Error("슬라이드가 변경되었습니다.");
        await mutation.mutateAsync({
          ...requestFor(fresh),
          operation: {
            type: "set-sources",
            id: slide.id,
            sources: update(current.sources),
          },
        });
      })
      .catch((e) =>
        setSourceError(
          e instanceof Error ? e.message : "자료 연결을 저장하지 못했습니다.",
        ),
      );
  };
  const sourceResources = (slide?.sources ?? []).map((ref) => ({
    ref,
    resource: query.data?.rounds
      .find((r) => r.number === ref.fileRound)
      ?.resources.find((r) => r.version.id === ref.versionId),
  }));
  return (
    <section className={workspaceCard}>
      <div
        role="tablist"
        aria-label="작성 근거"
        className="tw:mb-3 tw:flex tw:flex-wrap tw:gap-1"
      >
        {(
          [
            [
              "requirements",
              "RFP 근거",
              view.state.body.requirements.filter(
                (r) => r.sectionId === slide?.sectionId || !r.sectionId,
              ).length,
            ],
            ["files", "자료", slide?.sources.length ?? 0],
            ["comments", "의견", open.length],
          ] as const
        ).map(([key, label, count]) => (
          <DadamButton
            key={key}
            role="tab"
            size="small"
            aria-selected={tab === key}
            appearance={tab === key ? "primary" : "subtle"}
            onClick={() => {
              void runtime.navigate(async () => setTab(key));
            }}
          >
            {label} {count}
          </DadamButton>
        ))}
      </div>
      {tab === "requirements" && (
        <RequirementCoverage view={view} sectionId={slide?.sectionId ?? null} />
      )}
      {tab === "files" && (
        <>
          <WorkspaceErrorText error={query.error} />
          <WorkspaceErrorText error={sourceError ?? mutation.error} />
          {sourceResources.map(({ ref, resource }) => (
            <article
              key={ref.id}
              className="tw:mb-3 tw:border-b tw:border-(--kpc-line) tw:pb-2"
            >
              <strong className="tw:break-words tw:text-sm">
                {resource?.version.label ??
                  view.state.body.requirements.find(
                    (r) => r.id === ref.targetId,
                  )?.title ??
                  "원본 확인 필요"}
              </strong>
              <p className="tw:my-1 tw:text-xs">
                {ref.provenance === "mock"
                  ? "Mock 근거"
                  : ref.page
                    ? "원문 " + ref.page + "쪽"
                    : "원문 위치 미지정"}
              </p>
              {ref.quote && (
                <p className="tw:whitespace-pre-wrap tw:text-sm">{ref.quote}</p>
              )}
              {resource && ref.fileRound && (
                <DadamButton
                  size="small"
                  onClick={() =>
                    setPreview({ resource, round: ref.fileRound! })
                  }
                >
                  원문 열기
                </DadamButton>
              )}
              {can && (
                <DadamButton
                  size="small"
                  disabled={mutation.isPending}
                  onClick={() =>
                    updateSources((sources) =>
                      sources.filter((s) => s.id !== ref.id),
                    )
                  }
                >
                  출처 제거
                </DadamButton>
              )}
            </article>
          ))}
          {can && (
            <label>
              실제 자료 연결
              <DadamSelect
                aria-label="현재 회차 자료 연결"
                value=""
                disabled={mutation.isPending}
                onChange={(_, d) => {
                  const r = resources.find((r) => r.version.id === d.value);
                  if (r)
                    updateSources((sources) => [
                      ...sources,
                      {
                        id: crypto.randomUUID(),
                        kind: "file",
                        targetId: r.asset.id,
                        versionId: r.version.id,
                        fileRound: round,
                        page: null,
                        quote: null,
                        provenance: "manual",
                      },
                    ]);
                }}
              >
                <option value="">자료 선택</option>
                {resources
                  .filter(
                    (r) =>
                      !slide?.sources.some(
                        (s) =>
                          s.versionId === r.version.id && s.fileRound === round,
                      ),
                  )
                  .map((r) => (
                    <option key={r.version.id} value={r.version.id}>
                      {r.version.label}
                    </option>
                  ))}
              </DadamSelect>
            </label>
          )}
          {!sourceResources.length && <p>연결된 출처가 없습니다.</p>}
        </>
      )}
      {tab === "comments" && (
        <>
          <h3 className="tw:text-sm">프로젝트 미처리 의견</h3>
          {open.map((t) => (
            <DadamButton
              key={t.id}
              size="small"
              onClick={() => onSlide(t.slideId)}
            >
              {
                view.state.body.sections.find((s) => s.id === t.sectionId)
                  ?.title
              }{" "}
              · 의견 #{t.number}
            </DadamButton>
          ))}
          {!open.length && <p>미처리 의견이 없습니다.</p>}
          {comments}
        </>
      )}
      {preview && (
        <FilePreviewDialog
          key={preview.resource.version.id}
          open
          projectId={view.project.id}
          resource={preview.resource}
          round={preview.round}
          onClose={() => setPreview(null)}
        />
      )}
    </section>
  );
}
