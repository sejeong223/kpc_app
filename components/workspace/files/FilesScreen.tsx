"use client";
import { useState } from "react";
import { useAuthRuntime } from "@/components/providers";
import { useProfilePreview } from "@/components/profile/ProfilePreviewProvider";
import WorkspacePage from "@/components/layout/WorkspacePage";
import { fileIdentityKey, resolveFileIdentity } from "@/lib/workspace/files/identity";
import AdminAsyncState from "@/components/admin/ui/AdminAsyncState";
import DadamThemeScope from "@/components/providers/DadamThemeScope";
import FileRuntimeProvider from "./FileRuntimeProvider";
import FilesWorkspace from "./FilesWorkspace";

export default function FilesScreen(): React.ReactElement {
  const { authEnabled, session } = useAuthRuntime(), { state, profile } = useProfilePreview();
  const [attempt, setAttempt] = useState(0);
  const identity = resolveFileIdentity({ authEnabled, session, previewRole: state.previewRole, displayName: profile.name });
  if (!identity) return <DadamThemeScope><WorkspacePage title="파일 업로드"><AdminAsyncState state="forbidden" message="사용자 정보를 확인할 수 없습니다. 다시 로그인해 주세요." /></WorkspacePage></DadamThemeScope>;
  return <DadamThemeScope><FileRuntimeProvider key={fileIdentityKey(identity) + attempt} identity={identity}>
    <FilesWorkspace onReconnect={() => setAttempt(value => value + 1)} />
  </FileRuntimeProvider></DadamThemeScope>;
}
