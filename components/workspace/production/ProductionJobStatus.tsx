"use client";
import { DadamButton } from "@/components/ui/DadamControls";
import type { WorkspaceProgress } from "@/types/workspace-production";
export default function ProductionJobStatus({
  busy,
  progress,
  error,
  onCancel,
  onRetry,
}: {
  busy: boolean;
  progress: WorkspaceProgress | null;
  error: string | null;
  onCancel?(): void;
  onRetry?(): void;
}) {
  if (!busy && !error) return null;
  return (
    <div
      role={error ? "alert" : "status"}
      className="tw:my-2 tw:rounded-lg tw:bg-(--kpc-bg) tw:p-3"
    >
      <p>{error ?? progress?.message ?? "작업을 준비하고 있습니다."}</p>
      {busy && (
        <>
          <progress
            max={progress?.total ?? 1}
            value={progress?.completed ?? 0}
            aria-label="작업 진행"
          />
          {onCancel && <DadamButton onClick={onCancel}>취소</DadamButton>}
        </>
      )}
      {error && onRetry && (
        <DadamButton onClick={onRetry}>현재 상태로 다시 시도</DadamButton>
      )}
    </div>
  );
}
