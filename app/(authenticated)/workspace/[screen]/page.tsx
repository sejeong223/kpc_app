import { notFound, redirect } from "next/navigation";
import AdminScreenRouter from "@/components/admin/AdminScreenRouter";

import PreviewRoleBoundary from "@/components/profile/PreviewRoleBoundary";
import { serverEnv } from "@/config/env";
import { getSidebarItemByScreen } from "@/config/sidebar";
import { requireRole } from "@/lib/auth/guards";

interface WorkspaceScreenPageProps {
  params: Promise<{ screen: string }>;
  searchParams?: Promise<{ tab?: string | string[] }>;
}

export default async function WorkspaceScreenPage({
  params, searchParams,
}: WorkspaceScreenPageProps): Promise<React.ReactElement> {
  const { screen } = await params;
  const item = getSidebarItemByScreen(screen);
  if (!item) notFound();

  // Only these empty preview pages bypass roles when auth is disabled.
  // Keep real admin routes and requireRole's existing policy unchanged.
  if (serverEnv.authEnabled && item.requiredRole) {
    await requireRole(item.requiredRole, screen === "tokens" ? "/workspace/tokens" : item.href);
  }
  if (screen === "tokens") redirect("/workspace/policy?tab=tokens");
  const tab = (await searchParams)?.tab;
  if (screen === "users" || screen === "policy" || screen === "audit" || screen === "dashboard" || screen === "skills" || screen === "templates") {
    return <PreviewRoleBoundary requiredRole={item.requiredRole}><AdminScreenRouter screen={screen} requestedTab={tab === "models" || tab === "tokens" ? tab : null} /></PreviewRoleBoundary>;
  }

  return (
    <PreviewRoleBoundary requiredRole={item.requiredRole}>
      <section aria-labelledby="workspace-screen-title">
        <h1 id="workspace-screen-title">{item.label}</h1>
        <p>{`${item.label} 화면입니다.`}</p>
      </section>
    </PreviewRoleBoundary>
  );
}
