import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir:"./tests/e2e",testMatch:"admin-*.spec.ts",fullyParallel:false,workers:1,retries:0,
  forbidOnly:Boolean(process.env.CI),timeout:60_000,expect:{timeout:10_000},
  reporter:[["list"],["html",{open:"never"}],["json",{outputFile:"test-results/admin-review.json"}]],
  use:{browserName:"chromium",headless:true,baseURL:"http://127.0.0.1:3190",viewport:{width:1440,height:900},acceptDownloads:true,trace:"retain-on-failure",screenshot:"only-on-failure"},
  webServer:{command:"npm run start -- --port 3190 --hostname 127.0.0.1",url:"http://127.0.0.1:3190/workspace/skills",env:{AUTH_ENABLED:"false"},reuseExistingServer:false,timeout:60_000},
});
