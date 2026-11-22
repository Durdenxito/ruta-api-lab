import { defineConfig } from '@playwright/test';
export default defineConfig({ testDir: './tests', use: { baseURL: process.env.API_BASE_URL || 'http://127.0.0.1:4190' }, webServer: process.env.API_BASE_URL ? undefined : { command: 'npm run dev', url: 'http://127.0.0.1:4190/api/health' }, reporter: [['list'], ['html',{open:'never'}],['json',{outputFile:'artifacts/results.json'}]] });
