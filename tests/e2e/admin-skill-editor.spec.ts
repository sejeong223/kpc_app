import { test,expect,setPreviewRole } from "./admin-review.helpers";

test("Skill 입력 화면의 9개 영역·서식 63개 저장과 수정·공통 상속",async({page})=>{
  await page.goto("/workspace/skills");await page.getByRole("button",{name:"+ Skill 등록",exact:true}).click();
  const form=page.getByRole("form",{name:"Skill 입력",exact:true});
  await expect(page.getByRole("heading",{name:"Skill 등록",exact:true})).toBeFocused();
  await expect(page.getByRole("dialog")).toHaveCount(0);await expect(page.getByRole("table",{name:"자산 목록",exact:true})).toHaveCount(0);
  for(let section=1;section<=8;section++)await expect(form.getByRole("group",{name:new RegExp(`^${section}\\.`)})).toBeVisible();
  await expect(form.getByRole("region",{name:"9. 공개 범위",exact:true})).toBeVisible();
  await expect(form.locator("select[name],input[name]")).toHaveCount(63);
  await form.getByRole("textbox",{name:"Skill 이름",exact:true}).fill("입력 화면 전체 설정 검증");
  await page.getByRole("button",{name:"등록",exact:true}).click();await expect(form.getByRole("textbox",{name:"약칭",exact:true})).toBeFocused();
  await form.getByRole("textbox",{name:"약칭",exact:true}).fill("화면검증");await form.getByLabel("설명",{exact:true}).fill("9개 영역의 설정을 저장하고 다시 확인합니다.");
  const expected:Record<string,string>={};
  for(const select of await form.locator("select[name]").all()){
    const name=(await select.getAttribute("name"))!,value=(await select.locator("option").last().getAttribute("value"))!;
    expected[name]=value;await select.selectOption(value);
  }
  for(const checkbox of await form.locator('input[name][type="checkbox"]').all())await checkbox.uncheck();
  for(const key of ["title","body","lh"]){expected[`pt.body.${key}`]="";await form.locator(`select[name="pt.body.${key}"]`).selectOption("");}
  const visibility=form.getByRole("group",{name:"공개 범위",exact:true}),target=visibility.getByRole("checkbox").nth(1);
  await target.check();
  await expect(visibility.getByRole("button",{name:/공개 대상 제거$/})).toHaveCount(1);
  await form.getByLabel("상태",{exact:true}).selectOption("active");
  const preview=page.getByRole("complementary",{name:"실시간 서식 미리보기"});
  await expect(preview.locator('[data-guide="column"]')).toHaveCount(15);await expect(preview.locator('[data-guide="row"]')).toHaveCount(5);
  await expect(form.locator('select[name="pt.body.title"] option').first()).toHaveText("공통 40pt");
  await page.getByRole("button",{name:"등록",exact:true}).click();await expect(form).toHaveCount(0);
  const row=page.getByRole("button",{name:"입력 화면 전체 설정 검증",exact:true});await expect(row).toBeFocused();await row.click();
  await expect(page.getByRole("heading",{name:"Skill 편집",exact:true})).toBeVisible();
  for(const [name,value] of Object.entries(expected))await expect(form.locator(`select[name="${name}"]`),name).toHaveValue(value);
  for(const checkbox of await form.locator('input[name][type="checkbox"]').all())await expect(checkbox).not.toBeChecked();
  await expect(form.getByLabel("설명",{exact:true})).toHaveValue("9개 영역의 설정을 저장하고 다시 확인합니다.");
  await expect(visibility.getByRole("button",{name:/공개 대상 제거$/})).toHaveCount(1);
  await preview.getByLabel("미리보기 페이지 유형",{exact:true}).selectOption("body");
  const before=Number(await preview.locator("[data-preview-title]").getAttribute("font-size"));
  await form.getByLabel("제목 크기 (pt)",{exact:true}).selectOption("20");
  await expect.poll(async()=>Number(await preview.locator("[data-preview-title]").getAttribute("font-size"))).toBe(before/2);
  await page.getByRole("button",{name:"저장",exact:true}).click();await expect(form).toHaveCount(0);await row.click();
  await expect(form.getByLabel("제목 크기 (pt)",{exact:true})).toHaveValue("20");await expect(form.getByLabel("본문 제목 크기 (pt)",{exact:true})).toHaveValue("");
});

