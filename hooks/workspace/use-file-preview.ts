"use client";
import { useEffect, useRef, useState } from "react";
import { useFileOriginal } from "./use-workspace-files";
import { WorkspaceFileError } from "@/lib/workspace/files/errors";
import { downloadOriginalFile, prepareFilePreview, type FilePreviewContent, type PreparedFilePreview } from "@/lib/workspace/files/preview";
import type { FileOriginalRequest } from "@/types/workspace-files";

export interface FilePreviewState { status: "idle" | "loading" | "ready" | "error"; content: FilePreviewContent | null; file: File | null; error: WorkspaceFileError | null }
export interface FilePreviewController extends FilePreviewState { retry(): void; download(): void }
interface PreviewSnapshot extends FilePreviewState { key: string }
export function useFilePreview(request: FileOriginalRequest | null): FilePreviewController {
  const { mutateAsync, reset } = useFileOriginal();
  const [attempt, setAttempt] = useState(0);
  const projectId = request?.projectId, round = request?.round, versionId = request?.versionId;
  const key = JSON.stringify([projectId, round, versionId, attempt]);
  const [snapshot, setSnapshot] = useState<PreviewSnapshot>({ key, status: request ? "loading" : "idle", content: null, file: null, error: null });
  // 요청이 바뀐 렌더에서는 이전 파일을 즉시 해제하고 이전 내용을 표시하지 않는다.
  if (snapshot.key !== key) setSnapshot({ key, status: request ? "loading" : "idle", content: null, file: null, error: null });
  const generation = useRef(0);
  const downloads = useRef(new Set<() => void>());
  useEffect(() => {
    const current = ++generation.current;
    let active = true;
    let prepared: PreparedFilePreview | null = null;
    const pendingDownloads = downloads.current;
    async function load() {
      try {
        if (!projectId || !round || !versionId) return;
        const file = await mutateAsync({ projectId, round, versionId });
        if (!active || generation.current !== current) return;
        const preview = await prepareFilePreview(file);
        if (!active || generation.current !== current) { preview.dispose(); return; }
        prepared = preview;
        setSnapshot({ key, status: "ready", content: preview.content, file, error: null });
      } catch (error) {
        if (active && generation.current === current) setSnapshot({ key, status: "error", content: null, file: null,
          error: error instanceof WorkspaceFileError ? error : new WorkspaceFileError("STORAGE", "원본 미리보기를 준비하지 못했습니다.") });
      } finally { if (active && generation.current === current) reset(); }
    }
    void load();
    return () => { active = false; prepared?.dispose(); for (const dispose of pendingDownloads) dispose(); pendingDownloads.clear(); reset(); };
  }, [projectId, round, versionId, key, mutateAsync, reset]);
  const state: FilePreviewState = !request ? { status: "idle", content: null, file: null, error: null }
    : snapshot.key === key ? snapshot : { status: "loading", content: null, file: null, error: null };
  return { ...state, retry: () => setAttempt(value => value + 1), download: () => {
    if (!state.file) return;
    try { downloads.current.add(downloadOriginalFile(state.file)); }
    catch (error) { setSnapshot(previous => ({ ...previous, error: error instanceof WorkspaceFileError ? error : new WorkspaceFileError("STORAGE", "다운로드를 시작하지 못했습니다.") })); }
  } };
}
