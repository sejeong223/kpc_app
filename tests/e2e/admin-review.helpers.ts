import { test as base,expect,type Page } from "@playwright/test";
import path from "node:path";

export const fixture=(name="native-template.pptx")=>path.resolve("tests/fixtures/pptx",name);
export const test=base.extend<{browserErrors:string[]}>({
  browserErrors:[async({page},use)=>{
    const errors:string[]=[];
    page.on("pageerror",error=>errors.push(error.message));
    page.on("response",response=>{if(response.status()>=400)errors.push(`${response.status()} ${response.url()}`);});
    await use(errors);expect(errors,"브라우저 실행·HTTP 오류").toEqual([]);
  },{auto:true}],
});
export { expect };
export interface TemplateFixtureInput {name:string;filePath:string}
export async function registerTemplate(page:Page,{name,filePath}:TemplateFixtureInput):Promise<void>{
  await page.getByRole("button",{name:"+ Template 등록",exact:true}).click();
  const dialog=page.getByRole("dialog",{name:"Template 등록",exact:true});
  await dialog.getByLabel("원본 파일 선택",{exact:true}).setInputFiles(filePath);
  await expect(dialog.getByRole("textbox",{name:"Template 이름",exact:true})).toBeEnabled();
  await dialog.getByRole("textbox",{name:"Template 이름",exact:true}).fill(name);
  await dialog.getByLabel("상태",{exact:true}).selectOption("active");
  await dialog.getByRole("button",{name:"저장",exact:true}).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("button",{name,exact:true})).toBeVisible();
}
export async function startTemplateWork(page:Page,templateName:string):Promise<void>{
  await page.getByRole("row").filter({has:page.getByRole("button",{name:templateName,exact:true})}).getByRole("button",{name:"적용 테스트",exact:true}).click();
  const dialog=page.getByRole("dialog",{name:"적용할 Skill 선택",exact:true});
  await dialog.getByRole("radio").first().check();
  await dialog.getByRole("button",{name:"적용 작업 만들기",exact:true}).click();
  await expect(page.getByRole("heading",{name:"PPT 적용 테스트",exact:true})).toBeVisible();
}
export async function setPreviewRole(page:Page,role:"user"|"department_admin"|"super_admin"):Promise<void>{
  await page.getByRole("button",{name:"사용자 프로필",exact:true}).click();
  await page.getByRole("region",{name:"권한 테스트 모드"}).getByRole("radio",{name:{user:"일반 사용자",department_admin:"관리자",super_admin:"슈퍼 관리자"}[role],exact:true}).check();
  // 일반 사용자 전환은 페이지 이동으로 프로필을 자동 닫을 수도 있다.
  await page.keyboard.press("Escape");await expect(page.getByRole("button",{name:"프로필 메뉴 닫기",exact:true})).toHaveCount(0);
}
export async function navigate(page:Page,href:string):Promise<void>{
  await page.locator(`a[href="${href}"]`).first().click();
  await expect(page).toHaveURL(new RegExp(href.replace(/[?]/g,"\\?")));
}
export async function apply(page:Page,latest=false):Promise<void>{
  if(latest){await page.getByRole("button",{name:"최신 버전 재적용",exact:true}).click();await page.getByRole("dialog").getByRole("button",{name:"최신 버전 적용",exact:true}).click();}
  else await page.getByRole("button",{name:/^(Skill 적용 및 비교|현재 버전 재적용)$/}).click();
  await expect(page.getByRole("button",{name:"PPTX 다운로드",exact:true})).toBeEnabled();
}
