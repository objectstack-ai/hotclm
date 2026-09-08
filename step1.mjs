import { page, login, errors, BASE } from './drive.mjs';
console.log('after login:', await login());
await page.waitForTimeout(2000);
console.log('--- SHELL TEXT ---');
console.log((await page.evaluate(() => document.body.innerText)).slice(0, 2000));
console.log('--- buttons/menus with locale-ish labels ---');
const cands = await page.evaluate(() => [...document.querySelectorAll('button,[role=button],a')]
  .map(e => ({ t: (e.innerText||'').trim().slice(0,40), aria: e.getAttribute('aria-label'), id: e.id, cls: (e.className||'').toString().slice(0,50) }))
  .filter(x => x.t || x.aria).slice(0, 60));
console.log(JSON.stringify(cands, null, 0).slice(0, 3000));
console.log('--- errors:', errors.length, errors.slice(0,4).join(' | '));
await page.screenshot({ path: process.env.SHOT, fullPage: false });
process.exit(0);
