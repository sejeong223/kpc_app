"use client";

import { Button, makeStyles, mergeClasses, tokens } from "@fluentui/react-components";
import { dadamUi } from "@/lib/ui/dadam-theme";
import { MoreHorizontal20Regular } from "@fluentui/react-icons";
import { useEffect, useId, useRef, useState } from "react";

const useStyles = makeStyles({
  root: { position: "relative", display: "inline-flex", flexShrink: 0 },
  trigger: { minWidth: "30px", width: "30px", height: "30px", padding: 0 },
  menu: { position: "absolute", right: 0, top: "32px", zIndex: 3, minWidth: "144px", padding: "var(--layout-inline-gap)", backgroundColor: tokens.colorNeutralBackground1, border: `1px solid ${tokens.colorNeutralStroke2}`, borderRadius: dadamUi.cardRadius, boxShadow: dadamUi.popoverShadow, display: "flex", flexDirection: "column" },
  item: { justifyContent: "flex-start", minHeight: dadamUi.controlHeight, fontFamily: tokens.fontFamilyBase, color: tokens.colorNeutralForeground2, fontSize: dadamUi.bodySize, lineHeight: dadamUi.bodyLineHeight },
  danger: { color: tokens.colorStatusDangerForeground1, ":enabled:hover": { backgroundColor: tokens.colorStatusDangerBackground1, color: tokens.colorStatusDangerForeground1 } },
});
interface Props { label: string; disabled: boolean; deleteLabel: string; onEdit(): void; onDelete(): void }
export default function CommentActionsMenu({ label, disabled, deleteLabel, onEdit, onDelete }: Props): React.ReactElement {
  const styles = useStyles(), id = useId();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    root.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    const outside = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  return <div ref={root} className={styles.root} data-comment-control>
    <Button ref={trigger} className={styles.trigger} appearance="subtle" icon={<MoreHorizontal20Regular />} aria-label={label} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? id : undefined} disabled={disabled} onClick={() => setOpen(!open)} />
    {open && <div id={id} className={styles.menu} role="menu" aria-label={label} onKeyDown={e => {
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); setOpen(false); trigger.current?.focus(); return; }
      const items = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'));
      const index = items.indexOf(document.activeElement as HTMLButtonElement);
      const next = e.key === "Home" ? 0 : e.key === "End" ? items.length - 1 : e.key === "ArrowDown" ? (index + 1) % items.length : e.key === "ArrowUp" ? (index + items.length - 1) % items.length : -1;
      if (next >= 0) { e.preventDefault(); e.stopPropagation(); items[next]?.focus(); }
    }}>
      <Button className={styles.item} appearance="subtle" role="menuitem" disabled={disabled} onClick={() => { setOpen(false); onEdit(); }}>수정</Button>
      <Button className={mergeClasses(styles.item, styles.danger)} appearance="subtle" role="menuitem" disabled={disabled} onClick={() => { setOpen(false); onDelete(); }}>{deleteLabel}</Button>
    </div>}
  </div>;
}
