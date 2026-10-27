"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import type { AppRole } from "@/lib/auth/roles";
import { shouldHidePreviewScreen } from "@/lib/profile-preview";

import { useProfilePreview } from "./ProfilePreviewProvider";

export interface PreviewRoleBoundaryProps {
  requiredRole?: AppRole;
  children: React.ReactNode;
}

export default function PreviewRoleBoundary({ requiredRole, children }: PreviewRoleBoundaryProps): React.ReactElement | null {
  const { authEnabled, state } = useProfilePreview();
  const router = useRouter();
  const hidden = shouldHidePreviewScreen(authEnabled, state.previewRole, requiredRole);

  useEffect(() => {
    if (hidden) router.replace("/workspace/pipeline");
  }, [hidden, router]);

  return hidden ? null : <>{children}</>;
}
