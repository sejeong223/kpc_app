import type { PromptItem, PromptSource } from "@/types/admin-prompts";
export const PROMPT_SOURCE_LABELS: Record<PromptSource, string> = { proposal: "제안 관련 자료", related: "유관자료", web: "웹 검색" };
export const DEFAULT_PROMPT_SOURCES: readonly PromptSource[] = ["proposal", "related", "web"];
export function resolvePromptItem(items: readonly PromptItem[], index: number) {
  const item = items[index];
  const parent = item?.level === 2 ? items.slice(0, index).reverse().find(row => row.level === 1) : undefined;
  const prompt = item?.prompt.trim() || parent?.prompt.trim() || "";
  const sources = item?.sources?.length ? item.sources : parent?.sources?.length ? parent.sources : [];
  return { prompt, sources, promptInherited: Boolean(item?.level === 2 && !item.prompt.trim()), sourcesInherited: Boolean(item?.level === 2 && !item.sources?.length), parentTitle: parent?.title ?? "" };
}
export function outlineNumbers(items: readonly PromptItem[]): string[] {
  let major = 0, minor = 0;
  return items.map(item => { if (item.level === 1) { major++; minor = 0; return ["Ⅰ", "Ⅱ", "Ⅲ", "Ⅳ", "Ⅴ", "Ⅵ", "Ⅶ", "Ⅷ", "Ⅸ", "Ⅹ"][major - 1] ?? String(major); } minor++; return major + "." + minor; });
}
export function blockEnd(items: readonly PromptItem[], index: number): number {
  let end = index + 1;
  if (items[index]?.level === 1) while (end < items.length && items[end].level === 2) end++;
  return end;
}
export function movePromptBlock(items: readonly PromptItem[], fromId: string, targetId: string, after = false): PromptItem[] {
  const from = items.findIndex(item => item.id === fromId), target = items.findIndex(item => item.id === targetId);
  if (from < 0 || target < 0) return [...items];
  const end = blockEnd(items, from);
  if (target >= from && target < end) return [...items];
  let insertion = target + Number(after);
  if (items[from].level === 1) {
    let parent = target;
    while (parent > 0 && items[parent].level === 2) parent--;
    insertion = after ? blockEnd(items, parent) : parent;
  }
  const next = [...items], block = next.splice(from, end - from);
  if (insertion >= end) insertion -= end - from;
  if (items[from].level === 2 && insertion === 0) return [...items];
  next.splice(insertion, 0, ...block);
  return next;
}
export function movePromptStep(items: readonly PromptItem[], id: string, direction: -1 | 1): PromptItem[] {
  const index = items.findIndex(item => item.id === id);
  if (index < 0) return [...items];
  if (items[index].level === 1) {
    const majors = items.filter(item => item.level === 1), target = majors[majors.findIndex(item => item.id === id) + direction];
    return target ? movePromptBlock(items, id, target.id, direction === 1) : [...items];
  }
  const target = items[index + direction];
  return target ? movePromptBlock(items, id, target.id, direction === 1) : [...items];
}
export function removePromptItem(items: readonly PromptItem[], id: string): PromptItem[] {
  const index = items.findIndex(item => item.id === id);
  return index < 0 ? [...items] : items.filter((_, i) => i < index || i >= blockEnd(items, index));
}
