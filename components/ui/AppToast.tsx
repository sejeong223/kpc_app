"use client";

import { makeStyles, Toast, Toaster, ToastTitle, tokens, useToastController } from "@fluentui/react-components";
import { Checkmark16Regular, ErrorCircle16Regular, Info16Regular } from "@fluentui/react-icons";
import { useCallback, useEffect, useState } from "react";

// TokenDialogs의 Toaster(useId 기반)와 겹치지 않도록 고정 id를 쓴다.
export const APP_TOASTER_ID = "app-toaster";
export type AppToastIntent = "success" | "error" | "info";

const useStyles = makeStyles({
  // TokenDialogs와 같은 z-index 층에 둔다. Fluent 기본 고정 폭(292px)을 풀어 레퍼런스처럼 글자 길이에 맞춘다.
  toaster: { zIndex: 4400, width: "max-content", maxWidth: "calc(100vw - 32px)" },
  // 여러 개가 쌓여도 각 알림이 자기 폭으로 가운데 정렬되게 한다.
  toast: {
    width: "fit-content", maxWidth: "100%", marginLeft: "auto", marginRight: "auto", boxSizing: "border-box",
    padding: "10px 16px", borderRadius: "10px", backgroundColor: "#1d1e22", color: "#ffffff",
    boxShadow: "0 18px 48px rgba(16,17,20,.16), 0 2px 6px rgba(16,17,20,.06)", fontFamily: tokens.fontFamilyBase,
  },
  title: { color: "#ffffff", fontSize: "12px", fontWeight: 650, lineHeight: "18px", overflowWrap: "anywhere" },
  icon: { color: "#ffffff" },
  iconError: { color: "#ffd1d7" },
});

// 레퍼런스처럼 사이드바를 뺀 본문 가운데에 두기 위해, 본문 중심과 뷰포트 중심의 차이(px)를 잰다.
// Toaster는 body 포털이라 AppShell의 --nav-sidebar-width를 읽을 수 없으므로 실제 위치를 측정한다.
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

// 인증 레이아웃에서 한 번만 렌더한다. 알림을 보내기 전에는 빈 컨테이너만 남는다.
export function AppToaster(): React.ReactElement {
  const styles = useStyles();
  const horizontal = useMainCenterOffset();
  return <Toaster toasterId={APP_TOASTER_ID} position="bottom" offset={{ vertical: 64, horizontal }} timeout={2200} pauseOnHover className={styles.toaster} />;
}

export function useAppToast(): { notify(message: string, intent?: AppToastIntent): void } {
  const styles = useStyles();
  const { dispatchToast } = useToastController(APP_TOASTER_ID);
  const notify = useCallback((message: string, intent: AppToastIntent = "success") => {
    const media = intent === "error" ? <ErrorCircle16Regular className={styles.iconError} />
      : intent === "info" ? <Info16Regular className={styles.icon} /> : <Checkmark16Regular className={styles.icon} />;
    dispatchToast(
      <Toast className={styles.toast}><ToastTitle className={styles.title} media={media}>{message}</ToastTitle></Toast>,
      { intent },
    );
  }, [dispatchToast, styles]);
  return { notify };
}
