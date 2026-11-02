"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
export function useUnsavedNavigation(dirty: boolean, pending: boolean, onClose: () => void) {
  const router = useRouter(), destination = useRef<string | null>(null), [confirmOpen, setConfirmOpen] = useState(false);
  useEffect(() => {
    if (!dirty) return;
    let frame: number | null = null;
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    const click = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin || url.hash && url.pathname === window.location.pathname && url.search === window.location.search) return;
      event.preventDefault();
      if (pending) return;
      destination.current = url.pathname + url.search + url.hash;
      if (frame !== null) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => { frame = null; setConfirmOpen(true); });
    };
    window.addEventListener("beforeunload", beforeUnload); document.addEventListener("click", click, true);
    return () => { if (frame !== null) cancelAnimationFrame(frame); window.removeEventListener("beforeunload", beforeUnload); document.removeEventListener("click", click, true); };
  }, [dirty, pending]);
  return { confirmOpen, cancel: () => setConfirmOpen(false),
    close: () => { if (pending) return; destination.current = null; if (dirty) setConfirmOpen(true); else onClose(); },
    discard: () => { if (pending) return; const next = destination.current; onClose(); if (next) router.push(next); } };
}
