"use client";

import { Button, makeStyles, mergeClasses, shorthands, Toast, Toaster, ToastTitle, useToastController } from "@fluentui/react-components";
import { AddRegular, ChevronLeft12Regular } from "@fluentui/react-icons";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import ModalFrame from "@/components/ui/ModalFrame";
import { PROFILE_TOKEN_USAGE } from "@/config/profile-preview";
import { TOKEN_USAGE_SNAPSHOT, type TokenRequestErrors, type TokenRequestPreview } from "@/config/token-preview";
import { getLatestPendingTokenRequest, validateTokenRequestDraft } from "@/lib/token-preview";

import { useProfilePreview } from "../ProfilePreviewProvider";
import TokenRequestPanel, { type TokenRequestPanelProps } from "./TokenRequestPanel";
import TokenUsagePanel from "./TokenUsagePanel";

const useStyles = makeStyles({
  button: { height: "30px", minWidth: 0, padding: "0 12px", borderRadius: "8px", fontFamily: "inherit", fontSize: "12px", fontWeight: 700 },
  cancelButton: { height: "32px", border: "1px solid var(--line3, #dddde2)" },
  backIcon: { width: "12px", height: "12px", fontSize: "12px" },
  submitButton: {
    height: "32px",
    ":disabled": {
      backgroundColor: "var(--red, #d7192f)", ...shorthands.borderColor("var(--red, #d7192f)"),
      color: "#fff", opacity: 0.45, cursor: "not-allowed",
    },
    "&:disabled:hover, &:disabled:hover:active, &:disabled:active:focus-visible": {
      backgroundColor: "#c31429", ...shorthands.borderColor("#c31429"), color: "#fff",
    },
  },
  spacer: { flex: 1 },
  toaster: { maxWidth: "calc(100vw - 32px)", zIndex: 4400 },
  toast: { width: "100%", maxWidth: "calc(100vw - 32px)", boxSizing: "border-box", fontFamily: "inherit", overflowWrap: "anywhere" },
});

// Mount a fresh form controller on each request entry, resetting only validation UI.
function TokenRequestForm({ formId, onSubmitted }: {
  formId: string; onSubmitted(request: TokenRequestPreview): void;
}): React.ReactElement {
  const { state, dispatch, submitTokenRequest } = useProfilePreview();
  const { requestDraft, requests } = state.tokens;
  const [touched, setTouched] = useState({ amount: false, project: false, reason: false });
  const [submitErrors, setSubmitErrors] = useState<TokenRequestErrors>({});
  const validation = validateTokenRequestDraft(requestDraft, PROFILE_TOKEN_USAGE.limit);
  const errors: TokenRequestErrors = { ...submitErrors };
  if (!validation.ok) {
    for (const field of ["amount", "project", "reason"] as const) {
      if (touched[field]) errors[field] = validation.errors[field];
    }
    if (validation.errors.form) errors.form = validation.errors.form;
  }
  const onDraftAction: TokenRequestPanelProps["onDraftAction"] = (action) => {
    setSubmitErrors({});
    dispatch({ type: "token", action });
  };
  const onSubmit: TokenRequestPanelProps["onSubmit"] = (event) => {
    event.preventDefault();
    const result = submitTokenRequest();
    if (!result.ok) {
      setTouched({ amount: true, project: true, reason: true });
      setSubmitErrors(result.errors);
      const form = event.currentTarget;
      const field = (["amount", "project", "reason"] as const).find((key) => result.errors[key]);
      requestAnimationFrame(() => {
        if (field) form.querySelector<HTMLElement>('[data-token-field="' + field + '"]')?.focus();
      });
      return;
    }
    onSubmitted(result.request);
  };
  return <TokenRequestPanel
    formId={formId} draft={requestDraft} latestPending={getLatestPendingTokenRequest(requests)}
    used={PROFILE_TOKEN_USAGE.used} limit={PROFILE_TOKEN_USAGE.limit} errors={errors}
    onDraftAction={onDraftAction} onFieldBlur={(field) => setTouched((previous) => ({ ...previous, [field]: true }))}
    onSubmit={onSubmit}
  />;
}

export default function TokenDialogs(): React.ReactElement {
  const styles = useStyles();
  const { profile, state, openTokenDialog, closeTokenDialog } = useProfilePreview();
  const view = state.tokens.dialogView;
  const formId = useId();
  const toasterId = useId();
  const { dispatchToast } = useToastController(toasterId);
  const pathname = usePathname();
  const previousPathname = useRef(pathname);
  useEffect(() => {
    if (previousPathname.current === pathname) return;
    previousPathname.current = pathname;
    if (view !== null) closeTokenDialog({ restoreFocus: false });
  }, [pathname, view, closeTokenDialog]);
  const requestValid = validateTokenRequestDraft(state.tokens.requestDraft, PROFILE_TOKEN_USAGE.limit).ok;
  const close = () => closeTokenDialog();

  return <>
    <ModalFrame
      open={view !== null} width={view === "usage" ? 760 : 560} contentKey={view ?? "closed"}
      title={view === "usage" ? "내 AI Token 사용량" : "토큰 추가 신청"}
      subtitle={view === "usage"
        ? [TOKEN_USAGE_SNAPSHOT.periodLabel, profile.name, profile.department].filter(Boolean).join(" · ")
        : "운영 정책 관리자가 승인하면 이번 달 개인 한도에 바로 더해집니다"}
      onClose={close}
      footer={view === "usage" ? <>
        <span className={styles.spacer} />
        <Button type="button" className={styles.button} onClick={close}>닫기</Button>
        <Button type="button" appearance="primary" className={styles.button} icon={<AddRegular />}
          onClick={() => openTokenDialog("request")}>토큰 추가 신청</Button>
      </> : <>
        <Button type="button" appearance="subtle" className={styles.button} icon={{ children: <ChevronLeft12Regular />, className: styles.backIcon }}
          onClick={() => openTokenDialog("usage")}>사용량 보기</Button>
        <span className={styles.spacer} />
        <Button type="button" className={mergeClasses(styles.button, styles.cancelButton)} onClick={close}>취소</Button>
        <Button type="submit" form={formId} appearance="primary" className={mergeClasses(styles.button, styles.submitButton)} disabled={!requestValid}>신청하기</Button>
      </>}
    >
      {view === "usage" && <TokenUsagePanel snapshot={TOKEN_USAGE_SNAPSHOT} used={PROFILE_TOKEN_USAGE.used} limit={PROFILE_TOKEN_USAGE.limit} />}
      {view === "request" && <TokenRequestForm formId={formId} onSubmitted={(request) => {
        dispatchToast(<Toast className={styles.toast}><ToastTitle>토큰 +{request.amountK}K 신청을 미리보기로 등록했습니다 · 관리자 승인 대기</ToastTitle></Toast>, { intent: "success" });
      }} />}
    </ModalFrame>
    <Toaster toasterId={toasterId} position="bottom-end" timeout={3500} className={styles.toaster} />
  </>;
}
