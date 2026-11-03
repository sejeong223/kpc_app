import type { PromptItem, PromptSource } from "@/types/admin-prompts";
import type {
  ProjectPromptOverride,
  Section,
} from "@/types/workspace-production";
export interface ProjectPromptResult {
  prompt: string;
  sources: PromptSource[];
  inherited: boolean;
  itemId: string | null;
  parentId: string | null;
}
export function resolveProjectPrompt(
  items: readonly PromptItem[],
  itemId: string | null,
  overrides: readonly ProjectPromptOverride[],
): ProjectPromptResult {
  const index = items.findIndex((item) => item.id === itemId),
    item = items[index];
  if (!item)
    return {
      prompt: "",
      sources: [],
      inherited: false,
      itemId: null,
      parentId: null,
    };
  const parent =
    item.level === 2
      ? items
          .slice(0, index)
          .reverse()
          .find((row) => row.level === 1)
      : undefined;
  const value = (row: PromptItem | undefined) => {
    const override = overrides.find((o) => o.itemId === row?.id);
    return {
      prompt: (override?.prompt ?? row?.prompt ?? "").trim(),
      sources: override?.sources ?? row?.sources ?? [],
    };
  };
  const own = value(item),
    inherited = value(parent);
  return {
    prompt: own.prompt || inherited.prompt,
    sources: [...(own.sources.length ? own.sources : inherited.sources)],
    inherited: !!parent && (!own.prompt || !own.sources.length),
    itemId: item.id,
    parentId: parent?.id ?? null,
  };
}
export function suggestPromptBindings(
  sections: readonly Section[],
  items: readonly PromptItem[],
): Array<{
  sectionId: string;
  itemId: string | null;
  reason: "exact" | "suggested" | "unmatched";
}> {
  return sections.map((section) => {
    const matches = items.filter(
      (item) => item.title.trim() === section.title.trim(),
    );
    return {
      sectionId: section.id,
      itemId: matches.length === 1 ? matches[0].id : null,
      reason: matches.length === 1 ? "exact" : "unmatched",
    };
  });
}
