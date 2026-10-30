import { expect } from "vitest";
import { DEFAULT_SKILL_RULES, PAGE_TYPES } from "@/config/skill-options";
import type { SkillEngineInput } from "@/lib/skills/schema";
import { loadZipLibrary } from "@/lib/pptx/zip";
import { readTemplate } from "@/lib/pptx/template-read";
import type { TemplateDocument, TemplateOptions, TemplateResult } from "@/types/pptx-template";
import { fixtureBytes } from "./fixture";

export function engineSkill(): SkillEngineInput {
  const skill: SkillEngineInput = { ...structuredClone(DEFAULT_SKILL_RULES), name: "검증", short: "검증", desc: "", vis: { all: false, items: [] } };
  skill.font.family = "맑은 고딕"; skill.font.title = [24,"Bold"]; skill.font.sub = [14,"Bold"]; skill.font.body = [11,"Regular"]; skill.font.lh = 1.2; skill.gap.para = 2;
  for (const type of PAGE_TYPES) Object.assign(skill.pt[type], { title:24,body:11,lh:1.2 });
  return skill;
}
export async function transformFixture(name = "native-template.pptx") {
  const lib = await loadZipLibrary();
  const doc = await readTemplate(await fixtureBytes(name), name, lib);
  const options: TemplateOptions = { layout:false, images:false, selectedSlides:doc.slides.map(s=>s.index), pageTypes:{},roles:{},excluded:[] };
  return { lib,doc,options,skill:engineSkill() };
}
export async function preservedParts(doc: TemplateDocument, result: TemplateResult) {
  for (const [path,entry] of Object.entries(doc.zip.files)) if (!entry.dir && !result.modifiedParts.includes(path)) expect(await result.after.zip.file(path)!.async("uint8array"), path).toEqual(await entry.async("uint8array"));
  expect(result.after.slides.map(s=>s.objects.map(o=>o.text))).toEqual(doc.slides.map(s=>s.objects.map(o=>o.text)));
  expect([result.after.width,result.after.height,result.after.slides.length]).toEqual([doc.width,doc.height,doc.slides.length]);
}
