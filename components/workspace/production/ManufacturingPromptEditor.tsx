"use client";
import { useLayoutEffect, useRef, useState } from "react";
import { ArrowUp20Regular } from "@fluentui/react-icons";
import { DadamButton } from "@/components/ui/DadamControls";
import { ManufacturingPromptSchema } from "@/lib/workspace/production/schemas";
import type { ManufacturingPrompt } from "@/types/workspace-production";
import type { DocumentEditorState } from "./SlideContentEditor";

interface ManufacturingPromptEditorProps {
  value: ManufacturingPrompt; readOnly: boolean; busy: boolean; error: string | null; resetKey: number;
  onChange(value: ManufacturingPrompt): void; onSave(): void;
  onEditorStateChange(state: DocumentEditorState): void;
}
export default function ManufacturingPromptEditor({ value, readOnly, busy, error, resetKey, onChange, onSave, onEditorStateChange }: ManufacturingPromptEditorProps) {
  const root = useRef<HTMLDivElement>(null), dirty = useRef(false), composing = useRef(false), applied = useRef(-1);
  const [validation, setValidation] = useState<{ resetKey: number; message: string | null }>({ resetKey, message: null });
  const [isComposing, setComposing] = useState(false);
  const localError = validation.resetKey === resetKey ? validation.message : null;
  const blocked = readOnly || busy;
  useLayoutEffect(() => {
    const node = root.current;
    if (!node || composing.current || (dirty.current && applied.current === resetKey)) return;
    const p = node.ownerDocument.createElement("p"), ul = node.ownerDocument.createElement("ul");
    p.dataset.intro = "true"; p.textContent = value.intro;
    value.bullets.forEach(text => { const li = node.ownerDocument.createElement("li"); li.textContent = text; ul.append(li); });
    node.replaceChildren(p, ul); applied.current = resetKey; dirty.current = false;
  }, [value, resetKey]);
  const publish = () => {
    const node = root.current; if (!node) return;
    // Enter가 만든 추가 문단도 저장한다. 태그나 HTML 자체는 저장하지 않는다.
    const intro = Array.from(node.childNodes).filter(el => el.nodeType !== 1 || !["UL", "OL"].includes((el as Element).tagName)).map(el => el.textContent ?? "").join("\n");
    const bullets = Array.from(node.querySelectorAll("li")).map(el => el.textContent ?? "").filter(text => text.trim());
    const prompt = { intro: node.children.length ? intro : node.textContent ?? "", bullets };
    const valid = ManufacturingPromptSchema.safeParse(prompt);
    const message = valid.success ? null : "본문은 10,000자, 목록은 12개 이내로 입력해 주세요.";
    dirty.current = true; setValidation({ resetKey, message });
    onEditorStateChange({ dirty: true, composing: false, error: message });
    if (valid.success) onChange(valid.data);
  };
  return <section aria-label="슬라이드 내용 편집" data-comment-control className="tw:relative tw:mt-2.5 tw:min-w-0 tw:rounded-[14px] tw:border tw:border-(--kpc-line) tw:bg-white tw:shadow-sm">
    <div ref={root} contentEditable={!blocked} suppressContentEditableWarning role="textbox" aria-label="이 슬라이드에 들어갈 내용" aria-multiline="true" aria-readonly={blocked} tabIndex={blocked ? -1 : 0} spellCheck={false}
      className="tw:min-h-12 tw:max-h-[180px] tw:overflow-y-auto tw:overscroll-contain tw:py-3 tw:pr-[52px] tw:pl-4 tw:text-[13px] tw:leading-[1.7] tw:whitespace-pre-wrap tw:break-words tw:outline-none tw:[&_p]:m-0 tw:[&_ul]:my-0.5 tw:[&_ul]:list-disc tw:[&_ul]:pl-[18px] tw:[&_li]:m-0"
      onBeforeInput={event => { if (blocked) event.preventDefault(); }}
      onCompositionStart={() => { composing.current = true; setComposing(true); dirty.current = true; onEditorStateChange({ dirty: true, composing: true, error: localError }); }}
      onCompositionEnd={() => { composing.current = false; setComposing(false); publish(); }}
      onInput={() => { if (!blocked && !composing.current) publish(); }}
      onKeyDown={event => { if (event.nativeEvent.isComposing || composing.current || !((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s")) event.stopPropagation(); }}
      onPaste={event => {
        event.preventDefault(); event.stopPropagation();
        if (blocked || composing.current || !root.current) return;
        const selected = root.current.ownerDocument.getSelection();
        if (!selected?.rangeCount) return;
        const range = selected.getRangeAt(0);
        if (!root.current.contains(range.startContainer) || !root.current.contains(range.endContainer)) return;
        range.deleteContents();
        const text = root.current.ownerDocument.createTextNode(event.clipboardData.getData("text/plain").replace(/\r\n?/g, "\n"));
        range.insertNode(text); range.setStartAfter(text); range.collapse(true); selected.removeAllRanges(); selected.addRange(range); publish();
      }} />
    <DadamButton className="tw:absolute tw:right-2.5 tw:bottom-2.5 tw:!h-[30px] tw:!min-h-[30px] tw:!w-[30px] tw:!min-w-[30px] tw:!rounded-full tw:!p-0" appearance="primary" icon={<ArrowUp20Regular />} title="슬라이드에 반영" aria-label="슬라이드에 반영" disabled={blocked || isComposing || !!localError || !!error} onClick={onSave} />
    {(localError || error) && <p role="alert" className="tw:mx-3 tw:text-xs tw:text-red-700">{localError ?? error}</p>}
  </section>;
}
