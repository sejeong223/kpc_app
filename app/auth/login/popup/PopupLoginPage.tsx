"use client";

import { signIn } from "next-auth/react";
import { useEffect, useState } from "react";

import { Spinner } from "@/components/ui/spinner";
import { LOGIN_SUCCESS_MESSAGE } from "@/lib/auth/login-message";

export interface PopupLoginPageProps {
  callbackUrl: string;
  success: boolean;
  selectAccount: boolean;
}

export default function PopupLoginPage({
  callbackUrl,
  success,
  selectAccount,
}: PopupLoginPageProps) {
  const [recoveryMessage, setRecoveryMessage] = useState<string | null>(null);

  useEffect(() => {
    if (success) {
      if (!window.opener) {
        const recoveryTimer = window.setTimeout(() => {
          setRecoveryMessage(
            "로그인을 완료했지만 원래 창을 찾을 수 없습니다. 이 창을 닫고 다시 시도해 주세요.",
          );
        }, 0);

        return () => window.clearTimeout(recoveryTimer);
      }

      window.opener.postMessage(
        { type: LOGIN_SUCCESS_MESSAGE },
        window.location.origin,
      );
      window.close();
      return;
    }

    const params = new URLSearchParams({
      success: "1",
      callbackUrl,
    });

    void signIn(
      "azure-ad",
      { callbackUrl: `/auth/login/popup?${params.toString()}` },
      selectAccount ? { prompt: "select_account" } : undefined,
    );
  }, [callbackUrl, selectAccount, success]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-white p-6">
      {recoveryMessage ? (
        <p role="alert" className="max-w-sm text-center text-sm">
          {recoveryMessage}
        </p>
      ) : (
        <Spinner />
      )}
    </main>
  );
}
