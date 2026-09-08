import { page, login, BASE } from './drive.mjs';
await login(); await page.waitForTimeout(2000);
const trig = page.locator('header button:has-text("HotCLM"), [id^=radix]:has-text("HotCLM")').first();
await trig.click(); await page.waitForTimeout(1500);
const items = await page.evaluate(() => [...document.querySelectorAll('[role=menuitem],[role=menuitemradio],[data-radix-collection-item],a')]
  .map(e => ({ tag: e.tagName, role: e.getAttribute('role'), href: e.getAttribute('href'), t: (e.innerText||'').trim().slice(0,30) }))
  .filter(x => x.t && /HotCLM|Setup|应用/.test(x.t)));
console.log(JSON.stringify(items, null, 1));
process.exit(0);
