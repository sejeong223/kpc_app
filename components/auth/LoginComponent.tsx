"use client";

import Image from "next/image";
import { signIn, signOut } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { Languages } from "lucide-react";

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
    <div className="flex flex-col items-center">
      <Languages
        aria-hidden="true"
        className="h-20 w-20 shrink-0 text-indigo-600"
      />

      <div className="mb-3 mt-10 flex flex-col items-center">
        <h1 className="text-[32px] font-semibold">Sign In</h1>
        {reason === "forbidden" ? (
          <p className="my-3 max-w-sm text-center text-[14px] font-normal">
            관리자 권한이 없습니다. 권한이 있는 다른 계정으로 로그인해 주세요.
          </p>
        ) : (
          <div className="my-3 flex flex-col items-center">
            <p className="text-[14px] font-normal">
              Access your account using your
            </p>
            <p className="text-[14px] font-normal">
              company Microsoft login.
            </p>
          </div>
        )}
      </div>

      <Button
        type="button"
        size="lg"
        className="m-1 p-6 font-semibold"
        variant="outline"
        onClick={() => void startLogin()}
      >
        <Image
          alt="Microsoft Logo"
          width={20}
          height={20}
          className="mr-5"
          src="/microsoft.svg"
        />
        {reason === "forbidden"
          ? "다른 계정으로 로그인"
          : "Sign in with Microsoft"}
      </Button>

      {popupError ? (
        <p
          role="alert"
          className="mt-3 max-w-sm text-center text-sm text-destructive"
        >
          {popupError}
        </p>
      ) : null}
    </div>
  );
}
