import { SkillEngineInputSchema, type SkillEngineInput } from "@/lib/skills/schema";
import type { SkillAssetRevision } from "@/types/admin-assets";

export function toEngineSkill(revision: SkillAssetRevision): SkillEngineInput {
  return SkillEngineInputSchema.parse({ ...revision.rules, name: revision.name, short: revision.short, desc: revision.description, vis: { all: false, items: [] } });
}
