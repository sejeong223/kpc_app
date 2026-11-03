"use client";
import { createContext, useContext, useEffect, useId, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthRuntime } from "@/components/providers";
import { useProfilePreview } from "@/components/profile/ProfilePreviewProvider";
import { useAdminRuntime } from "@/components/admin/AdminRuntimeProvider";
import {
  fileIdentityKey,
  resolveFileIdentity,
} from "@/lib/workspace/files/identity";
import type { FileIdentity } from "@/types/workspace-files";
import type { AdminActor } from "@/types/admin";
import {
  createWorkspaceRuntime,
  type WorkspaceRuntimeValue,
} from "@/services/workspace/createWorkspaceRuntime";
import { FileRuntimeBridge } from "./files/FileRuntimeProvider";
const Context = createContext<WorkspaceRuntimeValue | null>(null);
function Runtime({
  identity,
  reconnect,
  children,
}: {
  identity: FileIdentity;
  reconnect(): void;
  children: React.ReactNode;
}): React.ReactElement {
  const client = useQueryClient(),
    admin = useAdminRuntime(),
    instanceId = useId();
  const [scope] = useState(() => {
    let actor = admin.actor;
    return {
      ...createWorkspaceRuntime({
        identity,
        host: admin.service,
        getActor: () => actor,
        client,
        instanceId,
        reconnect,
      }),
      setActor: (value: AdminActor) => {
        actor = value;
      },
    };
  });
  useEffect(() => {
    scope.setActor(admin.actor);
  }, [scope, admin.actor]);
  useEffect(() => scope.retain(), [scope]);
  return (
    <Context.Provider value={scope.runtime}>
      <FileRuntimeBridge value={scope.runtime.fileRuntime}>
        {children}
      </FileRuntimeBridge>
    </Context.Provider>
  );
}
export default function WorkspaceProjectProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const { authEnabled, session } = useAuthRuntime(),
    { state, profile } = useProfilePreview(),
    admin = useAdminRuntime(),
    [attempt, setAttempt] = useState(0);
  const identity = resolveFileIdentity({
    authEnabled,
    session,
    previewRole: state.previewRole,
    displayName: profile.name,
  });
  if (!identity || !admin.access)
    return <Context.Provider value={null}>{children}</Context.Provider>;
  return (
    <Runtime
      key={fileIdentityKey(identity) + ":" + attempt}
      identity={identity}
      reconnect={() => setAttempt((value) => value + 1)}
    >
      {children}
    </Runtime>
  );
}
export function useOptionalWorkspaceRuntime() {
  return useContext(Context);
}
export function useWorkspaceRuntime(): WorkspaceRuntimeValue {
  const value = useOptionalWorkspaceRuntime();
  if (!value) throw new Error("프로젝트 작업 공급자가 필요합니다.");
  return value;
}
