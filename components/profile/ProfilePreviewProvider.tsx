"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, type Dispatch } from "react";

import { useAuthRuntime } from "@/components/providers";
import { PROFILE_TOKEN_USAGE, type ProfileDisplay, type ProfilePreviewAction, type ProfilePreviewState } from "@/config/profile-preview";
import type { TokenDialogView, TokenRequestPreview, TokenSubmitResult } from "@/config/token-preview";
import { createInitialProfilePreviewState, profilePreviewReducer, resolveProfileDisplay } from "@/lib/profile-preview";
import { validateTokenRequestDraft } from "@/lib/token-preview";

export interface ProfilePreviewContextValue {
  authEnabled: boolean;
  rolePreviewEnabled: boolean;
  profile: ProfileDisplay;
  state: ProfilePreviewState;
  dispatch: Dispatch<ProfilePreviewAction>;
  openTokenDialog(view: TokenDialogView, returnFocusTo?: HTMLElement | null): void;
  closeTokenDialog(options?: { restoreFocus?: boolean }): void;
  submitTokenRequest(): TokenSubmitResult;
}

const ProfilePreviewContext = createContext<ProfilePreviewContextValue | null>(null);

export default function ProfilePreviewProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const { authEnabled, session } = useAuthRuntime();
  const [state, reducerDispatch] = useReducer(profilePreviewReducer, undefined, createInitialProfilePreviewState);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const focusFrame = useRef<number | null>(null);
  const submissionLocked = useRef(false);
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
    if (view === "request") submissionLocked.current = false;
    dispatch({ type: "token", action: { type: "open", view } });
  }, [dispatch]);
  const closeTokenDialog = useCallback((options?: { restoreFocus?: boolean }) => {
    dispatch({ type: "token", action: { type: "close" } });
    if (options?.restoreFocus !== false) restoreTokenFocus();
  }, [dispatch, restoreTokenFocus]);
  const submitTokenRequest = useCallback((): TokenSubmitResult => {
    if (state.tokens.dialogView !== "request" || submissionLocked.current) {
      return { ok: false, errors: { form: "신청 화면을 다시 열어 주세요." } };
    }
    const result = validateTokenRequestDraft(state.tokens.requestDraft, PROFILE_TOKEN_USAGE.limit);
    if (!result.ok) return result;
    submissionLocked.current = true;
    const request: TokenRequestPreview = {
      ...result.value, id: crypto.randomUUID(), createdAt: new Date().toISOString(),
      requesterName: profile.name, department: profile.department, status: "pending",
    };
    dispatch({
      type: "token",
      action: {
        type: "submit", requestId: request.id, submittedAt: request.createdAt,
        requesterName: request.requesterName, department: request.department,
      },
    });
    restoreTokenFocus();
    return { ok: true, request };
  }, [dispatch, profile, restoreTokenFocus, state.tokens]);
  const value = useMemo<ProfilePreviewContextValue>(() => ({
    authEnabled,
    rolePreviewEnabled: !authEnabled,
    profile,
    state,
    dispatch,
    openTokenDialog,
    closeTokenDialog,
    submitTokenRequest,
  }), [authEnabled, profile, state, dispatch, openTokenDialog, closeTokenDialog, submitTokenRequest]);

  return <ProfilePreviewContext.Provider value={value}>{children}</ProfilePreviewContext.Provider>;
}

export function useProfilePreview(): ProfilePreviewContextValue {
  const context = useContext(ProfilePreviewContext);
  if (!context) throw new Error("useProfilePreview must be used within ProfilePreviewProvider");
  return context;
}
