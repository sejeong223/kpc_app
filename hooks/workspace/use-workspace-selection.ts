"use client";
import { useEffect, useMemo, useSyncExternalStore } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useWorkspaceRuntime } from "@/components/workspace/WorkspaceProjectProvider";
import {
  parseWorkspaceSelection,
  resolveWorkspaceSelection,
  workspaceHref,
} from "@/lib/workspace/production/routing";
import { workspaceQueryKeys } from "@/lib/workspace/production/query-keys";
import {
  workspaceAssert as check,
  WorkspaceError,
  workspaceOperation,
} from "@/lib/workspace/production/errors";
import { selectProjectView } from "@/lib/workspace/production/selectors";
import type { WorkspaceSelection } from "@/types/workspace-production";
import {
  activeWorkspaceRead,
  workspaceQueryOptions,
} from "./use-workspace-production";
const empty: WorkspaceSelection = {
  projectId: null,
  sectionId: null,
  slideId: null,
  snapshotId: null,
};
export function useWorkspaceSelection() {
  const runtime = useWorkspaceRuntime(),
    router = useRouter(),
    pathname = usePathname(),
    params = useSearchParams(),
    client = useQueryClient(),
    keys = workspaceQueryKeys(runtime.queryScope),
    memory = useSyncExternalStore(
      runtime.selection.subscribe,
      runtime.selection.get,
      () => null,
    );
  const parsed = useMemo(() => {
    try {
      return {
        value: parseWorkspaceSelection(new URLSearchParams(params.toString())),
        error: null,
      };
    } catch (error) {
      return {
        value: empty,
        error:
          error instanceof Error
            ? error
            : new Error("이동 정보를 확인해 주세요."),
      };
    }
  }, [params]);
  const projects = useQuery({
    ...workspaceQueryOptions,
    queryKey: keys.projects,
    queryFn: ({ signal }) =>
      activeWorkspaceRead(
        runtime,
        () => runtime.fileRuntime.service.listProjects(),
        signal,
      ),
  });
  const saved = useQuery({
    ...workspaceQueryOptions,
    queryKey: keys.selection,
    queryFn: ({ signal }) =>
      activeWorkspaceRead(
        runtime,
        () => runtime.fileRuntime.service.getSelection(),
        signal,
      ),
  });
  const restored =
    saved.data && projects.data?.some((p) => p.id === saved.data)
      ? saved.data
      : null;
  const fallback = memory ?? {
      ...empty,
      projectId: restored ?? projects.data?.[0]?.id ?? null,
    },
    selection = parsed.error
      ? empty
      : parsed.value.projectId
        ? parsed.value
        : fallback;
  const explicitError = useMemo(
    () =>
      parsed.value.projectId &&
      projects.isSuccess &&
      !projects.data.some((p) => p.id === parsed.value.projectId)
        ? new WorkspaceError(
            "FORBIDDEN",
            "선택한 프로젝트에 접근할 수 없습니다. 다른 프로젝트를 선택해 주세요.",
          )
        : null,
    [parsed.value.projectId, projects.isSuccess, projects.data],
  );
  const selectionMutation = useMutation<
    WorkspaceSelection,
    WorkspaceError,
    WorkspaceSelection
  >({
    mutationKey: keys.mutation,
    retry: false,
    gcTime: 0,
    mutationFn: (next) =>
      workspaceOperation(async () => {
        check(!!next.projectId, "VALIDATION", "프로젝트를 선택해 주세요.");
        const bundle = await runtime.service.load(next.projectId),
          project = runtime.catalog.get(next.projectId);
        check(!!project, "FORBIDDEN", "접근 가능한 프로젝트가 없습니다.");
        const canonical = resolveWorkspaceSelection(
          next,
          selectProjectView(
            bundle,
            {
              identity: runtime.identity,
              project,
              members: runtime.catalog.members(next.projectId),
              now: new Date().toISOString(),
              newId: () => crypto.randomUUID(),
            },
            [],
          ),
        ).selection;
        await runtime.fileRuntime.service.selectProject(next.projectId);
        check(runtime.isActive(), "CANCELLED", "종료된 화면입니다.");
        return canonical;
      }),
    onSuccess: (next) => {
      if (!runtime.isActive()) return;
      runtime.selection.set(next);
      client.setQueryData(keys.selection, next.projectId);
      const screen = pathname.split("/").at(-1);
      if (
        screen === "files" ||
        screen === "toc" ||
        screen === "setup" ||
        screen === "write"
      )
        router.replace(workspaceHref(screen, next));
    },
  });
  useEffect(() => {
    if (
      !parsed.error &&
      !explicitError &&
      projects.isSuccess &&
      saved.isSuccess &&
      selection.projectId &&
      (!memory ||
        (parsed.value.projectId &&
          JSON.stringify(memory) !== JSON.stringify(parsed.value)))
    )
      runtime.selection.set(selection);
  }, [
    runtime,
    parsed.error,
    parsed.value,
    explicitError,
    projects.isSuccess,
    saved.isSuccess,
    selection,
    memory,
  ]);
  return {
    selection,
    projects: projects.data ?? [],
    pending:
      projects.isPending || saved.isPending || selectionMutation.isPending,
    error:
      parsed.error ??
      explicitError ??
      projects.error ??
      saved.error ??
      selectionMutation.error,
    choose: (next: WorkspaceSelection) =>
      runtime.navigate(async () => {
        await selectionMutation.mutateAsync(next);
      }),
  };
}
