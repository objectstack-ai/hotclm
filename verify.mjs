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

await visit('20-dash-legal', '/_console/apps/clm/dashboard/legal_workbench', 'dashboard 1/3 legal');
await visit('21-dash-exec',  '/_console/apps/clm/dashboard/executive_overview', 'dashboard 2/3 executive');
await visit('22-dash-fin',   '/_console/apps/clm/dashboard/finance_overview', 'dashboard 3/3 finance');

// contract detail — pick an active contract id
const r = await page.evaluate(async () => (await fetch('/api/v1/data/clm_contract?$top=1', { headers: { accept: 'application/json' } })).json());
const id = r.records?.[0]?.id;
console.log('RECORD ID:', id, r.records?.[0]?.contract_number);
for (const tab of ['overview','versions','review','approvals','performance','signing','discussion']) {
  await visit(`30-tab-${tab}`, `/_console/apps/clm/clm_contract/${id}?tab=${tab}`, `contract detail tab: ${tab}`, 8000);
}
console.log('CONSOLE ERRORS:', JSON.stringify([...new Set(errors)].slice(0, 10)));
for (const o of out) { console.log(`\n########## ${o.name} — ${o.note}\n# ${o.url}\n${o.text.slice(0, 2600)}`); }
process.exit(0);
