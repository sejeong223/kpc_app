import { test,expect } from "./admin-review.helpers";

const screens=[{width:1440,height:900},{width:1024,height:768},{width:768,height:1024},{width:390,height:844},{width:320,height:568},{width:1024,height:500}];
const routes=["skills","templates","users","policy?tab=tokens","dashboard","audit"];
for(const viewport of screens)for(const route of routes){
  test(`반응형 ${route} ${viewport.width}×${viewport.height}`,async({page},testInfo)=>{
    await page.setViewportSize(viewport);await page.goto("/workspace/"+route);
    await expect(page.getByRole("main").getByRole("heading",{level:1})).toBeVisible();
    await expect(page.getByText("불러오는 중입니다.",{exact:true})).toHaveCount(0);
    await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth)).toBeLessThanOrEqual(1);
    await testInfo.attach("문서 폭",{body:JSON.stringify(await page.evaluate(()=>({viewport:innerWidth,document:document.documentElement.scrollWidth}))),contentType:"application/json"});
  });
}
for(const width of [320,390])test(`탭 ${width}px 마지막 탭과 키보드`,async({page})=>{
  await page.setViewportSize({width,height:844});await page.goto("/workspace/dashboard");
  const tabs=page.getByRole("tablist",{name:"대시보드 탭"}),last=tabs.getByRole("tab").last();
  await last.click();await expect(last).toHaveAttribute("aria-selected","true");
  await expect(page.getByLabel("대시보드 사용자 검색",{exact:true})).toBeVisible();
  const overflow=()=>tabs.evaluate(list=>{const selected=list.querySelector('[aria-selected="true"]')!,bounds=list.parentElement!.getBoundingClientRect(),rect=selected.getBoundingClientRect();return Math.max(bounds.left-rect.left,rect.right-bounds.right,0);});
  await expect.poll(overflow).toBeLessThanOrEqual(1);await last.press("ArrowLeft");
  const previous=tabs.getByRole("tab",{name:"작업·리소스 상세"});await expect(previous).toBeFocused();
  await expect.poll(()=>previous.evaluate(node=>{const box=node.closest('[role="tablist"]')!.parentElement!.getBoundingClientRect(),rect=node.getBoundingClientRect();return Math.max(box.left-rect.left,rect.right-box.right,0);})).toBeLessThanOrEqual(1);
  await previous.press("Enter");await expect(previous).toHaveAttribute("aria-selected","true");await expect.poll(overflow).toBeLessThanOrEqual(1);
  expect(await page.evaluate(()=>window.scrollX)).toBe(0);
  await page.screenshot({path:`test-results/dashboard-${width}.png`,fullPage:true});
});
