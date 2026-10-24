// Run fixtures on 4194 (original) and 4192 (optimized), then run this script.
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.connectOverCDP(process.env.BROWSER_CDP||'http://localhost:9225');
const id='11111111-1111-4111-8111-111111111111';
const reports=[];
for(const [name,port] of [['before',4194],['after',4192]]){
 const context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage();
 await page.route('https://**/*',route=>route.abort());
 await page.clock.install();
 const stats=()=>fetch(`http://localhost:${port+1}/__stats`).then(r=>r.json());
 await fetch(`http://localhost:${port+1}/__reset`);
 await page.goto(`http://localhost:${port}/#/biens`);
 await page.locator('.card img').first().waitFor();
 await page.waitForTimeout(900);
 const initial=await stats();
 await page.clock.fastForward(31000);await page.waitForTimeout(900);
 const refresh=await stats();
 await page.evaluate(id=>{location.hash='#/bien/'+id;},id);
 await page.locator('.gallery img').first().waitFor();await page.waitForTimeout(900);
 const detail=await stats();
 await page.locator('.gallery img').first().click();
 await page.locator('.lightbox-image').waitFor();
 await page.keyboard.press('ArrowRight');assert.equal(await page.locator('.lightbox-count').textContent(),'2 / 20');
 await page.keyboard.press('Escape');assert.equal(await page.locator('.property-lightbox').count(),0);
 if(name==='after'){
  assert.equal(initial.signs.length,2);assert.equal(initial.images.length,2);
  assert.equal(refresh.signs.length,2);assert.equal(refresh.images.length,2);
  assert.equal(detail.signs.length,21); // 2 covers + 19 remaining photos for A
  assert.equal(detail.signs.filter(path=>path.startsWith('22222222-2222-4222-8222-222222222222/33333333')).length,1);
  assert.ok(detail.images.length<22,'off-screen gallery photos stay lazy');
  await page.clock.fastForward(31000);await page.waitForTimeout(300);
  assert.equal((await stats()).signs.length,21);
  await page.evaluate(()=>{location.hash='#/biens';});await page.locator('.card img').first().waitFor();await page.waitForTimeout(300);
  assert.equal((await stats()).signs.length,21);
  await page.locator('#property-search').fill('no matching listing');
  await page.getByText('Aucun bien ne correspond à votre recherche.').waitFor();
  await page.setViewportSize({width:390,height:844});await page.locator('#property-search').fill('');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:'work/image-loading-mobile.png',fullPage:true});
  await page.evaluate(()=>document.activeElement.blur());
  await page.evaluate(()=>{location.hash='#/';});await page.locator('.hero').waitFor();
  await page.waitForTimeout(300);
  await page.evaluate(()=>{location.hash='#/bien/'+ '11111111-1111-4111-8111-111111111111';});
  await page.locator('.gallery img').first().waitFor();
  await page.waitForFunction(()=>document.querySelector('.gallery img')?.naturalWidth>0);
  assert.equal((await stats()).signs.length,21,'cached detail navigation does not re-sign');
  await page.route('**/api/cms?action=public',route=>route.fulfill({status:503,json:{error:'Temporary failure'}}));
  await page.evaluate(()=>{location.hash='#/biens';});await page.locator('#cms-retry').waitFor();
  await page.route('**/api/cms?action=public',route=>route.fulfill({status:200,json:{properties:[]}}));
  await page.locator('#cms-retry').click();await page.getByText('Aucun bien ne correspond à votre recherche.').waitFor();
 }
 reports.push({name,listing:{signed:initial.signs.length,downloaded:initial.images.length},refresh:{additionalSigned:refresh.signs.length-initial.signs.length,additionalDownloads:refresh.images.length-initial.images.length},detail:{additionalSigned:detail.signs.length-refresh.signs.length,additionalDownloads:detail.images.length-refresh.images.length}});
 await context.close();
}
// A fresh homepage must not even request cover URLs for its below-fold cards.
const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage(),coverRequests=[];
await page.route('https://**/*',route=>route.abort());
page.on('request',request=>{if(request.url().includes('action=covers'))coverRequests.push(request.url());});
await page.goto('http://localhost:4192/');await page.locator('.card').first().waitFor();await page.waitForTimeout(400);
assert.equal(coverRequests.length,0);
await page.locator('.card').first().scrollIntoViewIfNeeded();await page.waitForTimeout(400);
assert.ok(coverRequests.length>0);assert.ok(coverRequests.every(url=>!url.includes('action=property')));
await context.close();
console.log(JSON.stringify(reports,null,2));
await browser.close();
