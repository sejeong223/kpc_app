"use client";

import { useSearchParams } from "next/navigation";
import { signOut } from "next-auth/react";
import { Suspense, useEffect } from "react";

import { sanitizeCallbackUrl } from "@/lib/auth/callback-url";

function LogoutEffect() {
  const searchParams = useSearchParams();
  const callbackUrl = sanitizeCallbackUrl(searchParams.get("callbackUrl"));

  useEffect(() => {
    void signOut({ callbackUrl });
  }, [callbackUrl]);

  return <p role="status">로그아웃 중…</p>;
}

export default function LogoutPage() {
  return (
    <main>
      <Suspense fallback={<p role="status">로그아웃 중…</p>}>
        <LogoutEffect />
      </Suspense>
    </main>
  );
}
