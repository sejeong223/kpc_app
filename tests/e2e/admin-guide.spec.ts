import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { test,expect } from "./admin-review.helpers";

test("디자인 컴포넌트 HTML의 목차·모바일 폭·스크립트",async({page})=>{
  const file=path.resolve(".memory/reports/2026-10-30-skill-template-design-components.html");
  await page.goto(pathToFileURL(file).href);await expect(page.getByRole("heading",{name:"재검증에서 보완한 컴포넌트 계약",exact:true})).toBeVisible();
  const links=await page.locator('a[href^="#"]').evaluateAll(nodes=>nodes.map(node=>node.getAttribute("href")!.slice(1)));
  for(const id of links)expect(await page.locator('[id]').evaluateAll((nodes,target)=>nodes.some(node=>node.id===target),id)).toBe(true);
  for(const width of [1440,390,320]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);}
  expect(await readFile(file,"utf8")).toContain("getWorkSnapshot");
  await page.setViewportSize({width:1440,height:900});await page.getByRole("heading",{name:"재검증에서 보완한 컴포넌트 계약",exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:"test-results/design-components.png"});
});
