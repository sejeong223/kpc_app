"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useWorkspaceRuntime } from "@/components/workspace/WorkspaceProjectProvider";
import { workspaceQueryKeys } from "@/lib/workspace/production/query-keys";
import { WorkspaceError } from "@/lib/workspace/production/errors";
import { activeWorkspaceRead } from "./use-workspace-production";
import { useFileRuntime } from "@/components/workspace/files/FileRuntimeProvider";
import { WorkspaceFileError } from "@/lib/workspace/files/errors";
import { fileQueryKeys } from "@/lib/workspace/files/query-keys";
import type { FileMutation, FileOriginalRequest, FileReceipt, FileWorkspaceView, WorkspaceProject } from "@/types/workspace-files";

const queryOptions = { retry: false, staleTime: 0, gcTime: 5 * 60_000, refetchOnWindowFocus: true } as const;
export function useWorkspaceFileHistory(projectId:string|null,snapshotId:string|null){
  const runtime=useWorkspaceRuntime();
  return useQuery<FileWorkspaceView,WorkspaceFileError>({...queryOptions,queryKey:workspaceQueryKeys(runtime.queryScope).fileHistory(projectId,snapshotId),enabled:!!projectId&&!!snapshotId,
    queryFn:async({signal})=>{try{
      if(!projectId||!snapshotId)throw new WorkspaceFileError("VALIDATION","보관본을 선택해 주세요.");
      return await activeWorkspaceRead(runtime,()=>runtime.service.loadFileSnapshot(projectId,snapshotId),signal);
    }catch(error){if(error instanceof WorkspaceError)throw new WorkspaceFileError(error.code==="FORBIDDEN"||error.code==="READ_ONLY"?"FORBIDDEN":error.code==="CANCELLED"?"CANCELLED":error.code==="NOT_FOUND"?"NOT_FOUND":"STORAGE",error.message);throw error;}}
  });
}
async function read<T>(signal: AbortSignal, operation: () => Promise<T>): Promise<T> {
  if (signal.aborted) throw new WorkspaceFileError("CANCELLED", "조회가 취소되었습니다.");
  const result = await operation();
  if (signal.aborted) throw new WorkspaceFileError("CANCELLED", "조회가 취소되었습니다.");
  return result;
}
export function useFileProjects() {
  const { service, queryScope } = useFileRuntime();
  return useQuery<WorkspaceProject[], WorkspaceFileError>({ ...queryOptions, queryKey: fileQueryKeys(queryScope).projects, queryFn: ({ signal }) => read(signal, () => service.listProjects()) });
}
export function useFileSelection() {
  const { service, queryScope } = useFileRuntime();
  return useQuery<string | null, WorkspaceFileError>({ ...queryOptions, queryKey: fileQueryKeys(queryScope).selection, queryFn: ({ signal }) => read(signal, () => service.getSelection()) });
}
export function useFileWorkspace(projectId: string | null) {
  const { service, queryScope } = useFileRuntime();
  return useQuery<FileWorkspaceView, WorkspaceFileError>({ ...queryOptions, queryKey: fileQueryKeys(queryScope).project(projectId), enabled: projectId !== null,
    queryFn: ({ signal }) => read(signal, () => {
      if (!projectId) throw new WorkspaceFileError("VALIDATION", "프로젝트를 선택해 주세요.");
      return service.loadProject(projectId);
    }) });
}
export function useSelectFileProject() {
  const runtime = useFileRuntime(), client = useQueryClient(), keys = fileQueryKeys(runtime.queryScope);
  return useMutation<void, WorkspaceFileError, string>({ mutationKey: keys.mutation, retry: false, gcTime: 0,
    mutationFn: id => runtime.service.selectProject(id), onSuccess: (_, id) => {
      if (runtime.isActive()) client.setQueryData(keys.selection, id);
    } });
}
export function useFileCommand() {
  const runtime = useFileRuntime(), client = useQueryClient(), keys = fileQueryKeys(runtime.queryScope);
  return useMutation<FileReceipt, WorkspaceFileError, FileMutation>({ mutationKey: keys.mutation, retry: false, gcTime: 0,
    mutationFn: input => runtime.service.execute(input),
    onSuccess: async (_, input) => {
      if (runtime.isActive()) { if(runtime.onProjectChange)await runtime.onProjectChange(input.projectId);else await client.invalidateQueries({ queryKey: keys.project(input.projectId), exact: true }); }
    }, onError: async (error, input) => {
      if (runtime.isActive() && error.code === "CONFLICT") { if(runtime.onProjectChange)await runtime.onProjectChange(input.projectId);else await client.invalidateQueries({ queryKey: keys.project(input.projectId), exact: true }); }
    } });
}
export function useFileOriginal() {
  const { service, queryScope } = useFileRuntime();
  return useMutation<File, WorkspaceFileError, FileOriginalRequest>({ mutationKey: fileQueryKeys(queryScope).mutation, retry: false, gcTime: 0, mutationFn: input => service.getOriginal(input) });
}
