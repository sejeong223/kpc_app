"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useOptionalWorkspaceRuntime } from "@/components/workspace/WorkspaceProjectProvider";
export interface WorkspaceDraftGuardOptions {
  dirty: boolean;
  busy: boolean;
  onDiscard(): void;
  onSave?(): Promise<void>;
}
export function useWorkspaceDraftGuard({
  dirty,
  busy,
  onDiscard,
  onSave,
}: WorkspaceDraftGuardOptions) {
  const router = useRouter(),
    runtime = useOptionalWorkspaceRuntime(),
    [confirmOpen, setConfirmOpen] = useState(false),
    [saving, setSaving] = useState(false),
    [error, setError] = useState<string | null>(null),
    pending = useRef<{ action: () => void; cancel: () => void } | null>(null);
  const request = useCallback(
    (action: () => void, cancel: () => void = () => {}) => {
      if (busy || saving) {
        cancel();
        return;
      }
      if (!dirty) {
        action();
        return;
      }
      pending.current?.cancel();
      pending.current = { action, cancel };
      setError(null);
      setConfirmOpen(true);
    },
    [busy, saving, dirty],
  );
  useEffect(() => {
    if (!runtime || (!dirty && !busy && !saving)) return;
    return runtime.registerGuard(request);
  }, [runtime, request, dirty, busy, saving]);
  useEffect(
    () => () => {
      pending.current?.cancel();
      pending.current = null;
    },
    [],
  );
  useEffect(() => {
    if (!dirty && !busy && !saving) return;
    let frame: number | null = null;
    const unload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const navigate = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const link =
        event.target instanceof Element
          ? event.target.closest<HTMLAnchorElement>("a[href]")
          : null;
      if (
        !link ||
        (link.target && link.target !== "_self") ||
        link.hasAttribute("download")
      )
        return;
      const url = new URL(link.href, window.location.href);
      if (
        url.origin !== window.location.origin ||
        (url.hash &&
          url.pathname === window.location.pathname &&
          url.search === window.location.search)
      )
        return;
      event.preventDefault();
      if (frame !== null) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (runtime)
          void runtime.navigate(async () =>
            router.push(url.pathname + url.search + url.hash),
          );
        else request(() => router.push(url.pathname + url.search + url.hash));
      });
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", navigate, true);
    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      window.removeEventListener("beforeunload", unload);
      document.removeEventListener("click", navigate, true);
    };
  }, [dirty, busy, saving, request, router, runtime]);
  const continuePending = () => {
    const action = pending.current?.action;
    pending.current = null;
    setConfirmOpen(false);
    action?.();
  };
  return {
    confirmOpen,
    request,
    saving,
    error,
    canSave: !!onSave,
    keepEditing: () => {
      if (saving) return;
      pending.current?.cancel();
      pending.current = null;
      setConfirmOpen(false);
    },
    discardAndContinue: () => {
      if (busy || saving) return;
      onDiscard();
      continuePending();
    },
    saveAndContinue: async () => {
      if (!onSave || busy || saving) return;
      setSaving(true);
      setError(null);
      try {
        await onSave();
        continuePending();
      } catch (failure) {
        setError(
          failure instanceof Error
            ? failure.message
            : "저장하지 못했습니다. 입력 내용은 유지됩니다.",
        );
      } finally {
        setSaving(false);
      }
    },
  };
}
