import { notFound, redirect } from "next/navigation";
import WorkspacePage from "@/components/layout/WorkspacePage";
import AdminScreenRouter from "@/components/admin/AdminScreenRouter";

import CommentsWorkspace from "@/components/comments/CommentsWorkspace";
import { ProjectHeaderPage } from "@/components/common/ProjectHeader";
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
  if (screen === "users" || screen === "policy" || screen === "audit" || screen === "dashboard" || screen === "skills" || screen === "templates" || screen === "prompt-sets") {
    return <PreviewRoleBoundary requiredRole={item.requiredRole}><AdminScreenRouter screen={screen} requestedTab={tab === "models" || tab === "tokens" ? tab : null} /></PreviewRoleBoundary>;
  }

  return (
    <PreviewRoleBoundary requiredRole={item.requiredRole}>
      {screen === "write" ? <CommentsWorkspace />
        : ["analysis", "files", "toc", "setup", "review"].includes(screen) ? <ProjectHeaderPage title={item.label} headingId="workspace-screen-title" />
        : <WorkspacePage title={item.label} headingId="workspace-screen-title">{null}</WorkspacePage>}
    </PreviewRoleBoundary>
  );
}
