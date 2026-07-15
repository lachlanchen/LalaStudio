import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";

const here = path.dirname(fileURLToPath(import.meta.url));
const baseURL = process.env.LALA_STUDIO_E2E_URL || "http://127.0.0.1:4312";

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: ".playwright/results",
  reporter: [["list"], ["html", { outputFolder: ".playwright/report", open: "never" }]],
  timeout: 30_000,
  expect: { timeout: 12_000 },
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure"
  },
  webServer: {
    command: "npm run start",
    url: `${baseURL}/api/health`,
    reuseExistingServer: true,
    timeout: 30_000,
    env: {
      LALA_STUDIO_PROJECT_ROOT: path.join(here, "tests", "fixtures", "project")
    }
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], channel: "chrome", viewport: { width: 1440, height: 900 } }
    },
    {
      name: "mobile",
      use: { ...devices["Desktop Chrome"], channel: "chrome", viewport: { width: 390, height: 844 } }
    }
  ]
});
