"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import ModalFrame from "@/components/ui/ModalFrame";
import { DadamButton, DadamCheckbox } from "@/components/ui/DadamControls";
import type {
  ProjectView,
  WorkspaceAssetChoice,
} from "@/types/workspace-production";
import { useWorkspaceRuntime } from "../WorkspaceProjectProvider";
import { useApplyWorkspaceAssets } from "@/hooks/workspace/use-workspace-assets";
import {
  activeWorkspaceRead,
  workspaceQueryOptions,
} from "@/hooks/workspace/use-workspace-production";
import {
  DraftProtection,
  requestFor,
  WorkspaceErrorText,
} from "../shared/WorkspaceUi";
import SkillRuleSummary from "./SkillRuleSummary";
export default function AssetReapplyDialog({
  view,
  choice,
  onClose,
}: {
  view: ProjectView;
  choice: WorkspaceAssetChoice;
  onClose(): void;
}) {
  const runtime = useWorkspaceRuntime(),
    mutation = useApplyWorkspaceAssets(),
    [request] = useState(() => requestFor(view)),
    [selected, setSelected] = useState<string[]>([]),
    selection = {
      kind: choice.kind,
      assetId: choice.id,
      revisionId: choice.revisionId,
    },
    current = view.state.pins.find(
      (p) =>
        p.id ===
        view.state.body.settings[
          choice.kind === "prompt"
            ? "promptPinId"
            : choice.kind === "skill"
              ? "skillPinId"
              : "templatePinId"
        ],
    );
  const detail = useQuery({
    ...workspaceQueryOptions,
    queryKey: [
      ...runtime.queryScope,
      "asset-candidate",
      view.project.id,
      choice.id,
      choice.revisionId,
    ],
    queryFn: ({ signal }) =>
      activeWorkspaceRead(
        runtime,
        () => runtime.assets.describe(view.project.id, selection),
        signal,
      ),
  });
  const apply = async () => {
    await mutation.mutateAsync({
      ...request,
      selections: [selection],
      replaceSlideIds: selected,
    });
    onClose();
  };
  return (
    <>
      <ModalFrame
        open
        title="프로젝트 자산 적용"
        contentKey={choice.revisionId}
        width={800}
        onClose={() => {
          if (!mutation.isPending) onClose();
        }}
        footer={
          <>
            <DadamButton disabled={mutation.isPending} onClick={onClose}>
              취소
            </DadamButton>
            {view.capabilities.actions.setup && (
              <DadamButton
                appearance="primary"
                disabled={mutation.isPending || !detail.data || !!detail.error}
                onClick={() => {
                  void apply().catch(() => {});
                }}
              >
                확인 후 적용
              </DadamButton>
            )}
          </>
        }
      >
        <p>
          {current ? current.name + " v" + current.revision : "미선택"} →{" "}
          <strong>
            {choice.name} v{choice.revision}
          </strong>
        </p>
        <p>
          선택하지 않은 기존 슬라이드와 과거 보관본은 유지됩니다. 기본 설정은
          이후 추가하는 슬라이드에 사용됩니다.
        </p>
        {choice.kind === "template" && (
          <p>
            원본이 다른 Template은 기존 요소 매핑이 해제됩니다. 제작 화면에서
            내용과 역할을 다시 연결해야 합니다.
          </p>
        )}
        <WorkspaceErrorText error={detail.error} />
        {detail.data && (
          <details>
            <summary>변경할 자산의 실제 설정 확인</summary>
            <p>{detail.data.snapshot.description || "설명 없음"}</p>
            {"kind" in detail.data.snapshot &&
            detail.data.snapshot.kind === "skill" ? (
              <SkillRuleSummary rules={detail.data.snapshot.rules} />
            ) : (
              <pre className="tw:max-h-60 tw:overflow-auto tw:whitespace-pre-wrap tw:text-xs">
                {JSON.stringify(
                  "items" in detail.data.snapshot
                    ? detail.data.snapshot.items
                    : detail.data.snapshot.definition,
                  null,
                  2,
                )}
              </pre>
            )}
          </details>
        )}
        <fieldset className="tw:rounded-lg tw:border tw:border-solid tw:border-(--kpc-line) tw:p-3">
          <legend>기존 슬라이드에도 적용 (선택)</legend>
          {view.state.body.slides.map((slide) =>
            view.capabilities.editableSectionIds.includes(slide.sectionId) ? (
              <DadamCheckbox
                key={slide.id}
                label={slide.content.title || "제목 없음"}
                checked={selected.includes(slide.id)}
                disabled={mutation.isPending}
                onChange={(_, d) =>
                  setSelected((ids) =>
                    d.checked
                      ? [...ids, slide.id]
                      : ids.filter((id) => id !== slide.id),
                  )
                }
              />
            ) : (
              <p key={slide.id}>
                {slide.content.title || "제목 없음"} · 고정 또는 편집 권한 없음
              </p>
            ),
          )}
        </fieldset>
        <WorkspaceErrorText error={mutation.error} />
      </ModalFrame>
      <DraftProtection
        dirty={selected.length > 0}
        busy={mutation.isPending}
        onSave={apply}
        onDiscard={onClose}
      />
    </>
  );
}
