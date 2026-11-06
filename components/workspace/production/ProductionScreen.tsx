"use client";
import { useState } from "react";
import AdminAsyncState from "@/components/admin/ui/AdminAsyncState";
import { useWorkspaceSelection } from "@/hooks/workspace/use-workspace-selection";
import { useProjectWorkspace } from "@/hooks/workspace/use-workspace-production";
import { selectSnapshotView } from "@/lib/workspace/production/selectors";
import { useOptionalWorkspaceRuntime } from "../WorkspaceProjectProvider";
import type { ProjectView, WorkspaceSelection } from "@/types/workspace-production";
import WorkspaceFlow from "../shared/WorkspaceFlow";

function ActiveProductionScreen(): React.ReactElement {
  const choice = useWorkspaceSelection();
  const query = useProjectWorkspace(choice.error ? null : choice.selection.projectId);
  const [last, setLast] = useState<{ live: ProjectView; selection: WorkspaceSelection } | null>(null);
  if (!choice.error && query.data && query.data.project.id === choice.selection.projectId &&
    (last?.live !== query.data || JSON.stringify(last.selection) !== JSON.stringify(choice.selection)))
    setLast({ live: query.data, selection: choice.selection });
  const error = choice.error ?? query.error;
  const denied = !!error && "code" in error && error.code === "FORBIDDEN";
  const stored = query.data && !choice.error ? { live: query.data, selection: choice.selection } : last;
  if (!stored || (choice.selection.projectId && choice.selection.projectId !== stored.live.project.id))
    return <div className="tw:min-h-0 tw:flex-1 tw:overflow-auto"><AdminAsyncState state={error ? "error" : choice.pending || query.isFetching ? "loading" : "empty"}
      message={error?.message ?? (choice.projects.length ? "프로젝트를 선택해 주세요." : "참여 중인 프로젝트가 없습니다.")} /></div>;
  let view: ProjectView;
  try { view = selectSnapshotView(stored.live, stored.selection.snapshotId); }
  catch (failure) { return <div className="tw:min-h-0 tw:flex-1 tw:overflow-auto"><AdminAsyncState state="error" message={failure instanceof Error ? failure.message : "보관본을 확인해 주세요."} /></div>; }
  return <div className="tw:flex tw:min-h-0 tw:min-w-0 tw:flex-1 tw:flex-col">
    {((choice.notice && !denied) || error) && <div className="tw:min-h-0 tw:max-h-[30%] tw:shrink-0 tw:overflow-y-auto tw:overscroll-contain">
    {choice.notice && !denied && <p role="status" className="tw:text-sm">{choice.notice}</p>}
    {error && <p role="alert" className="tw:mb-3 tw:text-sm">{error.message}</p>}
    </div>}
    <WorkspaceFlow key={JSON.stringify([stored.live.project.id, stored.selection.snapshotId])} screen="write" liveView={stored.live} view={view} selection={stored.selection} choose={choice.choose} selector={null} readOnlyError={error?.message ?? null} accessDenied={denied} />
  </div>;
}
export default function ProductionScreen(): React.ReactElement {
  const runtime = useOptionalWorkspaceRuntime();
  return <div className="tw:box-border tw:flex tw:min-h-0 tw:min-w-0 tw:flex-1 tw:flex-col">
    {runtime ? <ActiveProductionScreen key={JSON.stringify(runtime.queryScope)} /> : <div className="tw:min-h-0 tw:flex-1 tw:overflow-auto"><AdminAsyncState state="forbidden" message="사용자 정보를 확인할 수 없습니다. 다시 로그인해 주세요." /></div>}
  </div>;
}
