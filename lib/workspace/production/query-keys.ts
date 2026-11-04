import type { WorkspaceAssetKind } from "@/types/workspace-production";
export type WorkspaceQueryScope = readonly [
  "workspace-production",
  string,
  string,
  string,
  string,
];
export function workspaceQueryKeys(scope: WorkspaceQueryScope) {
  return {
    projects: [...scope, "projects"] as const,
    selection: [...scope, "selection"] as const,
    project: (id: string | null) => [...scope, "project", id] as const,
    fileHistory: (id:string|null,snapshotId:string|null) => [...scope,"project",id,"files-history",snapshotId] as const,
    assets: (id: string | null, kind: WorkspaceAssetKind) =>
      [...scope, "assets", id, kind] as const,
    mutation: [...scope, "mutation"] as const,
  };
}
