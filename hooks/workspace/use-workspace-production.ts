"use client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { useAdminRuntime } from "@/components/admin/AdminRuntimeProvider";
import { useWorkspaceRuntime } from "@/components/workspace/WorkspaceProjectProvider";
import type { WorkspaceRuntimeValue } from "@/services/workspace/createWorkspaceRuntime";
import { workspaceQueryKeys } from "@/lib/workspace/production/query-keys";
import {
  WorkspaceError,
  workspaceOperation,
  workspaceAssert as check,
} from "@/lib/workspace/production/errors";
import { selectProjectView } from "@/lib/workspace/production/selectors";
import type {
  ProjectView,
  WorkspaceAssetChoice,
  WorkspaceAssetKind,
  WorkspaceMutation,
  WorkspaceReceipt,
} from "@/types/workspace-production";
export const workspaceQueryOptions = {
  retry: false,
  staleTime: 0,
  gcTime: 5 * 60000,
  refetchOnWindowFocus: true,
} as const;
export async function loadProjectView(
  runtime: WorkspaceRuntimeValue,
  projectId: string,
): Promise<ProjectView> {
  const bundle = await runtime.service.load(projectId),
    project = runtime.catalog.get(projectId);
  check(!!project, "FORBIDDEN", "프로젝트 접근 권한이 없습니다.");
  const access = runtime.assets.checkPins(projectId, bundle.state.pins);
  return selectProjectView(
    bundle,
    {
      identity: runtime.identity,
      project,
      members: runtime.catalog.members(projectId),
      now: new Date().toISOString(),
      newId: () => crypto.randomUUID(),
    },
    bundle.state.pins.map((pin, index) => ({
      pinId: pin.id,
      access: access[index],
    })),
  );
}
export async function activeWorkspaceRead<T>(
  runtime: WorkspaceRuntimeValue,
  operation: () => Promise<T>,
  signal?: AbortSignal,
): Promise<T> {
  return workspaceOperation(async () => {
    check(
      runtime.isActive() && !signal?.aborted,
      "CANCELLED",
      "종료된 조회입니다.",
    );
    const value = await operation();
    check(
      runtime.isActive() && !signal?.aborted,
      "CANCELLED",
      "종료된 조회입니다.",
    );
    return value;
  });
}
export function useProjectWorkspace(projectId: string | null) {
  const runtime = useWorkspaceRuntime(),
    { revision } = useAdminRuntime();
  const accessSelector = useCallback(
    (view: ProjectView) => {
      // 카탈로그 변경 순간 캐시 재조회가 끝나기 전에도 현재 이용 권한을 적용한다.
      void revision;
      const access = runtime.assets.checkPins(view.project.id, view.state.pins);
      return {
        ...view,
        assetAccess: view.state.pins.map((pin, index) => ({
          pinId: pin.id,
          access: access[index],
        })),
      };
    },
    [runtime, revision],
  );
  return useQuery<ProjectView, WorkspaceError>({
    ...workspaceQueryOptions,
    select: accessSelector,
    queryKey: workspaceQueryKeys(runtime.queryScope).project(projectId),
    enabled: projectId !== null,
    queryFn: ({ signal }) =>
      activeWorkspaceRead(
        runtime,
        async () => {
          check(!!projectId, "VALIDATION", "프로젝트를 선택해 주세요.");
          const bundle = await runtime.service.load(projectId),
            project = runtime.catalog.get(projectId);
          check(!!project, "FORBIDDEN", "프로젝트 접근 권한이 없습니다.");
          const access = runtime.assets.checkPins(projectId, bundle.state.pins);
          return selectProjectView(
            bundle,
            {
              identity: runtime.identity,
              project,
              members: runtime.catalog.members(projectId),
              now: new Date().toISOString(),
              newId: () => crypto.randomUUID(),
            },
            bundle.state.pins.map((pin, index) => ({
              pinId: pin.id,
              access: access[index],
            })),
          );
        },
        signal,
      ),
  });
}
export function useWorkspaceAssets(
  projectId: string | null,
  kind: WorkspaceAssetKind,
) {
  const runtime = useWorkspaceRuntime();
  return useQuery<WorkspaceAssetChoice[], WorkspaceError>({
    ...workspaceQueryOptions,
    queryKey: workspaceQueryKeys(runtime.queryScope).assets(projectId, kind),
    enabled: projectId !== null,
    queryFn: ({ signal }) =>
      activeWorkspaceRead(
        runtime,
        () => {
          check(!!projectId, "VALIDATION", "프로젝트를 선택해 주세요.");
          return runtime.assets.list(projectId, kind);
        },
        signal,
      ),
  });
}
export function useWorkspaceAction<T, Input extends { projectId: string }>(
  operation: (runtime: WorkspaceRuntimeValue, input: Input) => Promise<T>,
) {
  const runtime = useWorkspaceRuntime();
  return useMutation<T, WorkspaceError, Input>({
    mutationKey: workspaceQueryKeys(runtime.queryScope).mutation,
    retry: false,
    gcTime: 0,
    mutationFn: (input) =>
      activeWorkspaceRead(runtime, () => operation(runtime, input)),
    onSuccess: async (_, input) => {
      if (runtime.isActive()) await runtime.invalidateProject(input.projectId);
    },
    onError: async (error, input) => {
      if (runtime.isActive() && error.code === "CONFLICT")
        await runtime.invalidateProject(input.projectId);
    },
  });
}
export function useWorkspaceCommand() {
  return useWorkspaceAction<WorkspaceReceipt, WorkspaceMutation>(
    (runtime, input) => runtime.service.execute(input),
  );
}
