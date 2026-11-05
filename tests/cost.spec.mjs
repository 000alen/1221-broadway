import {test,expect} from '@playwright/test';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';

const target=process.env.TEST_URL||pathToFileURL(resolve('dist/index.html')).href;
const ready=page=>expect(page.locator('#analysisStatus')).toHaveText('Estimates up to date',{timeout:30000});

test('pay controls update costs and survive a shared scenario',async({page})=>{
 await page.goto(target);await ready(page);
 const baseline=await page.locator('#costPerOrder').textContent();
 await page.locator('#longRoutePay').fill('100');
 await page.locator('#standbyPay').fill('25');
 await page.locator('#wageCity').selectOption('oakland');
 await ready(page);
 await expect(page.locator('#costPerOrder')).not.toHaveText(baseline);
 const before=await page.evaluate(()=>window.__simulation.getState().summary.cost);
 const link=await page.evaluate(()=>window.__simulation.getScenarioLink());
 await page.goto(link);await ready(page);
 await expect(page.locator('#longRoutePay')).toHaveValue('100');
 await expect(page.locator('#standbyPay')).toHaveValue('25');
 await expect(page.locator('#wageCity')).toHaveValue('oakland');
 expect(await page.evaluate(()=>window.__simulation.getState().summary.cost)).toEqual(before);
 const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#export').click()]);
 const {readFile}=await import('node:fs/promises');
 const report=await readFile(await download.path(),'utf8');
 expect(report).toContain('Labor cost per order (average)');
 expect(report).toContain('"standbyPay":25');
});

test('vehicle capacity is linked, responds to inputs, and fits small screens',async({page})=>{
 await page.goto(target);await ready(page);
 const href=await page.getByRole('link',{name:'Vehicle capacity'}).getAttribute('href');
 await page.goto(new URL(href,page.url()).href);
 await expect(page.locator('#mBest')).toHaveText('Minivan');
 await page.locator('#carrierMeals').fill('30');
 await expect(page.locator('#mBest')).toHaveText('Hatchback');
 for(const width of [390,768,1280]){
  await page.setViewportSize({width,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }
 const back=page.getByRole('link',{name:'Back to the route simulation'});
 const backURL=new URL(await back.getAttribute('href'),page.url());
 expect(backURL.href).toBe(new URL('./',target).href);
 // File viewers show directory listings; deployed HTTP servers resolve index.html.
 if(backURL.protocol==='file:')await page.goto(new URL('index.html',backURL).href);
 else await back.click();
 await ready(page);
});
