import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  reporter: "list",
  use: { baseURL: "http://127.0.0.1:3002", trace: "retain-on-failure", ...devices["Desktop Chrome"] },
  webServer: { command: "node scripts/start-preview.mjs", url: "http://127.0.0.1:3002", reuseExistingServer: !process.env.CI, timeout: 120_000 },
});
