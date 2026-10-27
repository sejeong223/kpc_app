"use client";

import { createContext, useCallback, useContext, useMemo, useReducer, type Dispatch } from "react";

import { useAuthRuntime } from "@/components/providers";
import type { ProfileDisplay, ProfilePreviewAction, ProfilePreviewState } from "@/config/profile-preview";
import { createInitialProfilePreviewState, profilePreviewReducer, resolveProfileDisplay } from "@/lib/profile-preview";

export interface ProfilePreviewContextValue {
  authEnabled: boolean;
  rolePreviewEnabled: boolean;
  profile: ProfileDisplay;
  state: ProfilePreviewState;
  dispatch: Dispatch<ProfilePreviewAction>;
}

const ProfilePreviewContext = createContext<ProfilePreviewContextValue | null>(null);

export default function ProfilePreviewProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const { authEnabled, session } = useAuthRuntime();
  const [state, reducerDispatch] = useReducer(profilePreviewReducer, undefined, createInitialProfilePreviewState);
  const dispatch = useCallback((action: ProfilePreviewAction) => {
    if (authEnabled && action.type === "set-role") return;
    reducerDispatch(action);
  }, [authEnabled]);
  const value = useMemo<ProfilePreviewContextValue>(() => ({
    authEnabled,
    rolePreviewEnabled: !authEnabled,
    profile: resolveProfileDisplay({ authEnabled, session, previewRole: state.previewRole }),
    state,
    dispatch,
  }), [authEnabled, session, state, dispatch]);

  return <ProfilePreviewContext.Provider value={value}>{children}</ProfilePreviewContext.Provider>;
}

export function useProfilePreview(): ProfilePreviewContextValue {
  const context = useContext(ProfilePreviewContext);
  if (!context) throw new Error("useProfilePreview must be used within ProfilePreviewProvider");
  return context;
}
