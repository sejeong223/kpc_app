"use client";
import Link from "next/link";
import { workspaceHref } from "@/lib/workspace/production/routing";
import { useEffect, useRef, useState } from "react";
import { DadamButton, DadamSelect } from "@/components/ui/DadamControls";
import ModalFrame from "@/components/ui/ModalFrame";
import { useWorkspacePpt } from "@/hooks/workspace/use-workspace-ppt";
import { loadProjectView } from "@/hooks/workspace/use-workspace-production";
import { useWorkspaceRuntime } from "../WorkspaceProjectProvider";
import type {
  ImportedPpt,
  ImportMapping,
  ProjectView,
  ProjectRequest,
} from "@/types/workspace-production";
import { slidePinIds } from "@/lib/workspace/production/clipboard";
import { pinsAvailable } from "@/lib/workspace/production/diff";
import { DraftProtection, requestFor } from "../shared/WorkspaceUi";
import PptVersionHistory from "./PptVersionHistory";
import PptImportReview from "./PptImportReview";
import ProductionJobStatus from "./ProductionJobStatus";
export default function PptControls({
  view,
  liveView,
  snapshotId,
}: {
  view: ProjectView;
  liveView: ProjectView;
  snapshotId: string | null;
}) {
  const runtime = useWorkspaceRuntime(),
    ppt = useWorkspacePpt(),
    generation = useRef(0);
  const [open, setOpen] = useState(false),
    [upload, setUpload] = useState<{
      request: ProjectRequest;
      file: File | null;
      baseVersionId: string | null;
    } | null>(null);
  const [review, setReview] = useState<ImportedPpt | null>(null),
    [mapping, setMapping] = useState<ImportMapping[]>([]),
    [notice, setNotice] = useState<string | null>(null),
    [localError, setLocalError] = useState<string | null>(null);
  useEffect(
    () => () => {
      generation.current++;
    },
    [],
  );
  const busy = ppt.task.isPending,
    applying = busy && ppt.task.variables?.kind === "apply";
  const canImport =
    !snapshotId &&
    liveView.state.phase === "writing" &&
    liveView.capabilities.editableSectionIds.length > 0;
  const missing = !pinsAvailable(view, slidePinIds(view.state.body.slides)),
    canGenerate = view.state.body.slides.length > 0 && !missing;
  const unmapped = view.state.body.slides.filter(
    (slide) =>
      !slide.template ||
      [
        ...(slide.content.title ? ["title"] : []),
        ...(slide.content.lead ? ["lead"] : []),
        ...slide.content.blocks.map((b) => b.id),
      ].some((key) => !slide.template?.bindings.some((b) => b.key === key)),
  );
  const close = () => {
    if (applying) return;
    generation.current++;
    ppt.cancel();
    ppt.task.reset();
    setOpen(false);
    setUpload(null);
    setReview(null);
    setLocalError(null);
  };
  const report = (e: Error | string) =>
    setLocalError(typeof e === "string" ? e : e.message);
  const generate = () => {
    const current = generation.current;
    setLocalError(null);
    void runtime
      .navigate(async () => {
        const fresh = await loadProjectView(runtime, view.project.id);
        if (current !== generation.current) return;
        setNotice(null);
        const result = await ppt.task.mutateAsync({
          kind: "export",
          ...requestFor(fresh),
          snapshotId,
        });
        if (current === generation.current && result.kind === "export")
          setNotice(
            result.version.filename +
              " 생성·원본 확인 완료. 버전 이력에서 다운로드할 수 있습니다.",
          );
      })
      .catch((e) => {
        if (current === generation.current)
          report(e instanceof Error ? e : "PPT 생성에 실패했습니다.");
      });
  };
  const download = (versionId: string) =>
    ppt.task.mutate({
      kind: "download",
      projectId: view.project.id,
      versionId,
    });
  const compare = (versionId: string) => {
    const current = generation.current;
    setLocalError(null);
    void runtime
      .navigate(async () => {
        const fresh = await loadProjectView(runtime, view.project.id);
        if (current !== generation.current) return;
        const result = await ppt.task.mutateAsync({
          kind: "remap",
          ...requestFor(fresh),
          sessionId: "version:" + versionId,
          mapping: [],
        });
        if (current === generation.current && result.kind === "import") {
          setMapping([]);
          setReview(result.value);
        }
      })
      .catch((e) => {
        if (current === generation.current)
          report(e instanceof Error ? e : "비교에 실패했습니다.");
      });
  };
  const prepareUpload = () => {
    const current = generation.current;
    setLocalError(null);
    void runtime
      .navigate(async () => {
        const fresh = await loadProjectView(runtime, view.project.id);
        if (current === generation.current)
          setUpload({
            request: requestFor(fresh),
            file: null,
            baseVersionId:
              [...fresh.state.pptVersions]
                .reverse()
                .find((v) => v.kind === "generated")?.id ?? null,
          });
      })
      .catch((e) => {
        if (current === generation.current)
          report(e instanceof Error ? e : "등록 기준을 읽지 못했습니다.");
      });
  };
  const register = () => {
    if (!upload?.file) return;
    const current = generation.current;
    setLocalError(null);
    void ppt.task
      .mutateAsync({
        kind: "import",
        ...upload.request,
        file: upload.file,
        baseVersionId: upload.baseVersionId,
        mapping: [],
      })
      .then((result) => {
        if (current === generation.current && result.kind === "import") {
          setReview(result.value);
          setMapping([]);
          setUpload(null);
        }
      })
      .catch(() => {});
  };
  const remap = (next: ImportMapping[]) => {
    if (!review) return;
    const current = generation.current;
    void ppt.task
      .mutateAsync({
        kind: "remap",
        ...requestFor(liveView),
        sessionId: review.sessionId,
        mapping: next,
      })
      .then((result) => {
        if (current === generation.current && result.kind === "import") {
          setMapping(next);
          setReview(result.value);
        }
      })
      .catch(() => {});
  };
  return (
    <>
      <DadamButton
        onClick={() => {
          generation.current++;
          setOpen(true);
        }}
      >
        PPT 파일 · 버전 {liveView.state.pptVersions.length}
      </DadamButton>
      <DraftProtection dirty={!!upload?.file} busy={busy} onDiscard={close} />
      {open && (
        <ModalFrame
          open
          title="PPT 파일과 버전"
          contentKey={view.project.id}
          width={1120}
          onClose={close}
          footer={
            <DadamButton disabled={applying} onClick={close}>
              닫기
            </DadamButton>
          }
        >
          <div className="tw:flex tw:flex-wrap tw:gap-2">
            {canGenerate && (
              <DadamButton
                appearance="primary"
                disabled={busy || unmapped.length > 0}
                onClick={generate}
              >
                {snapshotId ? "선택 보관본 PPT 생성" : "현재 저장본 PPT 생성"}
              </DadamButton>
            )}
            {canImport && (
              <DadamButton disabled={busy} onClick={prepareUpload}>
                외부 수정본 등록
              </DadamButton>
            )}
          </div>
          {missing && (
            <p>
              사용 중인 자산의 원본 또는 현재 이용 권한을 확인할 수 없습니다.
              제작 설정에서 사용 가능한 자산을 다시 선택해 주세요.
            </p>
          )}
          {!view.state.body.slides.length && <p>출력할 슬라이드가 없습니다.</p>}
          {unmapped.length > 0 && (
            <div role="status">
              <p>
                내용 칸 연결이 필요한 슬라이드 {unmapped.length}장입니다. 제작
                화면에서 Template 슬라이드와 제목·본문·표·이미지의 칸을 연결해
                주세요.
              </p>
              <ul>
                {unmapped.map((slide) => (
                  <li key={slide.id}>
                    <Link
                      href={workspaceHref("write", {
                        projectId: view.project.id,
                        sectionId: slide.sectionId,
                        slideId: slide.id,
                        snapshotId,
                      })}
                    >
                      {slide.content.title || "제목 없음"} 연결 확인
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {notice && <p role="status">{notice}</p>}
          <ProductionJobStatus
            busy={busy}
            progress={ppt.progress}
            error={localError ?? ppt.task.error?.message ?? null}
            onCancel={applying ? undefined : ppt.cancel}
            onRetry={
              ppt.task.variables?.kind === "export" && canGenerate && !unmapped.length
                ? generate
                : undefined
            }
          />
          {upload && canImport && (
            <section className="tw:my-3 tw:rounded-lg tw:border tw:border-solid tw:border-(--kpc-line) tw:p-3">
              <label>
                기준 생성본
                <DadamSelect
                  value={upload.baseVersionId ?? ""}
                  disabled={busy}
                  onChange={(_, d) =>
                    setUpload({ ...upload, baseVersionId: d.value || null })
                  }
                >
                  <option value="">기준 없음 · 직접 연결</option>
                  {liveView.state.pptVersions
                    .filter(
                      (v) =>
                        v.kind === "generated" &&
                        pinsAvailable(liveView, v.pinIds),
                    )
                    .map((v) => (
                      <option key={v.id} value={v.id}>
                        v{v.index} · {v.round}회차 · {v.filename}
                      </option>
                    ))}
                </DadamSelect>
              </label>
              <label>
                수정본 .pptx (최대 250 MiB)
                <input
                  type="file"
                  accept=".pptx"
                  disabled={busy}
                  onChange={(e) =>
                    setUpload({ ...upload, file: e.target.files?.[0] ?? null })
                  }
                />
              </label>
              {upload.file && (
                <p>
                  {upload.file.name} ·{" "}
                  {upload.file.size.toLocaleString("ko-KR")} bytes
                </p>
              )}
              <DadamButton
                disabled={
                  busy ||
                  !upload.file ||
                  !upload.file.name.toLowerCase().endsWith(".pptx") ||
                  upload.file.size > 250 * 1024 * 1024
                }
                onClick={register}
              >
                원본 등록 후 비교
              </DadamButton>
              <DadamButton disabled={busy} onClick={() => setUpload(null)}>
                등록 취소
              </DadamButton>
              {upload.request.expectedRevision !== liveView.state.revision && (
                <p role="alert">
                  등록 준비 후 작업이 바뀌었습니다. 원본 파일을 유지하며{" "}
                  <DadamButton
                    disabled={busy}
                    onClick={() =>
                      setUpload({ ...upload, request: requestFor(liveView) })
                    }
                  >
                    현재 내용을 등록 기준으로 사용
                  </DadamButton>
                </p>
              )}
            </section>
          )}
          <PptVersionHistory
            view={liveView}
            busy={busy}
            canCompare={canImport}
            onDownload={download}
            onCompare={compare}
          />
        </ModalFrame>
      )}
      {review && (
        <PptImportReview
          key={review.sessionId}
          value={review}
          view={liveView}
          busy={busy}
          error={ppt.task.error?.message ?? null}
          mapping={mapping}
          onDownload={() => download(review.versionId)}
          onClose={() => {
            generation.current++;
            ppt.cancel();
            setReview(null);
            ppt.task.reset();
          }}
          onApply={(changeIds) => {
            const current = generation.current;
            void ppt.task
              .mutateAsync({
                kind: "apply",
                projectId: view.project.id,
                expectedRevision: review.baseRevision,
                expectedRound: liveView.state.currentRound,
                sessionId: review.sessionId,
                changeIds,
              })
              .then(() => {
                if (current === generation.current) {
                  setReview(null);
                  setNotice(
                    "선택한 변경 내용을 적용했습니다. 수정본 원본도 그대로 보관됩니다.",
                  );
                }
              })
              .catch(() => {});
          }}
          onRemap={remap}
        />
      )}
    </>
  );
}
