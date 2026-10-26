"use client";

import { signIn, signOut } from "next-auth/react";
import { useEffect, useRef, useState } from "react";

import { isTrustedLoginSuccessMessage } from "@/lib/auth/login-message";
import { isPopupOrIframe } from "@/utils/frameCheck";
import { openCenteredPopup } from "@/utils/popup";

import styles from "./LoginComponent.module.css";

export interface LoginComponentProps {
  authEnabled: boolean;
  callbackUrl: string;
  embeddedMode: boolean;
  reason?: "forbidden";
}

export default function LoginComponent({
  authEnabled,
  callbackUrl,
  embeddedMode,
  reason,
}: LoginComponentProps): React.ReactElement {
  const popupRef = useRef<Window | null>(null);
  const [popupError, setPopupError] = useState<string | null>(null);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (
        isTrustedLoginSuccessMessage(event, {
          origin: window.location.origin,
          source: popupRef.current,
        })
      ) {
        popupRef.current = null;
        window.location.replace(callbackUrl);
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [callbackUrl]);

  async function startLogin() {
    if (!authEnabled) return;
    setPopupError(null);

    if (reason === "forbidden") {
      await signOut({ redirect: false });
    }

    const selectAccount = reason === "forbidden";

    if (embeddedMode || isPopupOrIframe()) {
      const searchParams = new URLSearchParams({ callbackUrl });

      if (selectAccount) {
        searchParams.set("selectAccount", "1");
      }

      popupRef.current = openCenteredPopup(
        `/auth/login/popup?${searchParams.toString()}`,
        "azure-app-template-login",
        600,
        700,
      );

      if (!popupRef.current) {
        setPopupError(
          "로그인 팝업이 차단되었습니다. 브라우저에서 팝업을 허용한 뒤 다시 시도해 주세요.",
        );
      }

      return;
    }

    await signIn(
      "azure-ad",
      { callbackUrl },
      selectAccount ? { prompt: "select_account" } : undefined,
    );
  }

  return (
    <div className={styles.panel}>
      <svg className={styles.symbol} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m5 8 6 6M4 14l6-6 2-3M2 5h12M7 2h1m14 20-5-11-5 11m2-4h6" />
      </svg>
      <div className={styles.copy}>
        <h1 className={styles.title}>Sign In</h1>
        {reason === "forbidden" ? (
          <p className={styles.description}>이 공간에 접근할 권한이 없습니다. 권한이 있는 다른 계정으로 로그인해 주세요.</p>
        ) : (
          <p className={styles.description}>Access your account using your<br />company Microsoft login.</p>
        )}
      </div>

      <button className={styles.button} type="button" disabled={!authEnabled} aria-describedby={!authEnabled ? "login-availability" : undefined} onClick={() => void startLogin()}>
        <svg width="20" height="20" viewBox="0 0 21 21" aria-hidden="true">
          <path fill="#f25022" d="M1 1h9v9H1z" /><path fill="#7fba00" d="M11 1h9v9h-9z" />
          <path fill="#00a4ef" d="M1 11h9v9H1z" /><path fill="#ffb900" d="M11 11h9v9h-9z" />
        </svg>
        {reason === "forbidden"
          ? "다른 계정으로 로그인"
          : "Sign in with Microsoft"}
      </button>
      {!authEnabled && <p id="login-availability" className={styles.notice}>Microsoft 로그인 연결을 준비 중입니다.</p>}
      {popupError ? (
        <p className={styles.error} role="alert">{popupError}</p>
      ) : null}
    </div>
  );
}
