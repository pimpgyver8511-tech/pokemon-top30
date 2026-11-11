// Browser-Tests der Seite (docs/). Lokal: cd tests && npm ci && npx playwright test
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: /.*\.spec\.mjs$/,
  timeout: 120_000,
  expect: { timeout: 20_000 },
  fullyParallel: true,
  workers: 2,
  // In GitHub einmal wiederholen: ein Test, der erst beim zweiten Mal grün ist, wird als "flaky" gemeldet
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["github"]] : [["list"]],
  use: {
    baseURL: "http://127.0.0.1:8899",
    serviceWorkers: "block",
    viewport: { width: 400, height: 900 },
    screenshot: "only-on-failure",
    trace: "off",
  },
  webServer: {
    command: "python3 -m http.server 8899 --bind 127.0.0.1 --directory ../docs",
    url: "http://127.0.0.1:8899/index.html",
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
