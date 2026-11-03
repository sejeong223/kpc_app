import type { FileRole } from "@/types/workspace-files";
export type FileQueryScope = readonly ["workspace-files", string, string, FileRole, string];
export function fileQueryKeys(scope: FileQueryScope) {
  return { projects: [...scope, "projects"] as const, selection: [...scope, "selection"] as const,
    project: (id: string | null) => [...scope, "project", id] as const, mutation: [...scope, "mutation"] as const };
}
