"use client";

import { useEffect } from "react";
import { CheckCircle2, X } from "lucide-react";

export interface ToastMessage {
  id: string;
  text: string;
  type?: "success" | "info" | "warning";
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onRemove(id: string): void;
}

export function ToastContainer({
  toasts,
  onRemove,
}: ToastContainerProps): React.ReactElement {
  return (
    <div className="pointer-events-none fixed right-6 bottom-6 z-50 flex w-full max-w-sm flex-col gap-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

function ToastItem({
  toast,
  onRemove,
}: {
  toast: ToastMessage;
  onRemove(id: string): void;
}): React.ReactElement {
  useEffect(() => {
    const timer = window.setTimeout(() => onRemove(toast.id), 4000);
    return () => window.clearTimeout(timer);
  }, [onRemove, toast.id]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 pointer-events-auto flex items-center justify-between gap-3 rounded-lg border border-neutral-800 bg-[#111111] px-4 py-3 text-xs font-medium text-white shadow-lg duration-200">
      <div className="flex items-center gap-2.5">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-[#E60012]" />
        <span className="leading-snug">{toast.text}</span>
      </div>
      <button
        type="button"
        onClick={() => onRemove(toast.id)}
        className="text-neutral-400 transition-colors hover:text-white"
        aria-label="알림 닫기"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function Toast({
  message,
  onClose,
}: {
  message: string;
  onClose(): void;
}): React.ReactElement {
  useEffect(() => {
    const timer = window.setTimeout(onClose, 3500);
    return () => window.clearTimeout(timer);
  }, [message, onClose]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-3 fixed right-6 bottom-6 z-50 flex max-w-md items-center justify-between gap-3 rounded-lg border border-neutral-800 bg-[#111111] px-4 py-3 text-xs font-medium text-white shadow-xl duration-200">
      <div className="flex items-center gap-2.5">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-[#E60012]" />
        <span className="leading-snug">{message}</span>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="ml-2 text-neutral-400 transition-colors hover:text-white"
        aria-label="알림 닫기"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
