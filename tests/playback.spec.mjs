import {test,expect} from '@playwright/test';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const target=process.env.TEST_URL||pathToFileURL(resolve('dist/index.html')).href;
async function open(page){await page.clock.install();await page.goto(target);await expect(page.locator('#clock')).toHaveText('9:30');}
const seek=(page,value)=>page.getByRole('slider',{name:'Time of day'}).evaluate((el,value)=>{el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));},String(value));
const current=page=>page.locator('#t').inputValue().then(Number);
for(const [speed,minutes] of [['Slow',3],['Normal',6],['Fast',12]]){
  test(`${speed} advances the clock and moves a courier`,async({page})=>{
    await open(page);
    await seek(page,600);
    await page.getByRole('button',{name:speed,exact:true}).click();
    const before=await page.evaluate(()=>C[0].mk.getLatLng());
    await page.getByRole('button',{name:'Play',exact:true}).click();
    await page.clock.runFor(1000);
    expect(await current(page)).toBeCloseTo(600+minutes,0);
    const after=await page.evaluate(()=>C[0].mk.getLatLng());
    expect(after).not.toEqual(before);
  });
}
test('pause stops time and resume does not include paused time',async({page})=>{
 await open(page);await page.getByRole('button',{name:'Play',exact:true}).click();await page.clock.runFor(1000);
 await page.getByRole('button',{name:'Pause',exact:true}).click();const paused=await current(page);await page.clock.runFor(5000);expect(await current(page)).toBe(paused);
 await page.getByRole('button',{name:'Play',exact:true}).click();await page.clock.runFor(1000);expect(await current(page)).toBeCloseTo(paused+6,0);
});
test('completion, rewind and replay stay synchronized',async({page})=>{
 await open(page);await seek(page,724.75);await page.getByRole('button',{name:'Play',exact:true}).click();await page.clock.runFor(100);
 await expect(page.getByRole('button',{name:'Replay',exact:true})).toBeVisible();expect(await current(page)).toBe(725);
 await seek(page,600);await expect(page.getByRole('button',{name:'Play',exact:true})).toBeVisible();
 await seek(page,725);await page.getByRole('button',{name:'Replay',exact:true}).click();await page.clock.runFor(500);expect(await current(page)).toBeLessThan(580);
});
test('120 Hz frames preserve fractional progress',async({page})=>{
 await open(page);
 await page.evaluate(()=>{
  let pending=new Map(),id=0;
  window.requestAnimationFrame=fn=>{pending.set(++id,fn);return id};
  window.cancelAnimationFrame=id=>pending.delete(id);
  window.advanceFrames=()=>{for(let i=0;i<=120;i++){const frame=[...pending.values()];pending.clear();frame.forEach(fn=>fn(i*1000/120));}};
 });
 await page.getByRole('button',{name:'Play',exact:true}).click();await page.evaluate(()=>window.advanceFrames());expect(await current(page)).toBeCloseTo(576,0);
});
test('mobile play works and controls remain within the viewport',async({page})=>{
 await page.setViewportSize({width:390,height:844});await open(page);await page.getByRole('button',{name:'Play',exact:true}).click();await page.clock.runFor(1000);expect(await current(page)).toBeGreaterThan(575);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
