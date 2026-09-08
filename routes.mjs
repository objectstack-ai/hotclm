import { page, login, BASE } from './drive.mjs';
await login(); await page.waitForTimeout(2000);
// The "HotCLM" app switcher in the header
await page.click('#radix-_r_c_').catch(()=>{});
await page.waitForTimeout(1500);
console.log('--- app switcher ---');
console.log((await page.evaluate(() => document.body.innerText)).split('\n').slice(-25).join('\n'));
const links = await page.evaluate(() => [...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href')).filter(h => h && !h.startsWith('http')).slice(0, 50));
console.log('LINKS:', JSON.stringify([...new Set(links)]));
process.exit(0);
