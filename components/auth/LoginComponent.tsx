"use client";

import { signIn, signOut } from "next-auth/react";
import { useEffect, useRef, useState } from "react";

import { isTrustedLoginSuccessMessage } from "@/lib/auth/login-message";
import { isPopupOrIframe } from "@/utils/frameCheck";
import { openCenteredPopup } from "@/utils/popup";

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
    <div className="login-panel">
      <svg className="login-symbol" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m5 8 6 6M4 14l6-6 2-3M2 5h12M7 2h1m14 20-5-11-5 11m2-4h6" />
      </svg>
      <div className="login-copy">
        <h1 className="login-title">Sign In</h1>
        {reason === "forbidden" ? (
          <p className="login-description">이 공간에 접근할 권한이 없습니다. 권한이 있는 다른 계정으로 로그인해 주세요.</p>
        ) : (
          <p className="login-description">Access your account using your<br />company Microsoft login.</p>
        )}
      </div>

      <button className="login-button" type="button" disabled={!authEnabled} aria-describedby={!authEnabled ? "login-availability" : undefined} onClick={() => void startLogin()}>
        <svg width="20" height="20" viewBox="0 0 21 21" aria-hidden="true">
          <path fill="#f25022" d="M1 1h9v9H1z" /><path fill="#7fba00" d="M11 1h9v9h-9z" />
          <path fill="#00a4ef" d="M1 11h9v9H1z" /><path fill="#ffb900" d="M11 11h9v9h-9z" />
        </svg>
        {reason === "forbidden"
          ? "다른 계정으로 로그인"
          : "Sign in with Microsoft"}
      </button>
      {!authEnabled && <p id="login-availability" className="login-notice">Microsoft 로그인 연결을 준비 중입니다.</p>}
      {popupError ? (
        <p className="login-error" role="alert">{popupError}</p>
      ) : null}
      <style>{componentStyles}</style>
    </div>
  );
}

const componentStyles = `
.login-panel { width: min(100%, 400px); text-align: center; }
.login-symbol { width: 80px; height: 80px; color: #4f46e5; }
.login-copy { margin: 36px 0 24px; }
.login-title { margin: 0 0 14px; font-size: 32px; line-height: 1.25; font-weight: 600; letter-spacing: -1px; color: #18181b; }
.login-description { margin: 0; color: #52525b; font-size: 14px; line-height: 1.7; }
.login-button {
  display: inline-flex;
  min-height: 50px;
  align-items: center;
  justify-content: center;
  gap: 20px;
  padding: 12px 24px;
  border: 1px solid #d4d4d8;
  border-radius: 7px;
  background: #fff;
  color: #27272a;
  font-size: 14px;
  font-weight: 600;
  box-shadow: 0 1px 2px #18181b08;
  transition: background 160ms ease, border-color 160ms ease;
}
.login-button:hover:not(:disabled) { background: #fafafa; border-color: #a1a1aa; }
.login-button:disabled { opacity: .6; }
.login-notice { margin: 18px auto 0; max-width: 320px; font-size: 12px; line-height: 1.7; color: #71717a; }
.login-error { margin: 18px 0 0; font-size: 13px; line-height: 1.6; color: #b42318; }
`;
