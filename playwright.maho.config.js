const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests/e2e",
  timeout: 30000,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: "line",
  outputDir: ".test-results/maho-browser",
  use: {
    baseURL: process.env.BASICRUM_TEST_BASE_URL || "http://127.0.0.1:8080",
    browserName: "chromium",
    headless: true,
    trace: "retain-on-failure"
  }
});
