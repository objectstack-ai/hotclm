import { page, login, errors } from './drive.mjs';
await login(); await page.waitForTimeout(1500);
// open the avatar menu
await page.click('#radix-_r_h_').catch(async () => { await page.click('button:has-text("DA")'); });
await page.waitForTimeout(1500);
console.log('--- MENU ---');
console.log((await page.evaluate(() => document.body.innerText)).split('\n').slice(-40).join('\n'));
const items = await page.evaluate(() => [...document.querySelectorAll('[role=menuitem],[role=menuitemradio],[role=option]')].map(e => (e.innerText||'').trim()));
console.log('MENU ITEMS:', JSON.stringify(items));
await page.screenshot({ path: process.env.SHOT });
process.exit(0);
