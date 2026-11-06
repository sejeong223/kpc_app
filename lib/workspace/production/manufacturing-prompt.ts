import { MFG_DEMO_PROJECT_ID, manufacturingSlideSeed, type ManufacturingLayout } from "@/config/production-mfg-demo";
import type { ManufacturingPrompt, ProposalSlide, SlideContent } from "@/types/workspace-production";

export function manufacturingLayout(projectId: string, slide: ProposalSlide): ManufacturingLayout | null {
  if (projectId !== MFG_DEMO_PROJECT_ID || slide.template || !slide.demoSourceKey) return null;
  const seed = manufacturingSlideSeed(slide.demoSourceKey);
  if (!seed) return null;
  const blocks = slide.content.blocks;
  if (seed.layout === "table") return blocks.length === 1 && blocks[0]?.kind === "table" && blocks[0].columns.length === 2 ? "table" : null;
  return blocks.length === 3 && blocks.every(block => block.kind === "text") ? seed.layout : null;
}

export function applyManufacturingPromptContent(content: SlideContent, prompt: ManufacturingPrompt, layout: ManufacturingLayout | null, newId: () => string): SlideContent {
  const items = prompt.bullets.map((bullet, i) => {
    const colon = bullet.indexOf(":");
    return colon < 0 ? [`핵심 내용 ${i + 1}`, bullet.trim()] : [bullet.slice(0, colon).trim(), bullet.slice(colon + 1).trim()];
  });
  return { title: content.title, lead: prompt.intro, blocks: layout === "table" && items.length
    ? [{ id: content.blocks[0]?.kind === "table" ? content.blocks[0].id : newId(), kind: "table", columns: ["구분", "내용"], rows: items }]
    : items.map((item, i) => ({ id: content.blocks[i]?.kind === "text" ? content.blocks[i].id : newId(), kind: "text", text: item.join("\n") })),
  };
}
