import { WORKSPACE_LIMITS as L } from "@/config/workspace-production";
import { htmlDemoLayout } from "@/config/production-html-demo";
import type { ContentBlock, ProposalSlide, SlideContent } from "@/types/workspace-production";
import { workspaceAssert as check } from "./errors";
import { manufacturingLayout } from "./manufacturing-prompt";
import { ProposalSlideSchema, SlideContentSchema, SlidePromptTextSchema } from "./schemas";

export function readSlidePrompt(slide: ProposalSlide): string {
  if (slide.editorPrompt !== undefined) return slide.editorPrompt;
  return [slide.content.title, slide.content.lead, ...slide.content.blocks.map(block => {
    switch (block.kind) {
      case "text": return block.text;
      case "list": return block.items.join("\n");
      case "table": return [block.columns, ...block.rows].map(row => row.join("\t")).join("\n");
      case "image": return block.alt;
    }
  })].filter(value => value.length > 0).join("\n\n");
}

export interface ComposeSlidePromptInput {
  projectId: string;
  slide: ProposalSlide;
  prompt: string;
  newId(): string;
}

// Respect schema string limits without splitting a UTF-16 surrogate pair.
function prefix(value: string, limit: number): string {
  let end = Math.min(value.length, limit);
  if (end < value.length && /[\uD800-\uDBFF]/.test(value[end - 1] ?? "")) end--;
  return value.slice(0, end);
}

function promptUnits(value: string): string[] {
  return value.split(/\n+|(?<=[.!?。！？])\s+/u).filter(part => part.trim()).flatMap(part => {
    const result: string[] = [];
    let rest = part.trim();
    while (rest.length) {
      const unit = prefix(rest, 1000);
      result.push(unit);
      rest = rest.slice(unit.length);
    }
    return result;
  });
}

function groups(units: readonly string[], count: number): string[][] {
  let offset = 0;
  return Array.from({ length: count }, (_, index) => {
    const size = Math.ceil((units.length - offset) / (count - index));
    const group = units.slice(offset, offset + size);
    offset += size;
    return group;
  });
}

function headingAndBody(text: string): [string, string] {
  const heading = prefix(text, 40);
  return [heading, text.slice(heading.length)];
}

function fillBlock(block: ContentBlock, units: string[]): ContentBlock {
  switch (block.kind) {
    case "text": return { ...block, text: units.join("\n") };
    case "list": return { ...block, items: units };
    case "table": {
      const rows = Array.from({ length: Math.max(1, Math.ceil(units.length / block.columns.length)) }, (_, row) =>
        block.columns.map((_, column) => units[row * block.columns.length + column] ?? ""));
      return { ...block, rows };
    }
    case "image": return block;
  }
}

/** Deterministic local layout demonstration; does not call or simulate an AI service. */
export function composeSlidePrompt({ projectId, slide, prompt, newId }: ComposeSlidePromptInput): SlideContent {
  const parsed = SlidePromptTextSchema.safeParse(prompt);
  check(parsed.success, "VALIDATION", parsed.error?.issues[0]?.message ?? "작성 내용을 확인해 주세요.");
  const normalized = prompt.replace(/\r\n?/g, "\n").trim(), units = promptUnits(normalized);
  const content = structuredClone(slide.content);
  const bound = slide.template ? new Set(slide.template.bindings.map(binding => binding.key)) : null;
  if (!bound || bound.has("title")) content.title = prefix(units[0], 80);
  if (!bound || bound.has("lead")) content.lead = prefix(units.join(" "), 280);
  const layout = manufacturingLayout(projectId, slide) ?? htmlDemoLayout(projectId, slide);

  if (layout === "table") {
    const block = content.blocks[0];
    check(block.kind === "table", "LAYOUT", "슬라이드 표 구조를 확인해 주세요.");
    block.rows = groups(units, Math.min(units.length, L.rows)).map(group => headingAndBody(group.join("\n")));
  } else if (layout) {
    const parts = groups(units, 3);
    content.blocks = content.blocks.map((block, index) => ({
      ...block, kind: "text", text: parts[index].length ? headingAndBody(parts[index].join("\n")).join("\n") : "",
    }));
  } else {
    let targets = content.blocks.filter(block => block.kind !== "image" && (!bound || bound.has(block.id)));
    if (!targets.length && !bound) {
      check(content.blocks.length < L.blocks, "LIMIT", "슬라이드의 본문 블록 수가 한도를 넘습니다.");
      const block: ContentBlock = { id: newId(), kind: "text", text: "" };
      content.blocks.push(block);
      targets = [block];
    }
    if (targets.length) {
      const parts = groups(units, targets.length);
      const changed = new Map(targets.map((block, index) => [block.id, fillBlock(block, parts[index])]));
      content.blocks = content.blocks.map(block => changed.get(block.id) ?? block);
    } else {
      // A template may expose only its title/lead. Never invent a binding or discard overflow.
      const slots = (["title", "lead"] as const).filter(key => bound?.has(key));
      check(slots.length > 0, "LAYOUT", "현재 레이아웃에 내용을 배치할 텍스트 영역이 없습니다.");
      let rest = normalized;
      for (const key of slots) {
        content[key] = prefix(rest, L[key]);
        rest = rest.slice(content[key].length);
      }
      check(!rest.length, "LIMIT", "현재 레이아웃의 텍스트 영역에 담기에는 내용이 깁니다. 내용을 줄여 주세요.");
    }
  }
  const result = SlideContentSchema.safeParse(content);
  check(result.success, "LIMIT", "현재 레이아웃의 글자·목록·표 한도를 넘었습니다. 내용을 줄여 주세요.");
  check(ProposalSlideSchema.safeParse({ ...slide, content: result.data }).success, "LAYOUT", "슬라이드의 내용과 요소 연결을 확인해 주세요.");
  return result.data;
}
