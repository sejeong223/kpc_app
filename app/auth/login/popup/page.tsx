import { notFound } from "next/navigation";

import { serverEnv } from "@/config/env";
import { sanitizeCallbackUrl } from "@/lib/auth/callback-url";

import PopupLoginPage from "./PopupLoginPage";

export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    callbackUrl?: string;
    success?: string;
    selectAccount?: string;
  }>;
}) {
  if (!serverEnv.authEnabled) {
    notFound();
  }

  const params = await searchParams;

  return (
    <PopupLoginPage
      callbackUrl={sanitizeCallbackUrl(params.callbackUrl)}
      success={params.success === "1"}
      selectAccount={params.selectAccount === "1"}
    />
  );
}
