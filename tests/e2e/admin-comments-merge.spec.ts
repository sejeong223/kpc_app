import { test, expect, registerTemplate, startTemplateWork, navigate, apply, fixture, setPreviewRole } from "./admin-review.helpers";

test("병합 후 관리자 작업과 제작 코멘트가 함께 유지된다", async ({ page }) => {
  await page.goto("/workspace/templates");
  await registerTemplate(page, { name: "병합 검증 Template", filePath: fixture() });
  await startTemplateWork(page, "병합 검증 Template");
  await apply(page);
  await navigate(page, "/workspace/write");

  await expect(page.locator("[data-comment-pin]")).toHaveCount(2);
  await page.getByRole("button", { name: "핀 생성", exact: true }).click();
  await page.locator("[data-comment-surface]").click({ position: { x: 400, y: 220 } });
  const popup = page.getByRole("dialog", { name: "새 코멘트", exact: true });
  await popup.getByRole("combobox", { name: "의견 입력", exact: true }).fill("병합 후에도 보존하는 의견");
  await popup.getByRole("button", { name: "의견 등록", exact: true }).click();
  await expect(page.getByRole("button", { name: "코멘트 3 · 진행 중", exact: true })).toBeVisible();
  await expect(page.locator("[data-comment-popup]")).toContainText("병합 후에도 보존하는 의견");
  await page.getByRole("button", { name: "코멘트 닫기", exact: true }).click();

  await navigate(page, "/workspace/templates");
  await page.getByRole("button", { name: "작업 열기", exact: true }).click();
  await expect(page.getByRole("button", { name: "PPTX 다운로드", exact: true })).toBeEnabled();
  await expect(page.getByRole("main")).toContainText("병합 검증 Template");

  await navigate(page, "/workspace/write");
  await page.reload();
  await page.getByRole("button", { name: "코멘트 3 · 진행 중", exact: true }).click();
  await expect(page.locator("[data-comment-popup]")).toContainText("병합 후에도 보존하는 의견");
  await page.getByRole("button", { name: "반영 완료", exact: true }).click();
  await expect(page.getByRole("button", { name: "코멘트 3 · 반영 완료", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "코멘트 닫기", exact: true }).click();
  await setPreviewRole(page, "user");
  await expect(page.getByRole("button", { name: "핀 생성", exact: true })).toBeEnabled();
  await expect(page.locator('a[href="/workspace/templates"]')).toHaveCount(0);
});

for (const width of [320, 390]) {
  test(`병합 후 ${width}px 관리자 제목과 제작 모바일 메뉴`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/workspace/dashboard");
    const trigger = page.locator("#workspace-sidebar-trigger");
    const title = page.getByRole("main").getByRole("heading", { level: 1 });
    await expect(title).toBeVisible();
    const buttonBox = await trigger.boundingBox(), titleBox = await title.boundingBox();
    expect(buttonBox).not.toBeNull(); expect(titleBox).not.toBeNull();
    expect(titleBox!.y).toBeGreaterThanOrEqual(buttonBox!.y + buttonBox!.height);
    await trigger.click();
    await page.locator('a[href="/workspace/write"]').click();
    await expect(page.getByRole("heading", { name: "제작", exact: true })).toBeVisible();
    await expect(page.locator("[data-comment-pin]")).toHaveCount(2);
    await page.getByRole("button", { name: "코멘트 1 · 진행 중", exact: true }).click();
    await expect(page.locator("[data-comment-popup]")).toBeVisible();
    await trigger.click();
    await expect(page.locator("[data-comment-popup]")).toHaveCount(0);
    await expect(page.getByRole("main").locator("..")).toHaveAttribute("inert", "");
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  });
}
