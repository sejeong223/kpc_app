"use client";
import { useWorkspaceSelectionContext, type WorkspaceSelectionValue } from "@/components/workspace/WorkspaceSelectionProvider";
export function useWorkspaceSelection(): WorkspaceSelectionValue {
    return useWorkspaceSelectionContext();
}
