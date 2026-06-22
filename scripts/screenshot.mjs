import { chromium } from '@playwright/test';

const url = process.argv[2] ?? 'http://localhost:4173';
const out = process.argv[3] ?? 'shell.png';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(url, { waitUntil: 'networkidle' });
await page.screenshot({ path: out });
await browser.close();
console.log(`saved ${out}`);
