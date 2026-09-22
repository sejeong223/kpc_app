import { defineConfig } from "@playwright/test";

const referenceUrl = process.env.KPC_REFERENCE_URL ?? "http://127.0.0.1:3001";
const targetUrl = process.env.KPC_TARGET_URL ?? "http://127.0.0.1:3000";

export default defineConfig({
  testDir: "./tests/visual",
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: "list",
  snapshotPathTemplate: "{testDir}/{testFilePath}-snapshots/{arg}{ext}",
  expect: {
    toHaveScreenshot: {
      animations: "disabled",
      caret: "hide",
      maxDiffPixelRatio: 0.005,
    },
  },
  use: {
    browserName: "chromium",
    deviceScaleFactor: 1,
    colorScheme: "light",
    locale: "ko-KR",
    timezoneId: "Asia/Seoul",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "reference",
      use: { baseURL: referenceUrl },
    },
    {
      name: "target",
      use: { baseURL: targetUrl },
    },
  ],
});