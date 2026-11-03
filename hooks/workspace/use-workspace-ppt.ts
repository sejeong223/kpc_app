"use client";
import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useWorkspaceRuntime } from "@/components/workspace/WorkspaceProjectProvider";
import { workspaceQueryKeys } from "@/lib/workspace/production/query-keys";
import { activeWorkspaceRead } from "./use-workspace-production";
import type {
  ExportRequest,
  ImportRequest,
  ProjectRequest,
  ImportMapping,
  ImportedPpt,
  PptVersion,
  WorkspaceProgress,
} from "@/types/workspace-production";
import type { WorkspaceError } from "@/lib/workspace/production/errors";
import { clearPptxDownloads, downloadPptxBytes } from "@/lib/pptx/download";
type Task =
  | ({ kind: "export" } & ExportRequest)
  | ({ kind: "import" } & ImportRequest)
  | ({
      kind: "remap";
      sessionId: string;
      mapping: ImportMapping[];
    } & ProjectRequest)
  | ({ kind: "apply"; sessionId: string; changeIds: string[] } & ProjectRequest)
  | { kind: "download"; projectId: string; versionId: string };
type Result =
  | { kind: "export"; version: PptVersion }
  | { kind: "import"; value: ImportedPpt }
  | { kind: "applied" | "downloaded" };
export function useWorkspacePpt() {
  const runtime = useWorkspaceRuntime(),
    control = useRef<AbortController | null>(null),
    [progress, setProgress] = useState<WorkspaceProgress | null>(null);
  useEffect(
    () => () => {
      control.current?.abort();
      clearPptxDownloads();
    },
    [],
  );
  const task = useMutation<Result, WorkspaceError, Task>({
    mutationKey: workspaceQueryKeys(runtime.queryScope).mutation,
    retry: false,
    gcTime: 0,
    mutationFn: async (input) => {
      control.current?.abort();
      const abort = new AbortController();
      control.current = abort;
      setProgress(null);
      const notify = (value: WorkspaceProgress) => {
        if (
          control.current === abort &&
          !abort.signal.aborted &&
          runtime.isActive()
        )
          setProgress(value);
      };
      return activeWorkspaceRead(
        runtime,
        async () => {
          if (input.kind === "export") {
            const { kind, ...request } = input;
            void kind;
            const version = await runtime.service.exportPpt(
              request,
              notify,
              abort.signal,
            );
            await runtime.service.downloadPpt(
              input.projectId,
              version.id,
              abort.signal,
            );
            return { kind: "export", version };
          }
          if (input.kind === "import") {
            const { kind, ...request } = input;
            void kind;
            return {
              kind: "import",
              value: await runtime.service.importPpt(
                request,
                notify,
                abort.signal,
              ),
            };
          }
          if (input.kind === "remap") {
            const { kind, ...request } = input;
            void kind;
            return {
              kind: "import",
              value: await runtime.service.remapImport(request, abort.signal),
            };
          }
          if (input.kind === "apply") {
            const { kind, ...request } = input;
            void kind;
            await runtime.service.applyImport(request);
            return { kind: "applied" };
          }
          const file = await runtime.service.downloadPpt(
              input.projectId,
              input.versionId,
              abort.signal,
            ),
            bytes = new Uint8Array(await file.blob.arrayBuffer());
          if (abort.signal.aborted || !runtime.isActive())
            throw new Error("다운로드가 취소되었습니다.");
          downloadPptxBytes(bytes, file.filename);
          return { kind: "downloaded" };
        },
        abort.signal,
      );
    },
    onSettled: async (_, __, input) => {
      if (runtime.isActive() && input.kind !== "download")
        await runtime.invalidateProject(input.projectId);
    },
  });
  return { task, progress, cancel: () => control.current?.abort() };
}
