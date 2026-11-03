"use client";
import { useState } from "react";
import ModalFrame from "@/components/ui/ModalFrame";
import { DadamButton, DadamCheckbox } from "@/components/ui/DadamControls";
import type {
  ImportedPpt,
  ImportMapping,
  ProjectView,
} from "@/types/workspace-production";
import ContentDiff from "./ContentDiff";
import PptMappingEditor from "./PptMappingEditor";
import { WorkspaceErrorText } from "../shared/WorkspaceUi";
import { pinsAvailable } from "@/lib/workspace/production/diff";
import { slidePinIds } from "@/lib/workspace/production/clipboard";
export default function PptImportReview({
  value,
  view,
  busy,
  error,
  mapping,
  onApply,
  onRemap,
  onDownload,
  onClose,
}: {
  value: ImportedPpt;
  view: ProjectView;
  busy: boolean;
  error: string | null;
  mapping: ImportMapping[];
  onApply(ids: string[]): void;
  onRemap(mapping: ImportMapping[]): void;
  onDownload(): void;
  onClose(): void;
}) {
  const version = view.state.pptVersions.find((v) => v.id === value.versionId),
    sourceAllowed = !!version && pinsAvailable(view, version.pinIds),
    allowed = (id: string) => {
      const s = view.state.body.slides.find((s) => s.id === id);
      return (
        sourceAllowed &&
        view.state.phase === "writing" &&
        !!s &&
        view.capabilities.editableSectionIds.includes(s.sectionId) &&
        pinsAvailable(view, slidePinIds([s]))
      );
    },
    [selected, setSelected] = useState(() =>
      value.comparison.changes
        .filter((c) => allowed(c.slideId))
        .map((c) => c.id),
    ),
    changes = value.comparison.changes,
    ids = selected.filter((id) =>
      changes.some((c) => c.id === id && allowed(c.slideId)),
    ),
    stale = view.state.revision !== value.baseRevision;
  return (
    <ModalFrame
      open
      title="수정본 비교 · 원본 보관 완료"
      subtitle="원본 등록과 웹 본문 적용은 별개입니다. 닫거나 적용에 실패해도 원본은 버전 이력에 남습니다."
      contentKey={value.sessionId}
      width={1080}
      onClose={() => {
        if (!busy) onClose();
      }}
      footer={
        <>
          <DadamButton disabled={busy} onClick={onClose}>
            적용하지 않고 닫기
          </DadamButton>
          {sourceAllowed && (
            <DadamButton disabled={busy} onClick={onDownload}>
              수정본 원본 다운로드
            </DadamButton>
          )}
          {changes.some((c) => allowed(c.slideId)) && (
            <DadamButton
              appearance="primary"
              disabled={busy || !ids.length || stale}
              onClick={() => onApply(ids)}
            >
              선택 {ids.length}개 적용
            </DadamButton>
          )}
        </>
      }
    >
      <p>
        외부 {value.comparison.externalSlideCount}장 · 대응된 현재 슬라이드{" "}
        {value.comparison.matchedSlideIds.length}장 · 지원 내용 변경{" "}
        {changes.length}개
      </p>
      <p>
        디자인·좌표·순서·이미지 변경은 자동 반영하지 않습니다. 적용하지 않은
        내용은 원본 파일에서 확인할 수 있습니다.
      </p>
      {stale && (
        <p role="alert">
          비교 후 본문이 바뀌었습니다. 현재 내용을 기준으로 다시 비교해 주세요.
        </p>
      )}
      <WorkspaceErrorText error={error} />
      {changes.map((c) => (
        <article
          key={c.id}
          className="tw:mb-3 tw:rounded-lg tw:border tw:border-solid tw:border-(--kpc-line) tw:p-3"
        >
          {allowed(c.slideId) ? (
            <DadamCheckbox
              label={
                (view.state.body.slides.find((s) => s.id === c.slideId)?.content
                  .title ?? "슬라이드") +
                " / " +
                c.key +
                " 적용"
              }
              checked={ids.includes(c.id)}
              disabled={busy || stale}
              onChange={(_, d) =>
                setSelected((v) =>
                  d.checked ? [...v, c.id] : v.filter((id) => id !== c.id),
                )
              }
            />
          ) : (
            <p>고정 또는 편집 권한 없음 · {c.key}</p>
          )}
          <ContentDiff before={c.before} after={c.after} />
        </article>
      ))}
      <details open={value.comparison.issues.length > 0}>
        <summary>미연결·지원 제외 {value.comparison.issues.length}건</summary>
        <ul>
          {value.comparison.issues.map((issue, i) => (
            <li key={i}>
              {issue.externalPath ?? ""} · {issue.message}
            </li>
          ))}
        </ul>
      </details>
      {!sourceAllowed && (
        <p role="alert">
          원본·현재 이용 권한을 확인할 수 없습니다. 제작 설정에서 자산을 다시
          선택해 주세요.
        </p>
      )}
      {sourceAllowed &&
        view.state.phase === "writing" &&
        view.capabilities.editableSectionIds.length > 0 && (
          <PptMappingEditor
            comparison={value.comparison}
            view={view}
            busy={busy}
            initial={mapping}
            onRemap={onRemap}
          />
        )}
    </ModalFrame>
  );
}
