"use client";
import WorkspacePage from "@/components/layout/WorkspacePage";
import AdminAsyncState from "@/components/admin/ui/AdminAsyncState";
import DadamThemeScope from "@/components/providers/DadamThemeScope";
import { DadamButton } from "@/components/ui/DadamControls";
import { useProjectWorkspace } from "@/hooks/workspace/use-workspace-production";
import { useWorkspaceSelection } from "@/hooks/workspace/use-workspace-selection";
import {
  resolveWorkspaceSelection,
} from "@/lib/workspace/production/routing";
import { WorkspaceError } from "@/lib/workspace/production/errors";
import type {
  ProjectView,
  WorkspaceSelection,
} from "@/types/workspace-production";
import { selectSnapshotView } from "@/lib/workspace/production/selectors";
import ProjectHeader from "@/components/common/ProjectHeader";
import WorkspaceFlow from "./shared/WorkspaceFlow";
import SetupWorkspace from "./setup/SetupWorkspace";
import {
  useOptionalWorkspaceRuntime,
  useWorkspaceRuntime,
} from "./WorkspaceProjectProvider";
export interface WorkspaceSceneProps {
  view: ProjectView;
  liveView: ProjectView;
  selection: WorkspaceSelection;
  choose(selection: WorkspaceSelection): Promise<void>;
  selector: React.ReactNode;
}
function ActiveGate({
  title,
  children,
}: {
  title: string;
  children(scene: WorkspaceSceneProps): React.ReactNode;
}): React.ReactElement {
  const runtime = useWorkspaceRuntime(),
    choice = useWorkspaceSelection(),
    query = useProjectWorkspace(
      choice.error ? null : choice.selection.projectId,
    );
  const selector = null;
  let resolution: ReturnType<typeof resolveWorkspaceSelection> | null = null,
    resolutionError: Error | null = null;
  if (query.data && !choice.error)
    try {
      resolution = resolveWorkspaceSelection(choice.selection, query.data);
    } catch (error) {
      resolutionError =
        error instanceof Error
          ? error
          : new Error("선택 정보를 확인해 주세요.");
    }
  const error = choice.error ?? resolutionError ?? query.error,
    denied = error instanceof WorkspaceError && error.code === "FORBIDDEN";
  if (
    (choice.pending && !query.data) ||
    (query.isPending && !choice.error && choice.selection.projectId)
  )
    return (
      <WorkspacePage headerComponent={ProjectHeader} title={title} leading={selector}>
        <AdminAsyncState state="loading" />
      </WorkspacePage>
    );
  if (denied || choice.error || resolutionError || !query.data || !resolution)
    return (
      <WorkspacePage headerComponent={ProjectHeader} title={title} leading={selector}>
        <AdminAsyncState
          state={error ? "error" : "empty"}
          message={
            error?.message ??
            (choice.projects.length
              ? "프로젝트를 선택해 주세요."
              : "참여 중인 프로젝트가 없습니다.")
          }
          onRetry={runtime.reconnect}
        />
      </WorkspacePage>
    );
  return (
    <>
      {resolution.notice && (
        <div
          role="status"
          className="tw:mb-(--layout-section-gap) tw:flex tw:items-center tw:gap-2 tw:text-sm"
        >
          <span>{resolution.notice}</span>
          <DadamButton
            onClick={() => {
              void choice.choose(resolution!.selection).catch(() => {});
            }}
          >
            선택 항목 바로잡기
          </DadamButton>
        </div>
      )}
      {query.error && (
        <AdminAsyncState
          state="error"
          message={query.error.message}
          onRetry={() => {
            void query.refetch();
          }}
        />
      )}
      {resolution.selection.snapshotId && (
        <p role="status">
          보관본 조회 중 · 읽기 전용{" "}
          <DadamButton
            onClick={() => {
              void choice
                .choose({ ...resolution!.selection, snapshotId: null })
                .catch(() => {});
            }}
          >
            현재 작업으로
          </DadamButton>
        </p>
      )}
      <fieldset
        disabled={!!query.error}
        className="tw:m-0 tw:min-w-0 tw:border-0 tw:p-0"
      >
        {children({
          view: selectSnapshotView(query.data, resolution.selection.snapshotId),
          liveView: query.data,
          selection: resolution.selection,
          choose: choice.choose,
          selector,
        })}
      </fieldset>
    </>
  );
}
export function WorkspaceProjectGate({
  title,
  children,
}: {
  title: string;
  children(scene: WorkspaceSceneProps): React.ReactNode;
}): React.ReactElement {
  const runtime = useOptionalWorkspaceRuntime();
  return (
    <DadamThemeScope>
      {runtime ? (
        <ActiveGate title={title}>{children}</ActiveGate>
      ) : (
        <WorkspacePage headerComponent={ProjectHeader} title={title}>
          <AdminAsyncState
            state="forbidden"
            message="사용자 정보를 확인할 수 없습니다. 다시 로그인해 주세요."
          />
        </WorkspacePage>
      )}
    </DadamThemeScope>
  );
}
export default function WorkspaceScreen({
  screen,
}: {
  screen: "toc" | "setup" | "write";
}): React.ReactElement {
  const title =
    screen === "toc" ? "목차" : screen === "setup" ? "제작 설정" : "제작";
  return (
    <WorkspaceProjectGate title={title}>
      {(scene) =>
        screen === "setup" ? (
          <SetupWorkspace key={scene.view.project.id} {...scene} />
        ) : (
          <WorkspaceFlow
            key={JSON.stringify([scene.view.project.id, scene.selection.snapshotId, screen])}
            screen={screen}
            {...scene}
          />
        )
      }
    </WorkspaceProjectGate>
  );
}
