import { page, login, BASE } from './drive.mjs';
await login(); await page.waitForTimeout(2000);
for (const p of ['/_console/apps/clm','/_console/apps/clm/clm_contract','/_console/apps/clm/o/clm_contract','/_console/apps/clm/object/clm_contract','/_console/apps/clm/view/clm_contract','/_console/apps/clm/dashboard/legal_workbench']) {
  await page.goto(`${BASE}${p}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4500);
  const t = (await page.evaluate(() => document.body.innerText)).replace(/\s+/g,' ').slice(0, 140);
  console.log(`${p}\n   -> ${page.url()}\n   :: ${t}\n`);
}
process.exit(0);
