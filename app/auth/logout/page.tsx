"use client";

import { useSearchParams } from "next/navigation";
import { signOut } from "next-auth/react";
import { Suspense, useEffect } from "react";

import { Spinner } from "@/components/ui/spinner";
import { sanitizeCallbackUrl } from "@/lib/auth/callback-url";

function LogoutEffect() {
  const searchParams = useSearchParams();
  const callbackUrl = sanitizeCallbackUrl(searchParams.get("callbackUrl"));

  useEffect(() => {
    void signOut({ callbackUrl });
  }, [callbackUrl]);

  return <Spinner />;
}

export default function LogoutPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white">
      <Suspense fallback={<Spinner />}>
        <LogoutEffect />
      </Suspense>
    </main>
  );
}
