// @vitest-environment jsdom
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect,it,vi } from "vitest";
import { DEFAULT_SKILL_RULES,OPT,PAGE_LABEL,PAGE_TYPES,RULES } from "@/config/skill-options";
import SkillRuleFields from "@/components/admin/skills/SkillRuleFields";
import reference from "../../fixtures/skills/reference-ui.json";

// 첨부 HTML의 리터럴만 추출한 계약으로 입력 누락·선택값 변경을 확인한다.
function renderRules(disabled=false){
  const root=document.createElement("div");
  root.innerHTML=renderToStaticMarkup(createElement(SkillRuleFields,{value:DEFAULT_SKILL_RULES,disabled,fieldErrors:{},onChange:vi.fn()}));
  return root;
}
it("첨부 기획의 21개 선택값 묶음과 6개 페이지 유형·규칙을 보존한다",()=>{
  expect(OPT).toEqual(reference.SK_OPT);
  expect(RULES).toEqual(reference.SK_PT_RULES);
  expect(PAGE_TYPES.map(type=>[type,PAGE_LABEL[type]])).toEqual(reference.PAGE_TYPES);
});
it("기획의 서식 필드 63개를 모두 노출하고 공통 상속 선택값을 제공한다",()=>{
  const root=renderRules(),options=reference.SK_OPT;
  const contract:Record<string,readonly (string|number|null)[]>={
    "font.family":options.family,"font.lh":options.lh,
    "font.title.0":options.title,"font.title.1":options.weight,"font.sub.0":options.sub,"font.sub.1":options.weight,"font.body.0":options.body,"font.body.1":options.weight,
    "gap.tb":options.gap,"gap.bt":options.gap,"gap.para":options.para,
    "table.padV":options.pad,"table.padH":options.pad,"table.rowH":options.rowH,"table.text":options.align,"table.num":options.align,"table.head":options.head,
    "shape.snap":options.snap,"shape.img":options.img,"shape.align":options.salign,"shape.min":options.min,
    "mg.0":options.mg,"mg.1":options.mg,"mg.2":options.mg,"mg.3":options.mg,cols:options.cols,rows:options.rows,grid:options.grid,"guard.tableRows":options.tableRows,
  };
  for(const type of PAGE_TYPES){
    contract[`pt.${type}.title`]=[null,...options.title,44,48];contract[`pt.${type}.body`]=[null,9,...options.body];contract[`pt.${type}.lh`]=[null,...options.lh];
    contract[`pt.${type}.align`]=options.align;contract[`pt.${type}.rule`]=reference.SK_PT_RULES[type];
  }
  for(const [name,allowed] of Object.entries(contract)){
    const select=root.querySelector<HTMLSelectElement>(`select[name="${name}"]`);
    expect(select,`누락된 입력: ${name}`).not.toBeNull();
    expect(Array.from(select!.options,option=>option.value),name).toEqual(allowed.map(value=>value===null?"":String(value)));
  }
  for(const key of ["shrink","split","overlap","inGuide"])expect(root.querySelector(`input[type="checkbox"][name="guard.${key}"]`)).not.toBeNull();
  expect(root.querySelectorAll("select[name],input[name]")).toHaveLength(63);
  expect(root.querySelectorAll("details")).toHaveLength(0);
  expect(root.textContent).toContain("최소 폭 (열)");expect(root.textContent).toContain("본문–표 (cm)");
  expect(root.querySelector('select[name="pt.body.title"] option')?.textContent).toBe("공통 28pt");
});
it("조회 전용 화면은 서식 입력 63개를 모두 비활성화한다",()=>{
  const controls=renderRules(true).querySelectorAll<HTMLInputElement|HTMLSelectElement>("select[name],input[name]");
  expect(controls).toHaveLength(63);for(const control of controls)expect(control.disabled,control.name).toBe(true);
});
