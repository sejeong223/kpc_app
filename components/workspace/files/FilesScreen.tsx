"use client";
import WorkspacePage from "@/components/layout/WorkspacePage";
import AdminAsyncState from "@/components/admin/ui/AdminAsyncState";
import DadamThemeScope from "@/components/providers/DadamThemeScope";
import { useOptionalWorkspaceRuntime } from "../WorkspaceProjectProvider";
import FilesWorkspace from "./FilesWorkspace";
export default function FilesScreen():React.ReactElement{
  const runtime=useOptionalWorkspaceRuntime();return <DadamThemeScope>{runtime?<FilesWorkspace onReconnect={runtime.reconnect}/>:<WorkspacePage title="파일 업로드"><AdminAsyncState state="forbidden" message="사용자 정보를 확인할 수 없습니다. 다시 로그인해 주세요."/></WorkspacePage>}</DadamThemeScope>;
}
