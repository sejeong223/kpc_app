import { readFile } from "node:fs/promises";
import JSZip from "jszip";
import { test,expect,fixture,registerTemplate,startTemplateWork,apply,navigate,setPreviewRole } from "./admin-review.helpers";

test("같은 파일 최신 재적용은 선택 슬라이드와 미선택 XML을 보존한다",async({page},testInfo)=>{
  await page.goto("/workspace/templates");await registerTemplate(page,{name:"선택 보존",filePath:fixture()});await startTemplateWork(page,"선택 보존");
  await page.getByRole("checkbox",{name:"전체 슬라이드",exact:true}).uncheck();
  await page.getByRole("checkbox",{name:"2쪽",exact:true}).check();await apply(page);
  const firstDownload=page.waitForEvent("download");await page.getByRole("button",{name:"PPTX 다운로드",exact:true}).click();
  const beforePath=testInfo.outputPath("selected-before.pptx");await(await firstDownload).saveAs(beforePath);
  await page.getByRole("button",{name:"작업 닫기",exact:true}).click();await page.getByRole("button",{name:"선택 보존",exact:true}).click();
  const editor=page.getByRole("dialog",{name:"Template 편집",exact:true});await editor.getByLabel("설명",{exact:true}).fill("설명만 수정한 두 번째 버전");await editor.getByRole("button",{name:"저장",exact:true}).click();
  await expect(editor).toHaveCount(0);await page.getByRole("button",{name:"작업 열기",exact:true}).click();await apply(page,true);
  for(const index of [1,3,4])await expect(page.getByRole("checkbox",{name:`${index}쪽`,exact:true})).not.toBeChecked();
  await expect(page.getByRole("checkbox",{name:"2쪽",exact:true})).toBeChecked();
  const latestDownload=page.waitForEvent("download");await page.getByRole("button",{name:"PPTX 다운로드",exact:true}).click();
  const latestPath=testInfo.outputPath("selected-latest.pptx");await(await latestDownload).saveAs(latestPath);
  const original=await JSZip.loadAsync(await readFile(fixture()));
  for(const file of [beforePath,latestPath]){
    const zip=await JSZip.loadAsync(await readFile(file));
    for(const index of [1,3,4]){const part=`ppt/slides/slide${index}.xml`;expect(await zip.file(part)!.async("string")).toBe(await original.file(part)!.async("string"));}
    expect(await zip.file("ppt/slides/slide2.xml")!.async("string")).not.toBe(await original.file("ppt/slides/slide2.xml")!.async("string"));
  }
  await navigate(page,"/workspace/dashboard");await page.getByRole("tab",{name:"작업·리소스 상세"}).click();
  const details=page.getByRole("region",{name:"세부 작업별 활동"});await expect(details).toContainText("PPT 서식 적용");await expect(details).not.toContainText("revisionId");
  await expect(details.getByText("PPT 서식 적용",{exact:true}).locator("..")).toContainText("2건");
});

