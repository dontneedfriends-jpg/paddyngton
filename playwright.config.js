import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  expect: {
    timeout: 5000
  },
  
  use: {
    browserName: 'chromium',
    channel: 'electron',
  },
  
  projects: [
    {
      name: 'electron',
      use: { 
        ...devices['Desktop Chrome'],
        channel: 'electron'
      },
    },
  ],
});