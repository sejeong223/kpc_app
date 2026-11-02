"use client";

import { makeStyles, Toast, Toaster, ToastTitle, tokens, useToastController } from "@fluentui/react-components";
import { Checkmark16Regular, ErrorCircle16Regular, Info16Regular } from "@fluentui/react-icons";
import { useCallback } from "react";

// TokenDialogs의 Toaster(useId 기반)와 겹치지 않도록 고정 id를 쓴다.
export const APP_TOASTER_ID = "app-toaster";
export type AppToastIntent = "success" | "error" | "info";

const useStyles = makeStyles({
  // TokenDialogs와 같은 z-index 층에 둔다.
  toaster: { zIndex: 4400, maxWidth: "calc(100vw - 32px)" },
  toast: {
    width: "auto", maxWidth: "calc(100vw - 32px)", boxSizing: "border-box",
    padding: "10px 16px", borderRadius: "10px", backgroundColor: "#1d1e22", color: "#ffffff",
    boxShadow: "0 18px 48px rgba(16,17,20,.16), 0 2px 6px rgba(16,17,20,.06)", fontFamily: tokens.fontFamilyBase,
  },
  title: { color: "#ffffff", fontSize: "12px", fontWeight: 650, lineHeight: "18px", overflowWrap: "anywhere" },
  icon: { color: "#ffffff" },
  iconError: { color: "#ffd1d7" },
});

// 인증 레이아웃에서 한 번만 렌더한다. 알림을 보내기 전에는 빈 컨테이너만 남는다.
export function AppToaster(): React.ReactElement {
  const styles = useStyles();
  // 레퍼런스는 사이드바를 뺀 본문 가운데지만, body 포털이라 사이드바 폭 변수를 읽을 수 없어 뷰포트 가운데에 둔다.
  return <Toaster toasterId={APP_TOASTER_ID} position="bottom" offset={{ vertical: 64 }} timeout={2200} pauseOnHover className={styles.toaster} />;
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
