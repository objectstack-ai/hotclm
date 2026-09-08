import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const BASE = `http://localhost:${process.env.PORT ?? '4312'}`;
export const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
export const ctx = await browser.newContext({ viewport: { width: 1680, height: 1050 } });
export const page = await ctx.newPage();
export const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 220)); });
page.on('pageerror', (e) => errors.push('PAGEERROR ' + String(e).slice(0, 220)));
export async function login() {
  await page.goto(`${BASE}/_console/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  if (page.url().includes('/login')) {
    await page.fill('input[type="email"], input[name="email"]', 'admin@objectos.ai');
    await page.fill('input[type="password"], input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(6000);
  }
  return page.url();
}
export { BASE };
