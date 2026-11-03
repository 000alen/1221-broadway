import {defineConfig} from '@playwright/test';
import {existsSync} from 'node:fs';
const chrome='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
export default defineConfig({
  testDir:'./tests',
  fullyParallel:true,
  workers:2,
  reporter:'list',
  use:{
    headless:true,
    launchOptions:{executablePath:process.env.CHROME_PATH||(existsSync(chrome)?chrome:undefined)},
  },
});
