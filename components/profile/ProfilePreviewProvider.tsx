"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, type Dispatch } from "react";

import { useAuthRuntime } from "@/components/providers";
import { type ProfileDisplay, type ProfilePreviewAction, type ProfilePreviewState } from "@/config/profile-preview";
import type { TokenDialogView } from "@/config/token-preview";
import { createInitialProfilePreviewState, profilePreviewReducer, resolveProfileDisplay } from "@/lib/profile-preview";

export interface ProfilePreviewContextValue {
  authEnabled: boolean;
  rolePreviewEnabled: boolean;
  profile: ProfileDisplay;
  state: ProfilePreviewState;
  dispatch: Dispatch<ProfilePreviewAction>;
  openTokenDialog(view: TokenDialogView, returnFocusTo?: HTMLElement | null): void;
  closeTokenDialog(options?: { restoreFocus?: boolean }): void;
}

const ProfilePreviewContext = createContext<ProfilePreviewContextValue | null>(null);

export default function ProfilePreviewProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const { authEnabled, session } = useAuthRuntime();
  const [state, reducerDispatch] = useReducer(profilePreviewReducer, undefined, createInitialProfilePreviewState);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const focusFrame = useRef<number | null>(null);
  const profile = useMemo(() => resolveProfileDisplay({
    authEnabled, session, previewRole: state.previewRole,
  }), [authEnabled, session, state.previewRole]);
  useEffect(() => () => {
    if (focusFrame.current !== null) cancelAnimationFrame(focusFrame.current);
  }, []);
  const dispatch = useCallback((action: ProfilePreviewAction) => {
    if (authEnabled && action.type === "set-role") return;
    reducerDispatch(action);
  }, [authEnabled]);
  const restoreTokenFocus = useCallback(() => {
    if (focusFrame.current !== null) cancelAnimationFrame(focusFrame.current);
    focusFrame.current = requestAnimationFrame(() => {
      focusFrame.current = null;
      const targets = [
        returnFocusRef.current,
        document.querySelector<HTMLElement>("[data-sidebar-close]"),
        document.getElementById("workspace-sidebar-trigger"),
        document.getElementById("main-content"),
      ];
      targets.find((target) => target?.isConnected && target.getClientRects().length > 0
        && !target.closest("[inert], :disabled, [aria-disabled='true']"))?.focus({ preventScroll: true });
    });
  }, []);
  const openTokenDialog = useCallback((view: TokenDialogView, returnFocusTo?: HTMLElement | null) => {
    if (focusFrame.current !== null) cancelAnimationFrame(focusFrame.current);
    focusFrame.current = null;
    if (returnFocusTo !== undefined) returnFocusRef.current = returnFocusTo;
    dispatch({ type: "token", action: { type: "open", view } });
  }, [dispatch]);
  const closeTokenDialog = useCallback((options?: { restoreFocus?: boolean }) => {
    dispatch({ type: "token", action: { type: "close" } });
    if (options?.restoreFocus !== false) restoreTokenFocus();
  }, [dispatch, restoreTokenFocus]);
  const value = useMemo<ProfilePreviewContextValue>(() => ({
    authEnabled,
    rolePreviewEnabled: !authEnabled,
    profile,
    state,
    dispatch,
    openTokenDialog,
    closeTokenDialog,
  }), [authEnabled, profile, state, dispatch, openTokenDialog, closeTokenDialog]);

  return <ProfilePreviewContext.Provider value={value}>{children}</ProfilePreviewContext.Provider>;
}

export function useProfilePreview(): ProfilePreviewContextValue {
  const context = useContext(ProfilePreviewContext);
  if (!context) throw new Error("useProfilePreview must be used within ProfilePreviewProvider");
  return context;
}
