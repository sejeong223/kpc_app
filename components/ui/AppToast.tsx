"use client";

import { makeStyles, mergeClasses, tokens } from "@fluentui/react-components";
import { Checkmark16Regular, ErrorCircle16Regular, Info16Regular } from "@fluentui/react-icons";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

export const APP_TOAST_TIMEOUT_MS = 2200;
export type AppToastIntent = "success" | "error" | "info";

// 레퍼런스 toast()처럼 앱 전체에 알림 상자는 하나다. 새 알림은 내용을 바꾸고 타이머를 다시 건다.
// Fluent Toaster는 updateToast가 다시 그리지 않고, 개발 모드 StrictMode에서 'unmounted' 상태가 바로 와서
// "같은 자리 바꿔치기"를 보장할 수 없어 직접 그린다.
interface AppToastMessage { id: number; message: string; intent: AppToastIntent }

let current: AppToastMessage | null = null;
let seq = 0;
const listeners = new Set<() => void>();

function show(message: string, intent: AppToastIntent): void {
  current = { id: ++seq, message, intent };
  listeners.forEach((listener) => listener());
}
function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
const getSnapshot = () => current;
const getServerSnapshot = () => null;

const useStyles = makeStyles({
  // 레퍼런스 .toast: 본문 가운데 아래 64px, 글자 길이에 맞춘 폭, 나타날 때 20px 위로 올라온다.
  toast: {
    position: "fixed", bottom: "64px", zIndex: 4400, boxSizing: "border-box",
    width: "max-content", maxWidth: "calc(100vw - 32px)",
    display: "flex", alignItems: "center", gap: "8px",
    padding: "10px 16px", borderRadius: "10px", backgroundColor: "#1d1e22", color: "#ffffff",
    boxShadow: "0 18px 48px rgba(16,17,20,.16), 0 2px 6px rgba(16,17,20,.06)",
    fontFamily: tokens.fontFamilyBase, fontSize: "12px", fontWeight: 650, lineHeight: "18px", overflowWrap: "anywhere",
    opacity: 0, pointerEvents: "none", transform: "translateX(-50%) translateY(20px)",
    transitionProperty: "opacity, transform", transitionDuration: ".2s",
    "@media (prefers-reduced-motion: reduce)": { transitionDuration: "0s" },
  },
  shown: { opacity: 1, pointerEvents: "auto", transform: "translateX(-50%) translateY(0)" },
  icon: { flexShrink: 0, color: "#ffffff" },
  iconError: { flexShrink: 0, color: "#ffd1d7" },
});

// 레퍼런스처럼 사이드바를 뺀 본문 가운데에 두기 위해, 본문 중심과 뷰포트 중심의 차이(px)를 잰다.
function useMainCenterOffset(): number {
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    const main = document.getElementById("main-content");
    if (!main) return;
    const update = () => {
      const rect = main.getBoundingClientRect();
      setOffset(Math.round(rect.left + rect.width / 2 - document.documentElement.clientWidth / 2));
    };
    // 사이드바 접기·펼치기는 본문 폭 변화로, 창 크기 변경은 resize로 잡는다.
    const observer = new ResizeObserver(update);
    observer.observe(main);
    window.addEventListener("resize", update);
    return () => { observer.disconnect(); window.removeEventListener("resize", update); };
  }, []);
  return offset;
}

// 인증 레이아웃에서 한 번만 렌더한다. 알림 전에는 보이지 않는 빈 상자만 남는다.
export function AppToaster(): React.ReactElement {
  const styles = useStyles();
  const horizontal = useMainCenterOffset();
  const toast = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [hiddenId, setHiddenId] = useState<number | null>(null);
  const [hovered, setHovered] = useState(false);
  const visible = toast !== null && toast.id !== hiddenId;

  // 새 알림(id 변경)마다 타이머를 다시 건다. 마우스를 올린 동안은 멈춘다.
  useEffect(() => {
    if (!toast || hovered) return;
    const timer = setTimeout(() => setHiddenId(toast.id), APP_TOAST_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [toast, hovered]);

  const icon = toast?.intent === "error" ? <ErrorCircle16Regular aria-hidden="true" className={styles.iconError} />
    : toast?.intent === "info" ? <Info16Regular aria-hidden="true" className={styles.icon} />
      : <Checkmark16Regular aria-hidden="true" className={styles.icon} />;

  // 내용이 바뀔 때 스크린 리더가 읽도록 상자는 항상 DOM에 둔다.
  return <div role="status" aria-live="polite" aria-atomic="true" aria-hidden={visible ? undefined : true}
    data-app-toast={toast?.intent} className={mergeClasses(styles.toast, visible && styles.shown)}
    style={{ left: `calc(50% + ${horizontal}px)` }}
    onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
    {toast && <>{icon}<span>{toast.message}</span></>}
  </div>;
}

export function useAppToast(): { notify(message: string, intent?: AppToastIntent): void } {
  const notify = useCallback((message: string, intent: AppToastIntent = "success") => show(message, intent), []);
  return { notify };
}
