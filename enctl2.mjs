import { page, login, BASE } from './drive.mjs';
await login(); await page.waitForTimeout(2500);
await page.goto(`${BASE}/_console/apps/clm/clm_contract/${process.env.RECORD_ID}`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(10000);
const t = await page.evaluate(() => document.body.innerText);
for (const probe of ['OUR SIGNING ENTITY','OUR_ENTITY','TERM (MONTHS)','TERM_MONTHS','REQUESTING DEPARTMENT','BALL IN COURT','CURRENT_TURN','LIABILITY CAP','AUTO-RENEWS','AUTO_RENEW'])
  console.log(`${t.includes(probe) ? 'PRESENT' : 'absent '}  ${probe}`);
// what CSS does the label carry?
const css = await page.evaluate(() => {
  const el = [...document.querySelectorAll('*')].find(e => (e.textContent||'').trim() === 'Our Signing Entity' || (e.innerText||'').trim() === 'OUR SIGNING ENTITY');
  return el ? { text: el.textContent, transform: getComputedStyle(el).textTransform, tag: el.tagName } : null;
});
console.log('label element:', JSON.stringify(css));
process.exit(0);
