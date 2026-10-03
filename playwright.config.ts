import { defineConfig } from '@playwright/test'
import { existsSync } from 'node:fs'
const deployedURL = process.env.PLAYWRIGHT_BASE_URL
export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: deployedURL ?? 'http://127.0.0.1:4173/mucho-cash-helper/',
    viewport: { width: 390, height: 844 },
    colorScheme: 'light',
    launchOptions: existsSync('/usr/bin/chromium')
      ? { executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] }
      : {},
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: deployedURL
    ? undefined
    : {
        command: 'npm run preview -- --host 127.0.0.1 --port 4173',
        url: 'http://127.0.0.1:4173/mucho-cash-helper/',
        reuseExistingServer: !process.env.CI,
      },
})