test("편집 위치·포커스·공유 초안·결과 필터는 유지되고 파일 교체만 초기화한다",async({page})=>{
  await page.goto("/workspace/templates");await registerTemplate(page,{name:"편집 유지",filePath:fixture("shared-groups.pptx")});await startTemplateWork(page,"편집 유지");
  const mapping=page.getByRole("region",{name:"슬라이드 유형·역할·제외 설정"});
  await mapping.getByLabel("설정할 슬라이드",{exact:true}).selectOption("1");
  const type=mapping.getByLabel("페이지 유형",{exact:true});await type.focus();await type.selectOption("body");await expect(type).toBeEnabled();await expect(type).toBeFocused();
  await expect(mapping.getByLabel("설정할 슬라이드",{exact:true})).toHaveValue("1");
  const role=mapping.getByRole("combobox").nth(2);await role.focus();await role.selectOption("keep");await expect(role).toBeEnabled();await expect(role).toBeFocused();
  const excluded=mapping.getByRole("checkbox",{name:"적용 제외",exact:true}).first();await excluded.check();await expect(excluded).toBeEnabled();await expect(excluded).toBeFocused();
  await page.getByLabel("비교 슬라이드",{exact:true}).selectOption("1");await page.getByLabel("결과 상태",{exact:true}).selectOption("kept");
  const shared=page.getByRole("region",{name:"공유 디자인 편집"});await shared.locator("summary").filter({hasText:"공유 그룹 보존"}).click();await shared.getByRole("button",{name:"내부 요소 편집",exact:true}).first().click();
  await shared.getByRole("checkbox",{name:"공유 글자 서식 변경",exact:true}).check();await shared.getByLabel("공유 글꼴",{exact:true}).fill("미저장 글꼴 초안");
  await page.getByRole("checkbox",{name:"이미지 크기 규칙 적용",exact:true}).check();
  await expect(shared.getByLabel("공유 글꼴",{exact:true})).toHaveValue("미저장 글꼴 초안");await apply(page);
  await expect(mapping.getByLabel("설정할 슬라이드",{exact:true})).toHaveValue("1");await expect(page.getByLabel("비교 슬라이드",{exact:true})).toHaveValue("1");await expect(page.getByLabel("결과 상태",{exact:true})).toHaveValue("kept");
  await expect(shared.getByLabel("공유 글꼴",{exact:true})).toHaveValue("미저장 글꼴 초안");
  await page.screenshot({path:"test-results/workbench-state.png"});
  await page.getByRole("button",{name:"작업 닫기",exact:true}).click();await page.getByRole("button",{name:"편집 유지",exact:true}).click();
  const editor=page.getByRole("dialog",{name:"Template 편집",exact:true});await editor.getByLabel("원본 파일 선택",{exact:true}).setInputFiles(fixture());await editor.getByRole("button",{name:"저장",exact:true}).click();await expect(editor).toHaveCount(0);
  await page.getByRole("button",{name:"작업 열기",exact:true}).click();await mapping.getByLabel("설정할 슬라이드",{exact:true}).selectOption("1");await page.getByLabel("비교 슬라이드",{exact:true}).selectOption("1");await apply(page,true);
  await expect(mapping.getByLabel("설정할 슬라이드",{exact:true})).toHaveValue("0");await expect(page.getByLabel("비교 슬라이드",{exact:true})).toHaveValue("0");await expect(page.getByRole("checkbox",{name:"전체 슬라이드",exact:true})).toBeChecked();
});

test("업로드 취소는 즉시 편집을 복구하고 늦은 A가 완료된 B를 덮지 않는다",async({page})=>{
  await page.goto("/workspace/templates");await page.getByRole("button",{name:"+ Template 등록",exact:true}).click();
  const editor=page.getByRole("dialog",{name:"Template 등록",exact:true});await editor.getByRole("textbox",{name:"Template 이름",exact:true}).fill("취소 보존 초안");
  await page.evaluate(()=>{
    const original=File.prototype.arrayBuffer;
    File.prototype.arrayBuffer=function(){if(this.name!=="delayed-A.pptx")return original.call(this);return new Promise<ArrayBuffer>((resolve,reject)=>{window.addEventListener("test-release-import",()=>{original.call(this).then(resolve,reject);},{once:true});});};
    window.addEventListener("test-restore-import",()=>{File.prototype.arrayBuffer=original;window.dispatchEvent(new Event("test-release-import"));},{once:true});
  });
  try{
    await editor.getByLabel("원본 파일 선택",{exact:true}).setInputFiles({name:"delayed-A.pptx",mimeType:"application/vnd.openxmlformats-officedocument.presentationml.presentation",buffer:await readFile(fixture())});
    await expect(editor.getByRole("button",{name:"분석 취소",exact:true})).toBeVisible();await editor.getByRole("button",{name:"취소",exact:true}).click();await editor.getByRole("button",{name:"계속 편집",exact:true}).click();
    await expect(editor.getByRole("textbox",{name:"Template 이름",exact:true})).toBeEnabled();await expect(editor.getByLabel("설명",{exact:true})).toBeEnabled();await expect(editor.getByLabel("원본 파일 선택",{exact:true})).toBeEnabled();await expect(editor.getByRole("button",{name:"분석 취소",exact:true})).toHaveCount(0);await expect(editor.getByRole("button",{name:"저장",exact:true})).toBeDisabled();
    await editor.getByLabel("원본 파일 선택",{exact:true}).setInputFiles(fixture("shared-groups.pptx"));await expect(editor.getByRole("button",{name:"저장",exact:true})).toBeEnabled();
    await page.evaluate(()=>window.dispatchEvent(new Event("test-release-import")));
    await expect(editor.getByRole("region",{name:"Template 원본 파일"})).toContainText("shared-groups.pptx");await expect(editor.getByRole("textbox",{name:"Template 이름",exact:true})).toHaveValue("취소 보존 초안");
    await editor.getByRole("button",{name:"취소",exact:true}).click();await editor.getByRole("button",{name:"계속 편집",exact:true}).click();await expect(editor.getByRole("button",{name:"저장",exact:true})).toBeEnabled();
    await editor.getByLabel("원본 파일 선택",{exact:true}).setInputFiles({name:"delayed-A.pptx",mimeType:"application/vnd.openxmlformats-officedocument.presentationml.presentation",buffer:await readFile(fixture())});await editor.getByRole("button",{name:"분석 취소",exact:true}).click();await expect(editor.getByLabel("원본 파일 선택",{exact:true})).toBeEnabled();await expect(editor.getByRole("button",{name:"저장",exact:true})).toBeDisabled();
    await editor.getByRole("button",{name:"취소",exact:true}).click();await editor.getByRole("button",{name:"변경사항 버리기",exact:true}).click();await expect(editor).toHaveCount(0);
  }finally{await page.evaluate(()=>window.dispatchEvent(new Event("test-restore-import")));}
});

