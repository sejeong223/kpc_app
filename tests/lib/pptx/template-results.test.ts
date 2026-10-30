import { expect,it } from "vitest";
import { applyTemplate } from "@/lib/pptx/template-apply";
import { resultRows,countResults,filterResults } from "@/lib/pptx/template-results";
import { setupXmlDom } from "./fixture";
import { transformFixture } from "./transform-fixture";
setupXmlDom();
it("0 기반 슬라이드 선택과 1 기반 결과를 연결하고 사유를 검색한다",async()=>{
  const {doc,lib,options,skill}=await transformFixture();const result=await applyTemplate(doc,skill,{...options,selectedSlides:[0]},lib);
  const rows=resultRows(doc,result);expect(Object.values(countResults(rows)).reduce((a,b)=>a+b,0)).toBe(rows.length);
  const first=filterResults(rows,{scope:"slide",slideIndex:0,filter:"all",query:""});expect(first.every(r=>r.change?.slide===1)).toBe(true);
  expect(filterResults(rows,{scope:"document",slideIndex:0,filter:"kept",query:"선택"}).length).toBeGreaterThan(0);
  expect(resultRows(null,null)).toEqual([]);expect(rows.every(r=>r.change?.details.length)).toBe(true);
});
