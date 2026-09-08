import { page, login, errors, BASE } from './drive.mjs';
const SHOTDIR = process.env.SHOTDIR;
const out = [];
async function visit(name, path, note, wait = 9000) {
  await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(wait);
  await page.screenshot({ path: `${SHOTDIR}/${name}.png` });
  out.push({ name, note, url: page.url(), text: await page.evaluate(() => document.body.innerText) });
}
await login(); await page.waitForTimeout(1500);
await page.click('#radix-_r_h_'); await page.waitForTimeout(1000);
await page.locator('text=Language').last().click(); await page.waitForTimeout(1000);
await page.locator('text=中文（中国）').click(); await page.waitForTimeout(5000);
await page.keyboard.press('Escape'); await page.waitForTimeout(2000);

await visit('10-shell',      '/_console/apps/clm',                         'app shell + navigation');
await visit('11-list',       '/_console/apps/clm/clm_contract',            'contract list view');
await visit('20-dash-legal', '/_console/apps/clm/dashboard/legal_workbench','dashboard 1/3');
await visit('21-dash-exec',  '/_console/apps/clm/dashboard/executive_overview','dashboard 2/3');
await visit('22-dash-fin',   '/_console/apps/clm/dashboard/finance_overview','dashboard 3/3');

console.log('CONSOLE ERRORS:', JSON.stringify([...new Set(errors)].slice(0, 8)));
for (const r of out) { console.log(`\n########## ${r.name} — ${r.note}\n# ${r.url}\n${r.text.slice(0, 2400)}`); }
process.exit(0);