test("현재 역할을 일반 사용자로 바꾸면 작업 자료와 관리자 메뉴를 감춘다",async({page})=>{
  await page.goto("/workspace/templates");await registerTemplate(page,{name:"권한 검사",filePath:fixture()});await startTemplateWork(page,"권한 검사");await apply(page);
  await setPreviewRole(page,"user");await expect(page.getByRole("heading",{name:"PPT 적용 테스트",exact:true})).toHaveCount(0);await expect(page.getByRole("button",{name:"PPTX 다운로드",exact:true})).toHaveCount(0);await expect(page.locator('a[href="/workspace/templates"]')).toHaveCount(0);
  await setPreviewRole(page,"super_admin");await navigate(page,"/workspace/templates");await page.getByRole("button",{name:"작업 열기",exact:true}).click();await expect(page.getByRole("button",{name:"PPTX 다운로드",exact:true})).toBeEnabled();
});

test("그룹 활동명 검색과 CSV는 표시·원본을 분리한다",async({page},testInfo)=>{
  await page.goto("/workspace/users");await page.getByRole("tab",{name:"그룹",exact:true}).click();await page.getByRole("button",{name:"그룹 추가",exact:true}).click();
  let editor=page.getByRole("dialog",{name:"그룹 추가",exact:true});await editor.getByLabel("그룹 이름",{exact:true}).fill("회귀 검증 그룹");await editor.getByRole("checkbox").first().check();await editor.getByRole("button",{name:"저장",exact:true}).click();await expect(editor).toHaveCount(0);
  await page.getByRole("row").filter({hasText:"회귀 검증 그룹"}).getByRole("button",{name:"편집",exact:true}).click();editor=page.getByRole("dialog",{name:"그룹 편집",exact:true});await editor.getByLabel("그룹 이름",{exact:true}).fill("회귀 검증 그룹 수정");await editor.getByRole("button",{name:"저장",exact:true}).click();await expect(editor).toHaveCount(0);
  await navigate(page,"/workspace/audit");await page.getByLabel("로그 대상 검색",{exact:true}).fill("그룹 수정");await expect(page.getByRole("table",{name:"활동 로그 목록"})).toContainText("그룹 수정");await expect(page.getByRole("table",{name:"활동 로그 목록"})).not.toContainText("update-group");
  const download=page.waitForEvent("download");await page.getByRole("button",{name:"CSV 내보내기",exact:true}).click();const csvPath=testInfo.outputPath("audit.csv");await(await download).saveAs(csvPath);
  const csv=await readFile(csvPath,"utf8");expect(csv.charCodeAt(0)).toBe(0xfeff);expect(csv.split("\r\n")[0].split(",")).toHaveLength(15);expect(csv).toContain('"그룹 수정"');expect(csv).toContain('"update-group"');
  await navigate(page,"/workspace/dashboard");await page.getByRole("tab",{name:"작업·리소스 상세"}).click();const panel=page.getByRole("region",{name:"세부 작업별 활동"});await expect(panel).toContainText("그룹 생성");await expect(panel).toContainText("그룹 수정");await expect(panel).not.toContainText("update-group");
});

