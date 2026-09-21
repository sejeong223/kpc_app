"use client";

import Image from "next/image";
import { signIn, signOut } from "next-auth/react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { isTrustedLoginSuccessMessage } from "@/lib/auth/login-message";
import { isPopupOrIframe } from "@/utils/frameCheck";
import { openCenteredPopup } from "@/utils/popup";

export interface LoginComponentProps {
  callbackUrl: string;
  embeddedMode: boolean;
  reason?: "forbidden";
}

export default function LoginComponent({
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
        "kpc-app-login",
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
    <div className="flex w-full max-w-sm flex-col items-center gap-6 rounded-xl border bg-white p-8 shadow-sm">
      <Image
        alt="Microsoft logo"
        width={48}
        height={48}
        src="/M365.png"
      />

      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold">로그인</h1>
        {reason === "forbidden" ? (
          <p className="text-sm text-muted-foreground">
            관리자 권한이 없습니다. 권한이 있는 다른 계정으로 로그인해 주세요.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            회사 Microsoft 계정으로 계속하세요.
          </p>
        )}
      </div>

      <Button
        type="button"
        size="lg"
        className="w-full"
        variant="outline"
        onClick={() => void startLogin()}
      >
        {reason === "forbidden"
          ? "다른 계정으로 로그인"
          : "Microsoft 계정으로 로그인"}
      </Button>

      {popupError ? (
        <p role="alert" className="text-center text-sm text-destructive">
          {popupError}
        </p>
      ) : null}
    </div>
  );
}
