import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for athreei extension E2E tests
 *
 * Note: Chrome extension testing requires:
 * - headless: false (extensions don't work in headless mode)
 * - launchPersistentContext with extension loading args
 */
export default defineConfig({
  testDir: './tests',

  // Timeout for each test
  timeout: 30000,

  // Global setup/teardown timeout
  globalTimeout: 60000,

  // Expect timeout for assertions
  expect: {
    timeout: 5000,
  },

  // Run tests in files in parallel
  fullyParallel: false,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,

  // Reporter to use
  reporter: process.env.CI ? 'github' : 'list',

  // Shared settings for all the projects below
  use: {
    // Extensions require non-headless mode
    headless: false,

    // Base URL for page.goto()
    // baseURL: 'http://localhost:3000',

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'retain-on-failure',
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Extensions only work in Chromium
      },
    },

    // Note: Extensions are Chrome-specific, so we only test with Chromium
    // Firefox and WebKit don't support Chrome extensions
  ],

  // Run your local dev server before starting the tests
  // webServer: {
  //   command: 'bun run dev',
  //   url: 'http://localhost:5173',
  //   reuseExistingServer: !process.env.CI,
  // },
});