test("기존 사용자 삭제 복구와 감사 상세 요청 ID",async({page})=>{
  await page.goto("/workspace/users");const row=page.getByRole("row").filter({hasText:"이서연"});
  await row.getByRole("button",{name:"삭제",exact:true}).click();await page.getByRole("dialog",{name:"사용자 삭제",exact:true}).getByRole("button",{name:"삭제",exact:true}).click();await expect(row).toHaveCount(0);
  await page.getByRole("button",{name:"되돌리기",exact:true}).click();await expect(row).toBeVisible();
  await navigate(page,"/workspace/audit");await page.getByRole("button",{name:"1행 상세 보기",exact:true}).click();
  const description=page.getByRole("table",{name:"활동 로그 목록"}).locator("dl");await expect(description).toContainText("요청 ID");
  const requestId=await description.locator("div").filter({has:page.getByText("요청 ID",{exact:true})}).locator("dd").innerText();
  const targetId=await description.locator("div").filter({has:page.getByText("대상 ID",{exact:true})}).locator("dd").innerText();expect(requestId).not.toBe(targetId);
});

test("모델 단가 소수 6자리와 Skill 미저장 모달 흐름",async({page})=>{
  await page.goto("/workspace/policy?tab=models");const input=page.getByLabel(/입력 단가$/).first(),label=await input.getAttribute("aria-label");
  await input.fill("0.123456");await input.locator("xpath=ancestor::tr").getByRole("button",{name:"저장",exact:true}).click();await expect(input).toBeEnabled();
  await page.getByRole("tab",{name:"토큰·비용 관리",exact:true}).click();await page.getByRole("tab",{name:"모델 설정",exact:true}).click();await expect(page.getByLabel(label!,{exact:true})).toHaveValue("0.123456");
  await navigate(page,"/workspace/skills");const register=page.getByRole("button",{name:"+ Skill 등록",exact:true});await register.click();const editor=page.getByRole("dialog",{name:"Skill 등록",exact:true});await editor.getByRole("textbox",{name:"Skill 이름",exact:true}).fill("저장하지 않은 Skill");await editor.press("Escape");await editor.getByRole("button",{name:"계속 편집",exact:true}).click();await expect(editor.getByRole("textbox",{name:"Skill 이름",exact:true})).toHaveValue("저장하지 않은 Skill");await editor.press("Escape");await editor.getByRole("button",{name:"변경사항 버리기",exact:true}).click();await expect(editor).toHaveCount(0);await expect(register).toBeFocused();
});

test("토큰 승인 후 프로필 한도 동기화와 이전 주소 리다이렉트",async({page})=>{
  await page.goto("/workspace/tokens");await expect(page).toHaveURL(/\/workspace\/policy\?tab=tokens/);
  await page.getByRole("button",{name:"사용자 프로필",exact:true}).click();await expect(page.getByRole("region",{name:"AI Token 사용량"})).toContainText("100K");await page.getByRole("button",{name:"토큰 추가 신청",exact:true}).click();
  const dialog=page.getByRole("dialog");await dialog.getByRole("radio",{name:"+50K",exact:true}).check();await dialog.getByLabel("사용할 프로젝트",{exact:true}).selectOption("outside");await dialog.getByPlaceholder("예) 2차 검수 의견 반영으로 3장 기술 부문 전체 재작성이 필요합니다").fill("브라우저 회귀 검증 신청");
  await dialog.getByRole("button",{name:"신청하기",exact:true}).click();await expect(dialog).toHaveCount(0);
  const request=page.getByRole("row").filter({hasText:"브라우저 회귀 검증 신청"});await request.getByRole("button",{name:"승인",exact:true}).click();await expect(request).toContainText("처리 완료");
  await page.getByRole("button",{name:"사용자 프로필",exact:true}).click();await expect(page.getByRole("region",{name:"AI Token 사용량"})).toContainText("150K");
});
