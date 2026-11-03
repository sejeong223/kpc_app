"use client";
import { createContext, useContext, useEffect, useId, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createWorkspaceProjectCatalog } from "@/config/workspace-projects";
import { createDisposalLease } from "@/lib/admin/runtime-lifetime";
import type { FileQueryScope } from "@/lib/workspace/files/query-keys";
import { IndexedDbFileRepository } from "@/services/workspace/IndexedDbFileRepository";
import { WorkspaceFileService } from "@/services/workspace/WorkspaceFileService";
import type { FileIdentity } from "@/types/workspace-files";

export interface FileRuntimeValue { identity: FileIdentity; service: WorkspaceFileService; queryScope: FileQueryScope; isActive(): boolean }
const Context = createContext<FileRuntimeValue | null>(null);
export default function FileRuntimeProvider({ identity, children }: { identity: FileIdentity; children: React.ReactNode }): React.ReactElement {
  const client = useQueryClient();
  const instanceId = useId();
  const [scope] = useState(() => {
    const catalog = createWorkspaceProjectCatalog(identity);
    const repository = new IndexedDbFileRepository({ identity, catalog });
    const service = new WorkspaceFileService({ identity, catalog, repository });
    const queryScope: FileQueryScope = ["workspace-files", identity.namespace, identity.actor.id, identity.actor.role, instanceId];
    let active = true;
    return { runtime: { identity, service, queryScope, isActive: () => active }, lease: createDisposalLease(() => {
      active = false; service.close();
      void client.cancelQueries({ queryKey: queryScope }).then(() => client.removeQueries({ queryKey: queryScope }));
      for (const mutation of client.getMutationCache().findAll({ mutationKey: queryScope })) client.getMutationCache().remove(mutation);
    }) };
  });
  useEffect(() => scope.lease(), [scope]);
  return <Context.Provider value={scope.runtime}>{children}</Context.Provider>;
}
export function useFileRuntime(): FileRuntimeValue {
  const value = useContext(Context);
  if (!value) throw new Error("자료함 공급자가 필요합니다.");
  return value;
}
