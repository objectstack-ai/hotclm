import { page, login } from './drive.mjs';
await login(); await page.waitForTimeout(1500);
await page.click('#radix-_r_h_'); await page.waitForTimeout(1200);
// The "Language" row is a submenu trigger
const langs = page.locator('text=Language').last();
await langs.hover().catch(()=>{});
await langs.click().catch(()=>{});
await page.waitForTimeout(1500);
console.log('--- after Language click ---');
console.log((await page.evaluate(() => document.body.innerText)).split('\n').slice(-30).join('\n'));
const opts = await page.evaluate(() => [...document.querySelectorAll('[role=menuitem],[role=menuitemradio],[role=option],[data-radix-collection-item]')].map(e => (e.innerText||'').trim()).filter(Boolean));
console.log('OPTIONS:', JSON.stringify(opts));
await page.screenshot({ path: process.env.SHOT });
process.exit(0);
