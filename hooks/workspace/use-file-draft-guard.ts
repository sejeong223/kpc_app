"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
export interface FileDraftGuardOptions { dirty: boolean; busy: boolean; onDiscard(): void }
export function useFileDraftGuard({ dirty, busy, onDiscard }: FileDraftGuardOptions) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const pending = useRef<(() => void) | null>(null);
  const request = useCallback((action: () => void) => {
    if (busy) return;
    if (!dirty) { action(); return; }
    pending.current = action; setConfirmOpen(true);
  }, [busy, dirty]);
  useEffect(() => {
    if (!dirty && !busy) return;
    let frame: number | null = null;
    const unload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    const navigate = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!link || (link.target && link.target !== "_self") || link.hasAttribute("download")) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin || (url.hash && url.pathname === window.location.pathname && url.search === window.location.search)) return;
      event.preventDefault();
      if (frame !== null) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => request(() => router.push(url.pathname + url.search + url.hash)));
    };
    window.addEventListener("beforeunload", unload); document.addEventListener("click", navigate, true);
    return () => { if (frame !== null) cancelAnimationFrame(frame); window.removeEventListener("beforeunload", unload); document.removeEventListener("click", navigate, true); };
  }, [dirty, busy, request, router]);
  return { confirmOpen, request,
    keepEditing: () => { pending.current = null; setConfirmOpen(false); },
    discardAndContinue: () => { if (busy) return; const action = pending.current; pending.current = null; setConfirmOpen(false); onDiscard(); action?.(); } };
}
