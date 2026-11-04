"use client";
import { usePathname } from "next/navigation";
import { useContext, useMemo } from "react";
import { useAuthRuntime } from "@/components/providers";
import { useProfilePreview } from "@/components/profile/ProfilePreviewProvider";
import { useOptionalWorkspaceRuntime } from "@/components/workspace/WorkspaceProjectProvider";
import { resolveCommentIdentity } from "@/lib/comments/domain";
import ProjectCanvasCommentsProvider from "./ProjectCanvasCommentsProvider";
import { CommentsContext, LegacyCommentIdentityContext, inactiveComments } from "./comments-context";
export type { CommentsContextValue } from "./comments-context";
export default function CommentsProvider({ children }: {
    children: React.ReactNode;
}): React.ReactElement {
    const { authEnabled, session } = useAuthRuntime(), { profile } = useProfilePreview();
    const pathname = usePathname(), runtime = useOptionalWorkspaceRuntime();
    const legacy = useMemo(() => resolveCommentIdentity({ authEnabled, session, displayName: profile.name }), [authEnabled, session, profile.name]);
    return <LegacyCommentIdentityContext.Provider value={legacy}>
    {runtime && pathname === "/workspace/write" ? <ProjectCanvasCommentsProvider>{children}</ProjectCanvasCommentsProvider> : <CommentsContext.Provider value={inactiveComments}>{children}</CommentsContext.Provider>}
  </LegacyCommentIdentityContext.Provider>;
}
export function useComments() { return useContext(CommentsContext); }
export function useLegacyCommentIdentity() { return useContext(LegacyCommentIdentityContext); }
