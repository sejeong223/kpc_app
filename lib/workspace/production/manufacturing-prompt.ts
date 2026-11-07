import { MFG_DEMO_PROJECT_ID, manufacturingSlideSeed, type ManufacturingLayout } from "@/config/production-mfg-demo";
import type { ProposalSlide } from "@/types/workspace-production";

export function manufacturingLayout(projectId: string, slide: ProposalSlide): ManufacturingLayout | null {
  if (projectId !== MFG_DEMO_PROJECT_ID || slide.template || !slide.demoSourceKey) return null;
  const seed = manufacturingSlideSeed(slide.demoSourceKey);
  if (!seed) return null;
  const blocks = slide.content.blocks;
  if (seed.layout === "table") return blocks.length === 1 && blocks[0]?.kind === "table" && blocks[0].columns.length === 2 ? "table" : null;
  return blocks.length === 3 && blocks.every(block => block.kind === "text") ? seed.layout : null;
}
