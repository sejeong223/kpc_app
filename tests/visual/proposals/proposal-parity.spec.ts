import { execFileSync } from "node:child_process";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

const REFERENCE_COMMIT = "8f074e51f7a16db063ef5206e6ac927c6e87c2a4";
const REFERENCE_REPOSITORY =
  process.env.KPC_REFERENCE_REPO ??
  path.resolve(process.cwd(), "..", "KPC_AI");

const VIEWPORTS = [
  { width: 1920, height: 1080 },
  { width: 1440, height: 900 },
  { width: 1280, height: 800 },
] as const;

type Scenario = {
  name: string;
  expectedText: string | RegExp;
  open(page: Page): Promise<void>;
};

async function openProposals(page: Page) {
  await page.goto("/");
  await page.locator("#gnb-proposals-btn").click();
  await expect(page.locator("#lnb-pipeline-btn")).toBeVisible();
}

async function openWritingSetup(page: Page) {
  await openProposals(page);
  await page.getByRole("button", { name: "작성시작" }).first().click();
  await expect(page.getByText("전체 프로젝트", { exact: true })).toBeVisible();
}

async function openAnalysis(page: Page) {
  await openWritingSetup(page);
  await page.getByRole("button", { name: /RFP 분석 시작/ }).click();
  await expect(page.getByText("02 RFP 분석", { exact: true })).toBeVisible();
}

async function openEditorOverview(page: Page) {
  await openAnalysis(page);
  await page.locator("button").filter({ hasText: "04" }).click();
  await expect(page.getByText("제안서 작성", { exact: true })).toBeVisible();
}

async function openEditorDetail(page: Page) {
  await openEditorOverview(page);
  await page.getByText("1. 사업 이해 및 추진전략", { exact: true }).click();
  await expect(page.getByText("스토리보드", { exact: true })).toBeVisible();
}

async function openReviewMatrix(page: Page) {
  await openAnalysis(page);
  await page.locator("button").filter({ hasText: "05" }).click();
  await expect(
    page.getByText("제안서 현재 상황 전체보기", { exact: true }),
  ).toBeVisible();
}

const scenarios: readonly Scenario[] = [
  {
    name: "header-proposal-active",
    expectedText: "제안 목록",
    open: openProposals,
  },
  {
    name: "header-profile-dropdown",
    expectedText: "정소담",
    open: async (page) => {
      await openProposals(page);
      await page.locator("#user-profile-badge").click();
    },
  },
  {
    name: "pipeline-kanban",
    expectedText: "검토대기",
    open: openProposals,
  },
  {
    name: "pipeline-list",
    expectedText: "프로젝트명 / 발주처",
    open: async (page) => {
      await openProposals(page);
      await page.locator("#pipeline-view-list-btn").click();
    },
  },
  {
    name: "project-registration",
    expectedText: "프로젝트 등록",
    open: async (page) => {
      await openProposals(page);
      await page.locator("#register-project-main-btn").click();
    },
  },
  {
    name: "project-review",
    expectedText: /수주|검토/,
    open: async (page) => {
      await openProposals(page);
      await page.getByRole("button", { name: "검토시작" }).first().click();
    },
  },
  {
    name: "setup",
    expectedText: /RFP|작성 설정/,
    open: openWritingSetup,
  },
  {
    name: "analysis",
    expectedText: "02 RFP 분석",
    open: openAnalysis,
  },
  {
    name: "requirements",
    expectedText: "제안서 제출 마감 일시 (2026년 10월 15일 17:00까지) 엄수",
    open: async (page) => {
      await openAnalysis(page);
      await page.getByRole("button", { name: /체크리스트 이동/ }).click();
    },
  },
  {
    name: "structure",
    expectedText: "제안서 작성",
    open: openEditorOverview,
  },
  {
    name: "editor",
    expectedText: "스토리보드",
    open: openEditorDetail,
  },
  {
    name: "reference",
    expectedText: "내부 저장소",
    open: async (page) => {
      await openEditorDetail(page);
      await page
        .getByTitle("참조 위치 설정 (내부저장소, 업로드, 웹 검색 - 현재 섹션 전용)")
        .click();
    },
  },
  {
    name: "matrix",
    expectedText: "제안서 현재 상황 전체보기",
    open: openReviewMatrix,
  },
  {
    name: "fact-check",
    expectedText: "제안서 사실관계검증 (Fact-Check)",
    open: async (page) => {
      await openReviewMatrix(page);
      await page.getByRole("button", { name: /사실관계검증/ }).click();
    },
  },
  {
    name: "library",
    expectedText: "자료 라이브러리",
    open: async (page) => {
      await openProposals(page);
      await page.locator("#lnb-library-btn").click();
    },
  },
  {
    name: "library-enterprise",
    expectedText: "사내 자료 저장소 (전체 폴더)",
    open: async (page) => {
      await openProposals(page);
      await page.locator("#lnb-library-btn").click();
      await page
        .getByRole("button", { name: "자료 등록 (사내 저장소 연계)" })
        .click();
    },
  },
  {
    name: "library-preview",
    expectedText: "한국생산성본부(KPC) 제안 수주 지식 자산 저장소",
    open: async (page) => {
      await openProposals(page);
      await page.locator("#lnb-library-btn").click();
      await page.getByRole("button", { name: "미리보기" }).first().click();
    },
  },
  {
    name: "settings",
    expectedText: "제안 설정",
    open: async (page) => {
      await openProposals(page);
      await page.locator("#lnb-settings-btn").click();
    },
  },
  {
    name: "settings-templates",
    expectedText: "제안서 템플릿",
    open: async (page) => {
      await openProposals(page);
      await page.locator("#lnb-settings-btn").click();
      await page.getByRole("button", { name: /템플릿 및 스킬 관리/ }).click();
    },
  },
] as const;

test.beforeAll(({}, workerInfo) => {
  const isReference = workerInfo.project.name === "reference";
  const isUpdating = ["all", "changed"].includes(
    workerInfo.config.updateSnapshots,
  );

  if (isUpdating && !isReference) {
    throw new Error("Snapshot updates are allowed only in the reference project.");
  }

  if (!isReference) {
    return;
  }

  const actualCommit = execFileSync(
    "git",
    ["-C", REFERENCE_REPOSITORY, "rev-parse", "HEAD"],
    { encoding: "utf8" },
  ).trim();

  if (actualCommit !== REFERENCE_COMMIT) {
    throw new Error(
      `Reference commit mismatch: expected ${REFERENCE_COMMIT}, received ${actualCommit}`,
    );
  }
});

test.afterEach(async ({ page }) => {
  if (!page.url().startsWith("http")) {
    return;
  }

  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
});

for (const viewport of VIEWPORTS) {
  test.describe(`${viewport.width}x${viewport.height}`, () => {
    test.use({ viewport });

    for (const scenario of scenarios) {
      test(scenario.name, async ({ page }) => {
        await scenario.open(page);
        await expect(page.getByText(scenario.expectedText).first()).toBeVisible();
        await expect(page).toHaveScreenshot(
          `${scenario.name}-${viewport.width}x${viewport.height}.png`,
        );
      });
    }
  });
}
