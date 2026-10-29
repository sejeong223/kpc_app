"use client";

import { Button, makeStyles, mergeClasses, shorthands, Toast, Toaster, ToastTitle, useToastController } from "@fluentui/react-components";
import { AddRegular, ChevronLeft12Regular } from "@fluentui/react-icons";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import ModalFrame from "@/components/ui/ModalFrame";
import type { TokenRequestErrors, TokenRequestPreview } from "@/config/token-preview";
import { getLatestPendingTokenRequest, toTokenRequestPreview, toTokenUsageSnapshot, validateTokenRequestDraft } from "@/lib/token-preview";
import { useAdminAccess, useAdminCommand, useAdminSelf } from "@/hooks/admin/use-admin-data";
import { AdminDataError } from "@/lib/admin/errors";
import AdminAsyncState from "@/components/admin/ui/AdminAsyncState";
import type { AdminCommand, CommandReceipt, SelfUsageView } from "@/types/admin";

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

// 신청 화면을 다시 열 때 검증 표시와 제출 키만 새로 만든다.
function TokenRequestForm({ formId, onSubmitted, view, submit, pending }: {
  formId: string; onSubmitted(request: TokenRequestPreview): void; view: SelfUsageView;
  submit(command: AdminCommand): Promise<CommandReceipt>; pending: boolean;
}): React.ReactElement {
  const { state, dispatch, closeTokenDialog } = useProfilePreview();
  const access = useAdminAccess();
  const { requestDraft } = state.tokens;
  const locked = useRef(false), submission = useRef<string | null>(null);
  const [touched, setTouched] = useState({ amount: false, project: false, reason: false });
  const [submitErrors, setSubmitErrors] = useState<TokenRequestErrors>({});
  const validation = validateTokenRequestDraft(requestDraft, view.limitTokens);
  const errors: TokenRequestErrors = { ...submitErrors };
  if (!validation.ok) {
    for (const field of ["amount", "project", "reason"] as const) {
      if (touched[field]) errors[field] = validation.errors[field];
    }
    if (validation.errors.form) errors.form = validation.errors.form;
  }
  const onDraftAction: TokenRequestPanelProps["onDraftAction"] = (action) => {
    if (locked.current || pending) return;
    submission.current = null;
    setSubmitErrors({});
    dispatch({ type: "token", action });
  };
  const onSubmit: TokenRequestPanelProps["onSubmit"] = (event) => {
    event.preventDefault();
    if (locked.current || pending) return;
    const form = event.currentTarget;
    const result = validateTokenRequestDraft(requestDraft, view.limitTokens);
    if (!result.ok) {
      setTouched({ amount: true, project: true, reason: true });
      setSubmitErrors(result.errors);
      const field = (["amount", "project", "reason"] as const).find((key) => result.errors[key]);
      requestAnimationFrame(() => {
        if (field) form.querySelector<HTMLElement>('[data-token-field="' + field + '"]')?.focus();
      });
      return;
    }
    locked.current = true;
    submission.current ??= crypto.randomUUID();
    void (async () => {
      try {
        const receipt = await submit({ type: "submit-token-request", submissionId: submission.current!, amountTokens: result.value.amountTokens, projectId: result.value.projectId === "outside" ? null : result.value.projectId, reason: result.value.reason });
        if (!receipt.createdRequest) throw new AdminDataError("CONFLICT", "신청 결과를 확인하지 못했습니다.");
        closeTokenDialog();
        onSubmitted(toTokenRequestPreview(receipt.createdRequest, access.data?.departments ?? []));
      } catch (error) {
        setSubmitErrors({ form: error instanceof AdminDataError ? error.message : "신청하지 못했습니다. 다시 시도해 주세요." });
        requestAnimationFrame(() => form.querySelector<HTMLElement>("[data-token-field='reason']")?.focus());
      } finally { locked.current = false; }
    })();
  };
  return <TokenRequestPanel
    formId={formId} draft={requestDraft} latestPending={getLatestPendingTokenRequest(view.requests.map((r) => toTokenRequestPreview(r, access.data?.departments ?? [])))}
    used={view.usedTokens} limit={view.limitTokens} errors={errors}
    onDraftAction={onDraftAction} onFieldBlur={(field) => setTouched((previous) => ({ ...previous, [field]: true }))}
    onSubmit={onSubmit}
  />;
}

export default function TokenDialogs(): React.ReactElement {
  const styles = useStyles();
  const { profile, state, openTokenDialog, closeTokenDialog } = useProfilePreview();
  const self = useAdminSelf(), command = useAdminCommand();
  const snapshot = self.data ? toTokenUsageSnapshot(self.data) : null;
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
  const requestValid = Boolean(self.data && validateTokenRequestDraft(state.tokens.requestDraft, self.data.limitTokens).ok);
  const close = () => closeTokenDialog();

  return <>
    <ModalFrame
      open={view !== null} width={view === "usage" ? 760 : 560} contentKey={view ?? "closed"}
      title={view === "usage" ? "내 AI Token 사용량" : "토큰 추가 신청"}
      subtitle={view === "usage"
        ? [snapshot?.periodLabel, profile.name, profile.department].filter(Boolean).join(" · ")
        : "운영 정책 관리자가 승인하면 이번 달 개인 한도에 바로 더해집니다"}
      onClose={close}
      footer={view === "usage" ? <>
        <span className={styles.spacer} />
        <Button type="button" className={styles.button} onClick={close}>닫기</Button>
        <Button type="button" appearance="primary" className={styles.button} icon={<AddRegular />}
          disabled={!self.data} onClick={() => openTokenDialog("request")}>토큰 추가 신청</Button>
      </> : <>
        <Button type="button" appearance="subtle" className={styles.button} icon={{ children: <ChevronLeft12Regular />, className: styles.backIcon }}
          onClick={() => openTokenDialog("usage")}>사용량 보기</Button>
        <span className={styles.spacer} />
        <Button type="button" className={mergeClasses(styles.button, styles.cancelButton)} onClick={close}>취소</Button>
        <Button type="submit" form={formId} appearance="primary" className={mergeClasses(styles.button, styles.submitButton)} disabled={!requestValid || command.isPending}>{command.isPending ? "신청 중…" : "신청하기"}</Button>
      </>}
    >
      {!self.data && <AdminAsyncState state={self.isError ? "error" : "loading"} onRetry={() => void self.refetch()} />}
      {view === "usage" && self.data && snapshot && <TokenUsagePanel snapshot={snapshot} used={self.data.usedTokens} limit={self.data.limitTokens} />}
      {view === "request" && self.data && <TokenRequestForm formId={formId} view={self.data} submit={command.mutateAsync} pending={command.isPending} onSubmitted={(request) => {
        dispatchToast(<Toast className={styles.toast}><ToastTitle>토큰 +{request.amountK}K 신청을 미리보기로 등록했습니다 · 관리자 승인 대기</ToastTitle></Toast>, { intent: "success" });
      }} />}
    </ModalFrame>
    <Toaster toasterId={toasterId} position="bottom-end" timeout={3500} className={styles.toaster} />
  </>;
}
