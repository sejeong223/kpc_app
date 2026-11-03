"use client";
import { useEffect, useState } from "react";
import { DadamButton } from "@/components/ui/DadamControls";
import type { FileRemoval } from "@/types/workspace-files";
export default function FileUndoNotice({ removal, busy, onUndo, onExpire }: { removal: FileRemoval; busy: boolean; onUndo(id: string): void; onExpire(): void }): React.ReactElement {
  const [remaining, setRemaining] = useState(() => Math.max(0, Math.ceil((Date.parse(removal.expiresAt) - Date.now()) / 1000)));
  useEffect(() => {
    const timer = setInterval(() => {
      const seconds = Math.max(0, Math.ceil((Date.parse(removal.expiresAt) - Date.now()) / 1000));
      setRemaining(seconds); if (!seconds) onExpire();
    }, 250);
    return () => clearInterval(timer);
  }, [removal.expiresAt, onExpire]);
  return <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-(--layout-control-gap) tw:rounded-lg tw:bg-(--dadam-accent-soft) tw:p-(--layout-card-inset)">
    <span role="status">현재 회차에서 자료를 삭제했습니다.</span>
    <DadamButton size="small" disabled={busy || !remaining} onClick={() => onUndo(removal.id)}>되돌리기 ({remaining}초)</DadamButton>
  </div>;
}
