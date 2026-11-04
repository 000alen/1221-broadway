import {test,expect} from '@playwright/test';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const target=process.env.TEST_URL||pathToFileURL(resolve('dist/index.html')).href;
const ready=page=>expect(page.locator('#analysisStatus')).toHaveText('Estimates up to date',{timeout:30000});
async function open(page){await page.clock.install();await page.goto(target);await ready(page);}
const state=page=>page.evaluate(()=>{const {config,summary,clock,view,speed,day}=window.__simulation.getState();return{config,summary,clock,view,speed,deliveries:day.deliveries};});

test('versioned fragment restores the same inputs, sampled results, deliveries and playhead',async({page})=>{
 await open(page);
 await page.locator('#runners').fill('4');await page.locator('#elevators').fill('2');await page.locator('#orders').fill('240');await page.locator('#callout').selectOption('courier');await page.locator('#failedCourier').selectOption('3');await page.locator('#runnerAssist').check();await page.clock.runFor(300);await ready(page);
 await page.locator('#newDay').click();await ready(page);
 await page.locator('#speed').selectOption('12');await page.getByRole('button',{name:'East Bay',exact:true}).click();await page.evaluate(()=>window.__simulation.setTime(701.25));
 const before=await state(page),link=await page.evaluate(()=>window.__simulation.getScenarioLink());
 expect(link).toContain('/scenarios/');expect(link).toContain('#scenario=1');expect(new URL(link).search).toBe('');
 await page.goto(link);await ready(page);expect(await state(page)).toEqual(before);
 await expect(page.getByRole('button',{name:'Play',exact:true})).toBeVisible();await expect(page.locator('#runners')).toHaveValue('4');await expect(page.getByRole('button',{name:'East Bay',exact:true})).toHaveAttribute('aria-pressed','true');
});
test('copy action writes a complete permalink and pauses playback',async({page})=>{
 await page.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.copiedScenario=text;}}}));
 await open(page);await page.getByRole('button',{name:'Play',exact:true}).click();await page.clock.runFor(1000);await page.locator('#share').click();
 await expect(page.locator('#share')).toHaveText('Link copied');const link=await page.evaluate(()=>window.copiedScenario);expect(link).toBe(await page.evaluate(()=>window.__simulation.getScenarioLink()));await expect(page.getByRole('button',{name:'Play',exact:true})).toBeVisible();
});
test('clipboard denial offers a keyboard-accessible manual copy dialog',async({page})=>{
 await page.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw Error('Denied');}}}));
 await open(page);await page.locator('#share').click();await expect(page.getByRole('dialog')).toBeVisible();await expect(page.locator('#shareLink')).toBeFocused();expect(await page.locator('#shareLink').inputValue()).toContain('#scenario=1');await page.locator('#shareLink').press('Escape');await expect(page.getByRole('dialog')).toBeHidden();
});
test('malformed fragments are reported and cannot change the model',async({page})=>{
 await open(page);const link=await page.evaluate(()=>window.__simulation.getScenarioLink());await page.goto(link+'&orders=999999');await ready(page);await expect(page.locator('#scenarioNotice')).toBeVisible();await expect(page.locator('#scenarioNotice')).toContainText('default plan');expect((await state(page)).config.orders).toBe(200);
});
test('hash navigation in an open tab restores its own scenario without stale estimates',async({page})=>{
 await open(page);const firstLink=await page.evaluate(()=>window.__simulation.getScenarioLink()),first=await state(page);
 await page.locator('#towerMode').selectOption('lobby');await page.clock.runFor(300);await ready(page);await page.evaluate(()=>window.__simulation.setTime(720));const secondLink=await page.evaluate(()=>window.__simulation.getScenarioLink()),second=await state(page);
 await page.goto(firstLink);await ready(page);expect(await state(page)).toEqual(first);
 await page.evaluate(link=>{location.hash=new URL(link).hash;},secondLink);await ready(page);await expect.poll(async()=>(await state(page)).config.towerMode).toBe('lobby');expect(await state(page)).toEqual(second);
});
