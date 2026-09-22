import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './test/e2e',
  timeout: 30000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:4000/api/v1',
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
  },
  webServer: {
    command: 'pnpm --filter @syncboard/api run start',
    url: 'http://localhost:4000/api/v1/workspaces',
    reuseExistingServer: true,
    timeout: 30000,
    ignoreHTTPSErrors: true,
  },
});
