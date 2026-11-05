import type { ContentBlock, SlideContent } from "@/types/workspace-production";
import { SlideContentSchema } from "./schemas";

export type DocumentReadResult = { ok: true; content: SlideContent } | { ok: false; message: string };
export type SlidePasteResult = { ok: true; blocks: ContentBlock[]; notices: string[] } | { ok: false; message: string };
export type DocumentCommand =
  | { type: "insert-block"; kind: "text" | "list" | "table"; afterId: string | null }
  | { type: "remove-block"; blockId: string }
  | { type: "move-block"; blockId: string; delta: -1 | 1 }
  | { type: "insert-list-item"; blockId: string; afterIndex: number }
  | { type: "remove-list-item"; blockId: string; index: number }
  | { type: "insert-table-row"; blockId: string; afterIndex: number }
  | { type: "remove-table-row"; blockId: string; index: number }
  | { type: "insert-table-column"; blockId: string; afterIndex: number }
  | { type: "remove-table-column"; blockId: string; index: number };

const failure = (message: string): { ok: false; message: string } => ({ ok: false, message });
function validate(content: SlideContent): DocumentReadResult {
  const result = SlideContentSchema.safeParse(content);
  return result.success ? { ok: true, content: result.data } : failure(result.error.issues[0]?.message ?? "입력 범위를 확인해 주세요.");
}
function textOf(node: Node): string {
  if (node.nodeType === 3) return node.textContent ?? "";
  if (node.nodeName === "BR") return "\n";
  const children = Array.from(node.childNodes);
  if (children.length === 1 && children[0].nodeName === "BR") return "";
  return children.reduce((text, child, index) => {
    const block = /^(DIV|P)$/.test(child.nodeName);
    const priorBlock = index > 0 && /^(DIV|P)$/.test(children[index - 1].nodeName);
    const emptyLine = priorBlock && textOf(children[index - 1]) === "";
    return text + (index > 0 && (block || priorBlock) && (!text.endsWith("\n") || emptyLine) ? "\n" : "") + textOf(child);
  }, "");
}
export function createSlideDocument(content: SlideContent, document: Document): DocumentFragment {
  const fragment = document.createDocumentFragment();
  const editable = (tag: string, text: string, label: string) => {
    const element = document.createElement(tag);
    element.textContent = text;
    element.setAttribute("data-document-editable", "");
    element.setAttribute("contenteditable", "true");
    element.setAttribute("role", "textbox");
    element.setAttribute("aria-label", label);
    element.setAttribute("aria-multiline", "true");
    element.setAttribute("data-placeholder", label);
    return element;
  };
  const title = editable("h2", content.title, "슬라이드 제목"), lead = editable("p", content.lead, "리딩 메시지");
  title.dataset.documentField = "title"; lead.dataset.documentField = "lead";
  const body = document.createElement("div"); body.setAttribute("data-document-body", "");
  content.blocks.forEach((block, index) => {
    let element: HTMLElement;
    if (block.kind === "text") element = editable("div", block.text, `본문 ${index + 1}`);
    else if (block.kind === "list") {
      element = document.createElement("ul");
      if (!block.items.length) { element.tabIndex = 0; element.setAttribute("aria-label", "빈 목록 · 항목 추가 가능"); }
      block.items.forEach((text, i) => element.append(editable("li", text, `목록 ${index + 1} 항목 ${i + 1}`)));
    } else if (block.kind === "table") {
      element = document.createElement("table");
      const head = document.createElement("thead"), row = document.createElement("tr"), rows = document.createElement("tbody");
      block.columns.forEach((text, i) => row.append(editable("th", text, `표 ${index + 1} 열 ${i + 1} 제목`)));
      head.append(row);
      block.rows.forEach((cells, r) => {
        const tr = document.createElement("tr");
        cells.forEach((text, c) => tr.append(editable("td", text, `표 ${index + 1} ${r + 1}행 ${c + 1}열`)));
        rows.append(tr);
      });
      element.append(head, rows);
    } else {
      element = document.createElement("figure"); element.tabIndex = 0;
      element.textContent = `이미지 · ${block.alt || "설명 없음"} (${block.width} × ${block.height})`;
      element.setAttribute("aria-label", `이미지 ${index + 1} · 원본 보존`);
    }
    element.dataset.blockId = block.id; element.dataset.blockKind = block.kind; body.append(element);
  });
  fragment.append(title, lead, body); return fragment;
}
export function readSlideDocument(root: HTMLElement, previous: SlideContent): DocumentReadResult {
  const titles = root.querySelectorAll('[data-document-field="title"]'), leads = root.querySelectorAll('[data-document-field="lead"]'), bodies = root.querySelectorAll("[data-document-body]");
  if (titles.length !== 1 || leads.length !== 1 || bodies.length !== 1 || root.querySelector("script,style,iframe,object,embed,svg,img,form")) return failure("문서 구조가 변경되었습니다. 입력을 복사한 뒤 변경을 취소해 주세요.");
  const blocks: ContentBlock[] = [];
  for (const element of Array.from(bodies[0].children)) {
    const id = element.getAttribute("data-block-id"), kind = element.getAttribute("data-block-kind"), old = previous.blocks.find(b => b.id === id);
    if (!id || !old || old.kind !== kind) return failure("본문 식별 정보를 확인해 주세요.");
    if (old.kind === "text") blocks.push({ ...old, text: textOf(element) });
    else if (old.kind === "list") {
      if (Array.from(element.children).some(child => child.tagName !== "LI") || element.querySelector("li ul,li ol,table")) return failure("중첩 목록은 지원하지 않습니다.");
      blocks.push({ ...old, items: Array.from(element.children).map(textOf) });
    } else if (old.kind === "table") {
      if (element.querySelector('[rowspan]:not([rowspan="1"]),[colspan]:not([colspan="1"]),td table,th table')) return failure("병합·중첩 표는 지원하지 않습니다.");
      const headers = element.querySelectorAll(":scope > thead > tr"), rows = element.querySelectorAll(":scope > tbody > tr");
      if (headers.length !== 1 || !rows.length) return failure("표의 머리글과 행을 확인해 주세요.");
      blocks.push({ ...old, columns: Array.from(headers[0].children).map(textOf), rows: Array.from(rows).map(row => Array.from(row.children).map(textOf)) });
    } else blocks.push(structuredClone(old));
  }
  return validate({ title: textOf(titles[0]), lead: textOf(leads[0]), blocks });
}
export function applyDocumentCommand(content: SlideContent, command: DocumentCommand, newId: () => string): DocumentReadResult {
  const next = structuredClone(content);
  if (command.type === "insert-block") {
    const index = command.afterId === null ? next.blocks.length - 1 : next.blocks.findIndex(b => b.id === command.afterId);
    if (command.afterId !== null && index < 0) return failure("추가 위치를 찾을 수 없습니다.");
    const id = newId();
    next.blocks.splice(index + 1, 0, command.kind === "text" ? { id, kind: "text", text: "" } : command.kind === "list" ? { id, kind: "list", items: [""] } : { id, kind: "table", columns: ["항목", "내용"], rows: [["", ""]] });
    return validate(next);
  }
  const index = next.blocks.findIndex(b => b.id === command.blockId), block = next.blocks[index];
  if (!block) return failure("선택한 본문이 없습니다.");
  if (command.type === "remove-block") next.blocks.splice(index, 1);
  else if (command.type === "move-block") {
    const to = index + command.delta;
    if (to < 0 || to >= next.blocks.length) return failure("더 이동할 수 없습니다.");
    [next.blocks[index], next.blocks[to]] = [next.blocks[to], next.blocks[index]];
  } else if (command.type === "insert-list-item" || command.type === "remove-list-item") {
    if (block.kind !== "list") return failure("목록을 선택해 주세요.");
    const i = command.type === "insert-list-item" ? command.afterIndex : command.index;
    if (!Number.isInteger(i) || i < 0 || (i >= block.items.length && !(command.type === "insert-list-item" && i === 0 && !block.items.length))) return failure("목록 위치가 올바르지 않습니다.");
    if (command.type === "insert-list-item") block.items.splice(i + 1, 0, "");
    else { block.items.splice(i, 1); if (!block.items.length) block.items.push(""); }
  } else {
    if (block.kind !== "table") return failure("표를 선택해 주세요.");
    const insert = "afterIndex" in command, i = insert ? command.afterIndex : command.index;
    const row = command.type.endsWith("row"), length = row ? block.rows.length : block.columns.length;
    if (!Number.isInteger(i) || i < 0 || i >= length) return failure("표 위치가 올바르지 않습니다.");
    if (!insert && length === 1) return failure("표에는 최소 한 행과 한 열이 필요합니다. 전체 삭제는 본문 삭제를 이용해 주세요.");
    if (row) { if (insert) block.rows.splice(i + 1, 0, block.columns.map(() => "")); else block.rows.splice(i, 1); }
    else if (insert) { block.columns.splice(i + 1, 0, ""); block.rows.forEach(r => r.splice(i + 1, 0, "")); }
    else { block.columns.splice(i, 1); block.rows.forEach(r => r.splice(i, 1)); }
  }
  return validate(next);
}
export function parseSlidePaste(html: string, text: string, document: Document, newId: () => string): SlidePasteResult {
  const blocks: ContentBlock[] = [], notices: string[] = [];
  if (!html) {
    if (!text) return failure("붙여넣을 텍스트가 없습니다.");
    blocks.push({ id: newId(), kind: "text", text: text.replace(/\r\n?/g, "\n") });
  } else {
    const template = document.createElement("template"); template.innerHTML = html;
    const fragment = template.content;
    if (fragment.querySelector('script,style,iframe,object,embed,svg,form,img,video,audio,canvas,[rowspan]:not([rowspan="1"]),[colspan]:not([colspan="1"]),li ul,li ol,td table,th table')) return failure("이 서식은 그대로 붙여넣을 수 없습니다. 일반 텍스트 붙여넣기를 선택해 주세요.");
    const allowed = new Set(["P", "DIV", "BR", "UL", "OL", "LI", "TABLE", "THEAD", "TBODY", "TFOOT", "TR", "TH", "TD", "B", "STRONG", "I", "EM", "SPAN", "A", "U"]);
    if (Array.from(fragment.querySelectorAll("*")).some(e => !allowed.has(e.tagName))) return failure("지원하지 않는 문서 구조입니다. 일반 텍스트로 붙여넣을 수 있습니다.");
    if (fragment.querySelector("b,strong,i,em,span,a,u,[style],[class],ol") || Array.from(fragment.querySelectorAll("*")).some(e => Array.from(e.attributes).some(a => /^on/i.test(a.name)))) notices.push("글자별 서식·링크는 텍스트로 반영했습니다.");
    const visit = (node: Node): void => {
      if (node.nodeType === 3) { if (node.textContent?.trim()) blocks.push({ id: newId(), kind: "text", text: node.textContent }); return; }
      if (node.nodeType !== 1) return;
      const element = node as Element;
      if (element.tagName === "UL" || element.tagName === "OL") blocks.push({ id: newId(), kind: "list", items: Array.from(element.children).map(textOf) });
      else if (element.tagName === "TABLE") {
        const rows = Array.from(element.querySelectorAll("tr")).map(row => Array.from(row.children).map(textOf));
        blocks.push({ id: newId(), kind: "table", columns: rows[0] ?? [], rows: rows.length > 1 ? rows.slice(1) : [] });
      } else if (element.querySelector("ul,ol,table,p,div")) Array.from(element.childNodes).forEach(visit);
      else blocks.push({ id: newId(), kind: "text", text: textOf(element) });
    };
    Array.from(fragment.childNodes).forEach(visit);
  }
  if (!blocks.length) return failure("붙여넣을 본문이 없습니다.");
  const result = validate({ title: "", lead: "", blocks });
  return result.ok ? { ok: true, blocks: result.content.blocks, notices } : result;
}