test("Skill 미저장 입력을 사이드바·새로고침에서 보호하고 목록 검색·포커스를 복구한다",async({page})=>{
  await page.goto("/workspace/skills");await page.getByLabel("검색",{exact:true}).fill("KPC");
  const source=page.getByRole("button",{name:"KPC 표준 제안서",exact:true});await source.click();
  const form=page.getByRole("form",{name:"Skill 입력",exact:true});await form.getByLabel("설명",{exact:true}).fill("미저장 설명");
  await page.locator('a[href="/workspace/templates"]').click();
  const confirm=page.getByRole("dialog",{name:"변경사항 버리기",exact:true});await expect(confirm).toBeVisible();await expect(page).toHaveURL(/\/workspace\/skills$/);
  await confirm.getByRole("button",{name:"계속 편집",exact:true}).click();await expect(form.getByLabel("설명",{exact:true})).toHaveValue("미저장 설명");
  const unload=page.waitForEvent("dialog");await page.evaluate(()=>{setTimeout(()=>window.location.reload(),0);});
  const warning=await unload;expect(warning.type()).toBe("beforeunload");await warning.dismiss();
  await expect(form.getByLabel("설명",{exact:true})).toHaveValue("미저장 설명");
  await page.getByRole("button",{name:"← Skill 목록",exact:true}).click();await confirm.getByRole("button",{name:"변경사항 버리기",exact:true}).click();
  await expect(page.getByLabel("검색",{exact:true})).toHaveValue("KPC");await expect(source).toBeFocused();
  await source.click();await form.getByLabel("설명",{exact:true}).fill("메뉴 이동 확인");await page.locator('a[href="/workspace/templates"]').click();await confirm.getByRole("button",{name:"변경사항 버리기",exact:true}).click();
  await expect(page).toHaveURL(/\/workspace\/templates$/);
});

test("공유 Skill 조회 화면과 일반 사용자 메뉴 차단을 유지한다",async({page})=>{
  await page.goto("/workspace/skills");await setPreviewRole(page,"department_admin");await page.getByRole("button",{name:"공유 제안서 서식",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Skill 상세",exact:true})).toBeVisible();
  const form=page.getByRole("form",{name:"Skill 입력",exact:true});await expect(form.getByRole("textbox",{name:"Skill 이름",exact:true})).toBeDisabled();await expect(page.getByRole("button",{name:"저장",exact:true})).toHaveCount(0);
  for(const control of await form.locator("select[name],input[name]").all())await expect(control).toBeDisabled();
  await setPreviewRole(page,"user");await expect(form).toHaveCount(0);await expect(page.locator('a[href="/workspace/skills"]')).toHaveCount(0);
});

for(const width of [1440,1024,768,390,320])test(`Skill 입력 화면 ${width}px에서 전체 항목과 이동 확인`,async({page},testInfo)=>{
  await page.setViewportSize({width,height:900});await page.goto("/workspace/skills");await page.getByRole("button",{name:"+ Skill 등록",exact:true}).click();
  const form=page.getByRole("form",{name:"Skill 입력",exact:true});await form.getByRole("textbox",{name:"Skill 이름",exact:true}).fill("반응형 검증");
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
  await form.getByRole("region",{name:"페이지 유형별 규칙 표",exact:true}).scrollIntoViewIfNeeded();
  await form.getByLabel("부록 유형 규칙",{exact:true}).selectOption("출처 표기 필수");
  await expect(page.getByRole("button",{name:"등록",exact:true})).toBeInViewport();
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
  await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:testInfo.outputPath(`skill-editor-${width}.png`),fullPage:true});
  if(width<761){
    await page.locator("#workspace-sidebar-trigger").click();await page.locator('a[href="/workspace/templates"]').click();
    await page.getByRole("dialog",{name:"변경사항 버리기",exact:true}).getByRole("button",{name:"변경사항 버리기",exact:true}).click();
    await expect(page).toHaveURL(/\/workspace\/templates$/);await expect(page.getByRole("main").locator("..")).not.toHaveAttribute("inert","");
  }
});
