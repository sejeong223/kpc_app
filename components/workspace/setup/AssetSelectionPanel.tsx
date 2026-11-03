"use client";
import { useState } from "react";
import Link from "next/link";
import { DadamButton, DadamSelect } from "@/components/ui/DadamControls";
import { useAdminRuntime } from "@/components/admin/AdminRuntimeProvider";
import { useWorkspaceAssets } from "@/hooks/workspace/use-workspace-assets";
import type {
  ProjectView,
  WorkspaceAssetChoice,
  WorkspaceAssetKind,
} from "@/types/workspace-production";
import { workspaceCard, WorkspaceErrorText } from "../shared/WorkspaceUi";
import AppliedAssetDetail from "./AppliedAssetDetail";
import AssetReapplyDialog from "./AssetReapplyDialog";
export default function AssetSelectionPanel({
  view,
  kind,
}: {
  view: ProjectView;
  kind: WorkspaceAssetKind;
}) {
  const query = useWorkspaceAssets(view.project.id, kind),
    admin = useAdminRuntime(),
    [selected, setSelected] = useState(""),
    [confirm, setConfirm] = useState<WorkspaceAssetChoice | null>(null),
    [detail, setDetail] = useState(false);
  const pin = view.state.pins.find(
      (p) =>
        p.id ===
        view.state.body.settings[
          kind === "prompt"
            ? "promptPinId"
            : kind === "skill"
              ? "skillPinId"
              : "templatePinId"
        ],
    ),
    access = view.assetAccess.find((a) => a.pinId === pin?.id)?.access,
    latest = query.data?.find((c) => c.id === pin?.assetId),
    choice = query.data?.find((c) => c.id === selected),
    label =
      kind === "prompt"
        ? "프롬프트 세트"
        : kind === "skill"
          ? "Skill"
          : "Template";
  return (
    <section className={workspaceCard}>
      <header className="tw:flex tw:flex-wrap tw:items-center tw:gap-2">
        <h2 className="tw:m-0 tw:text-base">{label}</h2>
        <span>
          {pin ? pin.name + " · 적용 v" + pin.revision : "선택한 자산 없음"}
        </span>
        {pin && access?.status === "available" && (
          <DadamButton onClick={() => setDetail((v) => !v)}>
            {detail ? "상세 닫기" : "자세히 보기"}
          </DadamButton>
        )}
      </header>
      {pin && (
        <p className="tw:text-sm">
          {latest
            ? "최신 v" +
              latest.revision +
              (latest.revision === pin.revision
                ? " · 최신 버전 사용 중"
                : " · 업데이트 있음")
            : "새 선택 대상에서 제외되었거나 카탈로그를 확인할 수 없습니다."}{" "}
          ·{" "}
          {access?.status === "available"
            ? "현재 이용 가능"
            : (access?.reason ?? "이용 권한 확인 중")}
        </p>
      )}
      {pin && access?.status !== "available" && (
        <p role="status">
          프로젝트 사본과 본문은 보존됩니다. 원본과 현재 이용 권한을 확인할 수
          없어 이 자산을 사용하는 생성·재적용·다운로드는 제한됩니다. 사용 가능한
          자산을 다시 선택해 주세요.
        </p>
      )}
      <WorkspaceErrorText error={query.error} />
      {query.isPending && (
        <p role="status">이용 가능한 자산을 조회하고 있습니다.</p>
      )}
      {view.capabilities.actions.setup && (
        <div className="tw:my-3 tw:flex tw:flex-wrap tw:gap-2">
          <DadamSelect
            aria-label={label + " 선택"}
            value={selected}
            disabled={query.isPending}
            onChange={(_, d) => setSelected(d.value)}
          >
            <option value="">자산을 선택하세요</option>
            {query.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} · v{c.revision} · {c.ownerDepartmentId ?? "공통"}
              </option>
            ))}
          </DadamSelect>
          <DadamButton
            disabled={!choice}
            onClick={() => {
              if (choice) setConfirm(choice);
            }}
          >
            변경 확인
          </DadamButton>
          {latest && latest.revision !== pin?.revision && (
            <DadamButton onClick={() => setConfirm(latest)}>
              최신 버전 재적용
            </DadamButton>
          )}
        </div>
      )}
      {query.isSuccess && !query.data.length && (
        <p>
          선택 가능한 {label}이 없습니다.{" "}
          {admin.actor.role !== "user" ? (
            <Link
              href={
                kind === "template"
                  ? "/workspace/templates"
                  : kind === "skill"
                    ? "/workspace/skills"
                    : "/workspace/prompt-sets"
              }
            >
              관리 메뉴에서 등록
            </Link>
          ) : (
            "관리자에게 공개된 자산 등록을 요청해 주세요."
          )}
        </p>
      )}
      {pin && detail && access?.status === "available" && (
        <AppliedAssetDetail
          key={pin.id}
          projectId={view.project.id}
          pin={pin}
        />
      )}
      {confirm && (
        <AssetReapplyDialog
          key={confirm.revisionId}
          view={view}
          choice={confirm}
          onClose={() => setConfirm(null)}
        />
      )}
    </section>
  );
}
