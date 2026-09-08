import { page, login, BASE } from './drive.mjs';
await login(); await page.waitForTimeout(2500);   // default locale = en
await page.goto(`${BASE}/_console/apps/clm/clm_contract/${process.env.RECORD_ID}`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(10000);
await page.screenshot({ path: `${process.env.SHOTDIR}/50-record-en.png` });
const t = await page.evaluate(() => document.body.innerText);
console.log(t.slice(t.indexOf('Parties'), t.indexOf('Parties') + 1400));
console.log('\n--- RAW-KEY LABELS PRESENT? ---');
console.log(['OUR_ENTITY','TERM_MONTHS','DEPARTMENT','CURRENCY_CODE','LIABILITY_CAP'].map(k => `${k}: ${t.includes(k)}`).join('  '));
process.exit(0);
