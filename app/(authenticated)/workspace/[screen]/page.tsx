import { notFound, redirect } from "next/navigation";
import WorkspacePage from "@/components/layout/WorkspacePage";
import AdminScreenRouter from "@/components/admin/AdminScreenRouter";
import CommentsWorkspace from "@/components/comments/CommentsWorkspace";

import WorkspaceScreen from "@/components/workspace/WorkspaceScreen";
import FilesScreen from "@/components/workspace/files/FilesScreen";
import { ProjectHeaderPage } from "@/components/common/ProjectHeader";
import PreviewRoleBoundary from "@/components/profile/PreviewRoleBoundary";
import RfpRegisterPage from "@/components/rfp/RfpRegisterPage";
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

  // 실제 관리자 경로는 기존 서버 역할 검사와 미리보기 역할 경계를 유지한다.
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
      {screen === "register" ? <RfpRegisterPage />
        : screen === "files" ? <FilesScreen />
        : screen === "write" ? <CommentsWorkspace />
        : screen === "toc" || screen === "setup" ? <WorkspaceScreen screen={screen} />
        : screen === "analysis" || screen === "review" ? <ProjectHeaderPage title={item.label} headingId="workspace-screen-title" />
        : <WorkspacePage title={item.label} headingId="workspace-screen-title">{null}</WorkspacePage>}
    </PreviewRoleBoundary>
  );
}
