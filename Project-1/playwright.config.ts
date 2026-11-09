import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.test.ts",
  testIgnore: ["**/scraper.test.ts", "**/import-export.test.ts"], // handled by vitest
  timeout: 30000,
  use: {
    baseURL: "http://localhost:3000",
    channel: "msedge",
    headless: true,
    viewport: { width: 1440, height: 900 },
  },
  projects: [
    {
      name: "msedge",
      use: {
        channel: "msedge",
      },
    },
  ],
});

