"use client";

import { useCallback, useState } from "react";

import { Toast } from "@/components/common/Toast";
import type { GnbTab } from "@/types/proposals";
import AppHeader from "./AppHeader";

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({
  children,
}: AppShellProps): React.ReactElement {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = useCallback((message: string) => setToastMessage(message), []);
  const handleUnavailableTab = useCallback(
    (tab: Exclude<GnbTab, "proposals">) => {
      const labels: Partial<Record<GnbTab, string>> = {
        knowledge_ai: "Knowledge AI",
        dia: "Knowledge AI",
        ai_worker: "AI Worker",
        custom_ai: "Custom AI",
        ai_agent: "AI Agent",
        ai_community: "AI Community",
      };
      showToast(`${labels[tab] ?? tab}는 현재 제안서 UI 이식 범위에 포함되지 않은 화면입니다.`);
    },
    [showToast],
  );

  return (
    <div className="min-h-screen">
      <AppHeader
        activeTab="proposals"
        onUnavailableTab={handleUnavailableTab}
        onShowToast={showToast}
      />
      <main className="min-h-screen pt-14">{children}</main>
      {toastMessage && (
        <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
      )}
    </div>
  );
}
