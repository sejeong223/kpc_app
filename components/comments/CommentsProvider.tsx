"use client";

import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore } from "react";

import { useAuthRuntime } from "@/components/providers";
import { useProfilePreview } from "@/components/profile/ProfilePreviewProvider";
import type { CommentIdentity } from "@/config/comments";
import { CommentController, createCommentControllerState, type CommentControllerState } from "@/lib/comments/controller";
import { resolveCommentIdentity } from "@/lib/comments/domain";
import { IndexedDbCommentRepository } from "@/lib/comments/repository";

export interface CommentsContextValue {
  identity: CommentIdentity | null;
  state: CommentControllerState;
  controller: CommentController | null;
}
const CommentsContext = createContext<CommentsContextValue | null>(null);
const unidentified: CommentsContextValue = {
  identity: null, controller: null,
  state: { ...createCommentControllerState(), status: "error", error: { code: "unidentified", message: "사용자 정보를 확인할 수 없습니다. 다시 로그인해 주세요." } },
};

function CommentScopeProvider({ identity, children }: { identity: CommentIdentity; children: React.ReactNode }): React.ReactElement {
  const [controller] = useState(() => new CommentController({ identity, repositoryFactory: () => new IndexedDbCommentRepository() }));
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  const pathname = usePathname();
  useEffect(() => { controller.updateActor(identity.actor); }, [controller, identity.actor]);
  useEffect(() => {
    if (pathname === "/workspace/write") void controller.load();
    else controller.suspendUi();
  }, [controller, pathname]);
  useEffect(() => () => controller.dispose(), [controller]);
  const value = useMemo(() => ({ identity, state, controller }), [identity, state, controller]);
  return <CommentsContext.Provider value={value}>{children}</CommentsContext.Provider>;
}

export default function CommentsProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const { authEnabled, session } = useAuthRuntime();
  const { profile } = useProfilePreview();
  const identity = useMemo(() => resolveCommentIdentity({ authEnabled, session, displayName: profile.name }), [authEnabled, session, profile.name]);
  if (!identity) return <CommentsContext.Provider value={unidentified}>{children}</CommentsContext.Provider>;
  return <CommentScopeProvider key={JSON.stringify([identity.scope.namespace, identity.scope.surfaceId, identity.actor.id])} identity={identity}>{children}</CommentScopeProvider>;
}

export function useComments(): CommentsContextValue {
  const value = useContext(CommentsContext);
  if (!value) throw new Error("useComments must be used within CommentsProvider");
  return value;
}
