import { z } from "zod";
import { OPT, PAGE_TYPES, RULES } from "@/config/skill-options";
const choice = (values: readonly number[]) => z.number().finite().refine(v => values.includes(v), '기획에 있는 선택값을 사용하세요.');
const pageSchema = z.strictObject({ title: choice([...OPT.title,44,48]).nullable(), body: choice([...OPT.body,9]).nullable(), lh: choice(OPT.lh).nullable(), align: z.enum(OPT.align), rule: z.string() });
const EngineBase = z.strictObject({
  name: z.string().trim().min(1,'Skill 이름을 입력하세요.').max(80), short: z.string().trim().min(1,'약칭을 입력하세요.').max(20), desc: z.string().max(1000),
  font: z.strictObject({ family: z.enum(OPT.family), title: z.tuple([choice(OPT.title),z.enum(OPT.weight)]), sub: z.tuple([choice(OPT.sub),z.enum(OPT.weight)]), body: z.tuple([choice(OPT.body),z.enum(OPT.weight)]), lh: choice(OPT.lh) }),
  gap: z.strictObject({ tb: choice(OPT.gap), bt: choice(OPT.gap), para: choice(OPT.para) }),
  table: z.strictObject({ padV: choice(OPT.pad), padH: choice(OPT.pad), rowH: choice(OPT.rowH), text: z.enum(OPT.align), num: z.enum(OPT.align), head: z.enum(OPT.head) }),
  shape: z.strictObject({ snap: z.enum(OPT.snap), img: z.enum(OPT.img), align: z.enum(OPT.salign), min: choice(OPT.min) }),
  mg: z.tuple([choice(OPT.mg),choice(OPT.mg),choice(OPT.mg),choice(OPT.mg)]), cols: choice(OPT.cols), rows: choice(OPT.rows), grid: choice(OPT.grid),
  guard: z.strictObject({ shrink: z.boolean(), split: z.boolean(), overlap: z.boolean(), inGuide: z.boolean(), tableRows: choice(OPT.tableRows) }),
  pt: z.strictObject({ cover:pageSchema, toc:pageSchema, div:pageSchema, body:pageSchema, table:pageSchema, appx:pageSchema }),
  vis: z.strictObject({ all: z.boolean(), items: z.array(z.strictObject({ t:z.enum(['team','user','group']), v:z.string().trim().min(1).max(160) })).max(100) }),
});
export const SkillEngineInputSchema = EngineBase.superRefine((s,ctx) => { for (const type of PAGE_TYPES) if (!(RULES[type] as readonly string[]).includes(s.pt[type].rule)) ctx.addIssue({code:'custom',path:['pt',type,'rule'],message:'페이지 규칙을 확인하세요.'}); });
export const SkillRulesSchema = EngineBase.omit({ name:true,short:true,desc:true,vis:true }).superRefine((s,ctx) => { for (const type of PAGE_TYPES) if (!(RULES[type] as readonly string[]).includes(s.pt[type].rule)) ctx.addIssue({code:'custom',path:['pt',type,'rule'],message:'페이지 규칙을 확인하세요.'}); });
export const PageTypeSchema = z.enum(PAGE_TYPES);
export const ObjectRoleSchema = z.enum(["title","sub","body","table","image","shape","keep"]);
export type SkillEngineInput = z.infer<typeof SkillEngineInputSchema>;
export type SkillRules = z.infer<typeof SkillRulesSchema>;
export type PageType = z.infer<typeof PageTypeSchema>;
export type ObjectRole = z.infer<typeof ObjectRoleSchema>;
export type PageRule = SkillRules["pt"][PageType];
export type Align = SkillRules["table"]["text"];
export type FontWeight = SkillRules["font"]["body"][1];
