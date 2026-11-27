import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/activation-browser",
  outputDir: "./test-results/activation",
  forbidOnly: true,
  workers: 2,
  timeout: 60_000,
  retries: 0,
  reporter: "list",
  use: { baseURL: "http://127.0.0.1:4175", trace: "retain-on-failure" },
  webServer: {
    command: "pnpm exec vite --config tests/activation-browser/vite.config.ts --host 127.0.0.1 --port 4175 --strictPort",
    url: "http://127.0.0.1:4175",
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    { name: "chromium", testMatch: "**/*.desktop.spec.ts", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", testMatch: "**/*.desktop.spec.ts", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", testMatch: "**/*.desktop.spec.ts", use: { ...devices["Desktop Safari"] } },
    { name: "mobile-chrome", testMatch: "**/*.touch.spec.ts", use: { ...devices["Pixel 7"] } },
    { name: "mobile-safari", testMatch: "**/*.touch.spec.ts", use: { ...devices["iPhone 15"] } },
  ],
});
