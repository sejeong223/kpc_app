"use client";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { makeStyles, tokens } from "@fluentui/react-components";
import { DadamButton } from "@/components/ui/DadamControls";
import { ArrowUp20Regular } from "@fluentui/react-icons";
import { dadamUi } from "@/lib/ui/dadam-theme";
import { createSlideDocument, readSlideDocument, parseSlidePaste } from "@/lib/workspace/production/document-editor";
import type { SlideContent } from "@/types/workspace-production";

export interface DocumentEditorState { dirty: boolean; composing: boolean; error: string | null }
export interface SlideContentEditorProps {
  value: SlideContent; readOnly: boolean; error: string | null;
  onChange(value: SlideContent): void; onSave(): void;
  busy?: boolean;
  resetKey?: number; onEditorStateChange?(state: DocumentEditorState): void;
}
const clean: DocumentEditorState = { dirty: false, composing: false, error: null };
const useStyles = makeStyles({
  shell: { minWidth: 0, marginTop: "10px", border: `1px solid ${tokens.colorNeutralStroke2}`, borderRadius: "14px", backgroundColor: tokens.colorNeutralBackground1, boxShadow: tokens.shadow2 },
  inputFrame: { position: "relative" },
  paper: { boxSizing: "border-box", padding: "12px 52px 12px 16px", minHeight: "48px", maxHeight: "180px", overflowY: "auto", overscrollBehavior: "contain", fontFamily: tokens.fontFamilyBase, fontSize: "13px", lineHeight: "1.7",
    ":focus-within": { boxShadow: `inset 0 0 0 1px ${tokens.colorBrandStroke1}` },
    "& h2": { margin: "0 0 8px", fontSize: tokens.fontSizeBase500, fontWeight: 600 },
    "& [data-document-field='lead']": { margin: "0 0 16px", color: tokens.colorNeutralForeground2 },
    "& [data-block-id]": { marginTop: "12px", marginBottom: "12px" },
    "& [data-document-editable]": { minHeight: "24px", whiteSpace: "pre-wrap", overflowWrap: "anywhere", outline: "none", borderRadius: "3px" },
    "& [contenteditable='true']:focus": { boxShadow: `0 0 0 1px ${tokens.colorBrandStroke1}` },
    "& [data-document-editable]:empty::before": { content: "attr(data-placeholder)", color: tokens.colorNeutralForeground4, pointerEvents: "none" },
    "& table": { borderCollapse: "collapse", width: "100%", tableLayout: "fixed" },
    "& td, & th": { border: `1px solid ${tokens.colorNeutralStroke2}`, padding: "8px", verticalAlign: "top", textAlign: "left" },
    "& th": { backgroundColor: tokens.colorNeutralBackground2 },
    "& ul": { paddingLeft: "24px" },
    "& figure": { marginLeft: 0, marginRight: 0, padding: "12px", backgroundColor: tokens.colorNeutralBackground2, color: tokens.colorNeutralForeground2 },
  },
  save: { position: "absolute", right: "10px", bottom: "10px", width: "30px", height: "30px", minWidth: "30px", minHeight: "30px", padding: 0, borderRadius: "50%" },
  hint: { position: "absolute", width: "1px", height: "1px", padding: 0, margin: "-1px", overflow: "hidden", clipPath: "inset(50%)", whiteSpace: "nowrap", border: 0 },
  error: { color: tokens.colorStatusDangerForeground1, margin: "8px 12px", fontSize: dadamUi.metaSize },
  meta: { color: tokens.colorNeutralForeground3, margin: "8px 12px", fontSize: dadamUi.metaSize },
});
export default function SlideContentEditor({ value, readOnly, error, onChange, onSave, busy = false, resetKey = 0, onEditorStateChange }: SlideContentEditorProps): React.ReactElement {
  const styles = useStyles(), hintId = useId(), root = useRef<HTMLDivElement>(null), content = useRef(value), baseline = useRef(JSON.stringify(value));
  const initialized = useRef(false), appliedReset = useRef(resetKey), stateRef = useRef(clean);
  const [state, setState] = useState(clean);
  const [notice, setNotice] = useState<string | null>(null);
  const selection = useRef<Range | null>(null);
  const resetFrame = useRef(0);
  useEffect(() => () => cancelAnimationFrame(resetFrame.current), []);
  const locked = readOnly || busy, blocked = locked || state.composing;
  const updateState = (next: DocumentEditorState) => { stateRef.current = next; setState(next); onEditorStateChange?.(next); };
  useLayoutEffect(() => {
    const node = root.current; if (!node) return;
    if (!initialized.current || appliedReset.current !== resetKey || (!stateRef.current.dirty && !stateRef.current.composing && JSON.stringify(content.current) !== JSON.stringify(value))) {
      if (stateRef.current.composing) return;
      // 도구 버튼 없이도 새 빈 슬라이드의 본문을 바로 입력할 수 있게 한다.
      const documentValue: SlideContent = value.blocks.length ? value : { ...value, blocks: [{ id: crypto.randomUUID(), kind: "text", text: "" }] };
      node.replaceChildren(createSlideDocument(documentValue, node.ownerDocument));
      content.current = documentValue; baseline.current = JSON.stringify(documentValue); appliedReset.current = resetKey; initialized.current = true; stateRef.current = clean; selection.current = null;
      cancelAnimationFrame(resetFrame.current);
      resetFrame.current = requestAnimationFrame(() => { setState(clean); setNotice(null); onEditorStateChange?.(clean); });
    }
    node.querySelectorAll<HTMLElement>("[data-document-editable]").forEach(el => {
      el.setAttribute("contenteditable", String(!readOnly && !busy)); el.setAttribute("aria-readonly", String(readOnly || busy));
      if (el.dataset.blockKind === "text") el.dataset.placeholder = "이 슬라이드에 들어갈 내용을 입력하세요";
    });
  }, [value, resetKey, readOnly, busy, onEditorStateChange]);
  const publish = (): SlideContent | null => {
    if (!root.current) return null;
    const result = readSlideDocument(root.current, content.current);
    if (!result.ok) { updateState({ ...stateRef.current, dirty: true, error: result.message }); return null; }
    content.current = result.content;
    updateState({ dirty: JSON.stringify(result.content) !== baseline.current, composing: false, error: null });
    onChange(result.content); return result.content;
  };
  const remember = () => {
    const selected = root.current?.ownerDocument.getSelection();
    if (!selected?.rangeCount || !root.current?.contains(selected.anchorNode) || !root.current.contains(selected.focusNode)) return;
    selection.current = selected.getRangeAt(0).cloneRange();
  };
  const replace = (next: SlideContent) => {
    if (!root.current) return;
    content.current = next; root.current.replaceChildren(createSlideDocument(next, root.current.ownerDocument));
    selection.current = null; onChange(next); updateState({ dirty: JSON.stringify(next) !== baseline.current, composing: false, error: null });
  };
  const insertText = (text: string) => {
    const node = root.current, range = selection.current;
    if (!node || !range || !node.contains(range.startContainer) || !node.contains(range.endContainer)) { setNotice("붙여넣을 문서 위치를 다시 선택해 주세요."); return false; }
    const start = range.startContainer.nodeType === 1 ? range.startContainer as Element : range.startContainer.parentElement;
    const end = range.endContainer.nodeType === 1 ? range.endContainer as Element : range.endContainer.parentElement;
    const host = start?.closest("[data-document-editable]");
    if (!host || host !== end?.closest("[data-document-editable]")) { setNotice("한 문단이나 표 셀 안에 붙여넣어 주세요."); return false; }
    range.deleteContents(); const inserted = node.ownerDocument.createTextNode(text); range.insertNode(inserted); range.setStartAfter(inserted); range.collapse(true);
    const selected = node.ownerDocument.getSelection(); selected?.removeAllRanges(); selected?.addRange(range); return publish() !== null;
  };
  return <section className={styles.shell} aria-label="슬라이드 문서 편집" data-comment-control>
    <span id={hintId} className={styles.hint}>{readOnly ? "저장된 내용을 확인할 수 있습니다." : "제목·리딩 메시지·본문을 입력한 뒤 슬라이드에 반영하세요."}</span>
    <div className={styles.inputFrame}>
    <div ref={root} className={styles.paper} role="group" aria-label="슬라이드 내용 편집" aria-describedby={hintId} onFocusCapture={remember} onPointerUp={remember} onKeyUp={remember}
      onCompositionStart={() => updateState({ ...stateRef.current, dirty: true, composing: true })}
      onCompositionEnd={() => { if (!locked) publish(); else updateState({ ...stateRef.current, composing: false }); }}
      onInput={() => { if (locked) return; if (stateRef.current.composing) updateState({ ...stateRef.current, dirty: true }); else publish(); }}
      onBeforeInput={e => {
        if (locked) { e.preventDefault(); return; }
        const range = root.current?.ownerDocument.getSelection();
        const start = range?.anchorNode?.nodeType === 1 ? range.anchorNode as Element : range?.anchorNode?.parentElement;
        const end = range?.focusNode?.nodeType === 1 ? range.focusNode as Element : range?.focusNode?.parentElement;
        if (start?.closest("[data-document-editable]") !== end?.closest("[data-document-editable]")) e.preventDefault();
      }}
      onKeyDown={e => {
        if (e.nativeEvent.isComposing || stateRef.current.composing) { e.stopPropagation(); return; }
        const target = e.target as HTMLElement;
        if (e.key === "Enter" && target.dataset.documentField && !e.shiftKey) {
          e.preventDefault(); const hosts = Array.from(root.current?.querySelectorAll<HTMLElement>("[data-document-editable]") ?? []); hosts[hosts.indexOf(target) + 1]?.focus();
        }
        if (e.key === "Tab" && target.matches("td,th")) {
          const hosts = Array.from(root.current?.querySelectorAll<HTMLElement>("[data-document-editable]") ?? []), next = hosts[hosts.indexOf(target) + (e.shiftKey ? -1 : 1)];
          if (next) { e.preventDefault(); next.focus(); }
        }
        if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "s") e.stopPropagation();
      }}
      onPaste={e => {
        e.preventDefault(); e.stopPropagation(); if (blocked || !root.current) return; remember();
        const text = e.clipboardData.getData("text/plain"), html = e.clipboardData.getData("text/html");
        if (!html) { insertText(text); return; }
        const result = parseSlidePaste(html, text, root.current.ownerDocument, () => crypto.randomUUID());
        if (!result.ok) { if (text && insertText(text)) setNotice("서식을 제외하고 일반 텍스트로 붙여넣었습니다."); else if (!text) setNotice(result.message); return; }
        const target = (e.target as Element).closest<HTMLElement>("[data-block-id]");
        if (!target || (e.target as Element).closest("td,th")) { if (insertText(text || result.blocks.map(b => b.kind === "text" ? b.text : b.kind === "list" ? b.items.join("\n") : b.kind === "table" ? [b.columns, ...b.rows].map(r => r.join("\t")).join("\n") : b.alt).join("\n"))) setNotice("서식을 제외하고 일반 텍스트로 붙여넣었습니다."); return; }
        const current = publish(); if (!current) return;
        const index = current.blocks.findIndex(b => b.id === target.dataset.blockId), next = { ...current, blocks: [...current.blocks.slice(0, index + 1), ...result.blocks, ...current.blocks.slice(index + 1)] };
        const resultRoot = root.current.ownerDocument.createElement("div"); resultRoot.append(createSlideDocument(next, root.current.ownerDocument));
        const validated = readSlideDocument(resultRoot, next);
        if (!validated.ok) { setNotice(validated.message); return; }
        replace(validated.content); setNotice(result.notices.join(" ") || null);
      }} />
      {!readOnly && <DadamButton className={styles.save} appearance="primary" icon={<ArrowUp20Regular />} title="슬라이드에 반영" aria-label="슬라이드에 반영" disabled={blocked || !!state.error || !!error} onClick={onSave} />}
    </div>
    {(readOnly || state.dirty) && <p role="status" className={styles.meta}>{readOnly ? state.dirty ? "읽기 전용 · 미반영 변경 보관 중" : "읽기 전용" : "미반영 변경"}</p>}
    {(state.error || error) && <p role="alert" className={styles.error}>{state.error ?? error}</p>}
    {notice && <p role="status" className={styles.error}>{notice}</p>}
  </section>;
}
