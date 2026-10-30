"use client";

import { Button, Dialog, DialogContent, DialogSurface, DialogTitle, makeStyles, shorthands } from "@fluentui/react-components";
import { Dismiss12Regular } from "@fluentui/react-icons";
import { useEffect, useId, useLayoutEffect, useRef } from "react";

export interface ModalFrameProps {
  open: boolean;
  title: string;
  subtitle?: string;
  width?: number;
  contentKey: string;
  children: React.ReactNode;
  footer: React.ReactNode;
  onClose(): void;
}

const useStyles = makeStyles({
  surface: {
    display: "flex", flexDirection: "column", minWidth: 0,
    maxWidth: "calc(100vw - 32px)", maxHeight: "min(88vh, calc(100svh - 32px))",
    boxSizing: "border-box", padding: 0, overflow: "hidden",
    border: "1px solid #e6e7eb", borderRadius: "16px", backgroundColor: "#fff", color: "#161616",
    boxShadow: "0 18px 48px rgba(16,17,20,.16),0 2px 6px rgba(16,17,20,.06)",
    fontFamily: "inherit", fontSize: "12px", lineHeight: "1.5", zIndex: 4300,
    "@media screen and (max-width: 480px)": { maxWidth: "calc(100vw - 32px)" },
    "@media screen and (max-height: 359px)": {
      padding: 0, overflow: "hidden", ...shorthands.borderWidth("1px"),
    },
  },
  backdrop: { backgroundColor: "rgba(17,18,22,.28)", zIndex: 4000 },
  header: { display: "flex", alignItems: "flex-start", gap: "10px", padding: "16px 18px 12px", flexShrink: 0 },
  heading: { flex: 1, minWidth: 0 },
  title: { display: "block", margin: 0, color: "#161616", fontFamily: "inherit", fontSize: "14px", fontWeight: 800, lineHeight: "21px", letterSpacing: "-.01em", ":focus": { outlineStyle: "none" } },
  subtitle: { margin: "3px 0 0", fontSize: "11px", color: "#74747d", overflowWrap: "anywhere" },
  close: { width: "32px", minWidth: "32px", height: "32px", padding: 0, borderRadius: "8px", color: "#55585f", flexShrink: 0 },
  closeIcon: { width: "12px", height: "12px", fontSize: "12px" },
  body: {
    display: "flex", flexDirection: "column", gap: "12px",
    flex: 1, minHeight: 0, minWidth: 0, padding: "4px 18px 16px",
    margin: 0, fontFamily: "inherit", fontSize: "inherit", lineHeight: "inherit", color: "inherit",
    overflowY: "auto", overflowX: "hidden", scrollbarWidth: "none",
    "::-webkit-scrollbar": { display: "none" },
    ":focus-visible": { outline: "2px solid #d7192f", outlineOffset: "-2px" },
  },
  footer: {
    display: "flex", alignItems: "center", flexWrap: "wrap", gap: "8px",
    padding: "12px 18px", flexShrink: 0, borderTop: "1px solid #eff0f3", backgroundColor: "#fcfcfd",
  },
});

export default function ModalFrame({
  open, title, subtitle, width = 560, contentKey, children, footer, onClose,
}: ModalFrameProps): React.ReactElement {
  const styles = useStyles();
  const id = useId();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const restoreFrame = useRef<number | null>(null);
  // 비동기 조회 뒤 열리는 모달도 호출 버튼으로 키보드 포커스를 돌려준다.
  useLayoutEffect(() => {
    if (restoreFrame.current !== null) cancelAnimationFrame(restoreFrame.current);
    if (!open) return;
    const active = document.activeElement;
    if (active instanceof HTMLElement && !active.closest("[data-modal-frame]")) returnFocus.current = active;
    return () => {
      restoreFrame.current = requestAnimationFrame(() => {
        if (returnFocus.current?.isConnected && !document.querySelector("[data-modal-frame]")) {
          returnFocus.current.focus({ preventScroll: true });
        }
      });
    };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      if (bodyRef.current) bodyRef.current.scrollTop = 0;
      titleRef.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [open, contentKey]);

  return (
    <Dialog open={open} modalType="modal" onOpenChange={(_, data) => { if (!data.open) onClose(); }}>
      <DialogSurface
        className={styles.surface} style={{ width }}
        backdrop={{ className: styles.backdrop }}
        aria-labelledby={id + "-title"} aria-describedby={subtitle ? id + "-description" : undefined}
        data-modal-frame={open ? "" : undefined}
        onKeyDownCapture={(event) => {
          if (event.key !== "Escape") return;
          event.preventDefault();
          event.stopPropagation();
          onClose();
        }}
      >
        <header className={styles.header}>
          <div className={styles.heading}>
            <DialogTitle ref={titleRef} id={id + "-title"} tabIndex={-1} className={styles.title}>{title}</DialogTitle>
            {subtitle && <p className={styles.subtitle} id={id + "-description"}>{subtitle}</p>}
          </div>
          <Button type="button" appearance="subtle" className={styles.close} icon={{ children: <Dismiss12Regular />, className: styles.closeIcon }} aria-label="모달 닫기" onClick={onClose} />
        </header>
        <DialogContent ref={bodyRef} className={styles.body} tabIndex={0} role="region" aria-label={title + " 내용"} data-modal-body>{children}</DialogContent>
        <footer className={styles.footer}>{footer}</footer>
      </DialogSurface>
    </Dialog>
  );
}
