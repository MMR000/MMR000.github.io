import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  timeout: 45000,
  workers: 2,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4173/mamyraltaibek.github.io/",
    browserName: "chromium",
    launchOptions: process.env.CHROME_PATH
      ? { executablePath: process.env.CHROME_PATH }
      : {},
  },
  webServer: {
    command: "npm run preview -- --port 4173",
    url: "http://127.0.0.1:4173/mamyraltaibek.github.io/",
    reuseExistingServer: true,
  },
});
