"use client";
import { useWorkspaceDraftGuard, type WorkspaceDraftGuardOptions } from "./use-workspace-draft-guard";
export type FileDraftGuardOptions=Omit<WorkspaceDraftGuardOptions,"onSave">;
export function useFileDraftGuard(options:FileDraftGuardOptions){return useWorkspaceDraftGuard(options);}
