import { page, login, errors, BASE } from './drive.mjs';
const SHOTDIR = process.env.SHOTDIR;
await login(); await page.waitForTimeout(1500);
await page.click('#radix-_r_h_'); await page.waitForTimeout(1000);
await page.locator('text=Language').last().click(); await page.waitForTimeout(1000);
await page.locator('text=中文（中国）').click(); await page.waitForTimeout(5000);
await page.keyboard.press('Escape'); await page.waitForTimeout(2000);

const id = process.env.RECORD_ID;
await page.goto(`${BASE}/_console/apps/clm/clm_contract/${id}`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(9000);
const TABS = ['概要','版本','审查与偏离','审批记录','履约与收付款','签署与归档','讨论'];
for (const t of TABS) {
  await page.locator(`[role=tab]:has-text("${t}"), button:has-text("${t}")`).first().click().catch(async () => {
    await page.locator(`text=${t}`).first().click();
  });
  await page.waitForTimeout(6000);
  await page.screenshot({ path: `${SHOTDIR}/40-tab-${TABS.indexOf(t)}.png` });
  const txt = await page.evaluate(() => {
    const el = document.body;
    const t = el.innerText; const i = t.indexOf("讨论"); return i>0 ? t.slice(i+2) : t;
  });
  console.log(`\n########## TAB ${t}\n${txt.slice(0, 1400)}`);
}
console.log('\nERRORS:', JSON.stringify([...new Set(errors)].slice(0,8)));
process.exit(0);
