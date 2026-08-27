/** @type {import('@playwright/test').PlaywrightTestConfig} */
export default {
  testDir: './e2e',
  timeout: 180_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.FRONTEND_URL || 'http://localhost:5173',
    headless: process.env.PW_HEADLESS !== 'false',
    viewport: { width: 1280, height: 900 },
    actionTimeout: 30_000,
    navigationTimeout: 45_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    launchOptions: {
      slowMo: Number(process.env.DEMO_SLOW_MO || 0),
    },
  },
};
