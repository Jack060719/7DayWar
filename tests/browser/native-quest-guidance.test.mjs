import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {launchTestBrowser,startTestServer} from '../helpers/browser.mjs';
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function waitFor(check){const end=Date.now()+30000;while(!await check()){if(Date.now()>end)throw Error('Quest browser condition timed out');await delay(100)}}
test('native quest marker, NPC navigation, accepted objective, cancellation and equipment banner',{skip:!process.env.BROWSER_BINARY,timeout:120000},async t=>{
 const site=await startTestServer(),browser=await launchTestBrowser(process.env.BROWSER_BINARY,{disableSandbox:process.env.BROWSER_NO_SANDBOX==='1'}),page=await browser.page();
 t.after(async()=>{try{await writeFile('reports/quest-guidance/browser-failure.json',JSON.stringify(await page.evaluate('({text:document.body.innerText,modal:document.querySelector("#panel")?.open,panel:document.querySelector("#panel")?.dataset.panel,state:window.testRenderer?.lastState?.player,ground:window.testRenderer?.lastState?.worlds[window.testRenderer.lastState.player.map].ground})'),null,2))}catch{}page.close();await browser.close();await site.close()});
 await mkdir('reports/quest-guidance',{recursive:true});
 const errors=[];page.on('Runtime.exceptionThrown',e=>errors.push(e.exceptionDetails.text));
 await page.command('Page.enable');await page.command('Runtime.enable');
 await page.command('Emulation.setDeviceMetricsOverride',{width:844,height:390,deviceScaleFactor:1,mobile:true});
 await page.command('Page.navigate',{url:site.url+'/full/data.mjs'});
 await waitFor(()=>page.evaluate('document.readyState==="complete"'));
 await page.evaluate('('+String(async function(){
  const {createGame,command,validate}=await import('/full/engine.mjs'),{NPCS}=await import('/full/data.mjs'),{addXP,xpAtLevel}=await import('/full/rules.mjs'),st=await import('/full/storage.mjs');
  const s=createGame('knight','任務引導測試',undefined,77),n=NPCS['NPC-SILVER-WARDEN'];addXP(s,xpAtLevel(15));
  Object.assign(s.player,{x:n.position_tiles[0]-6,y:n.position_tiles[1]+2});
  const gear=s.inventory.equipment[0];for(const slot of Object.keys(s.equipped))if(s.equipped[slot]===gear.uid)delete s.equipped[slot];gear.identified=false;
  command(s,{type:'drop',uid:gear.uid});s.player.y++;
  const check=validate(s);if(!check.ok)throw Error(check.errors.join(','));
  const lease=await st.acquireSession();await st.writeSave(s,0,Date.now());await lease.release();
 })+')()');
 await page.command('Page.navigate',{url:site.url+'/full/'});
 await waitFor(()=>page.evaluate('document.querySelector("#heroName")?.textContent==="任務引導測試"&&document.querySelector("#loading").hidden'));
 await page.evaluate('('+String(async function(){
  const {FullRenderer}=await import('/full/renderer.mjs'),draw=FullRenderer.prototype.draw,fill=CanvasRenderingContext2D.prototype.fillText;
  CanvasRenderingContext2D.prototype.fillText=function(text,...args){if(text==='!')window.questMarks++;return fill.call(this,text,...args)};
  FullRenderer.prototype.draw=function(...args){window.questMarks=0;window.testRenderer=this;return draw.apply(this,args)};
 })+')()');
 await waitFor(()=>page.evaluate('window.questMarks>0&&!!window.testRenderer'));
 if(await page.evaluate('document.querySelector("#panel").open&&document.querySelector("#panel").dataset.panel==="report"'))await page.evaluate('document.querySelector("[data-action=close]").click()');
 await waitFor(()=>page.evaluate('!document.querySelector("#panel").open'));
 await delay(500);
 const point=await page.evaluate('(()=>{const r=window.testRenderer,s=r.lastState,d=s.worlds[s.player.map].ground.find(d=>d.gear);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const q=r.screen(d.x+dx,d.y+dy);if(r.hit(s,q.x,q.y).kind==="groundItem"){const box=document.querySelector("#world").getBoundingClientRect(),point={x:q.x+box.left,y:q.y+box.top};if(document.elementFromPoint(point.x,point.y)?.id==="world")return point}}throw Error("No visible ground pickup point")})()');
 await page.command('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...point});await page.command('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...point});
 await waitFor(()=>page.evaluate('!!document.querySelector(".loot-banner")'));
 assert.match(await page.evaluate('document.querySelector(".loot-banner").textContent'),/^拾取裝備：未鑑定/);
 const banner=await page.evaluate('(()=>{const e=document.querySelector(".loot-banner"),r=e.getBoundingClientRect();return{width:r.width,height:r.height,bg:getComputedStyle(e).backgroundColor,pointer:getComputedStyle(e.parentElement).pointerEvents}})()');
 assert(banner.width>banner.height);assert.match(banner.bg,/rgba/);assert.equal(banner.pointer,'none');
 const shot=await page.command('Page.captureScreenshot',{format:'png'});await writeFile('reports/quest-guidance/marker-and-loot.png',Buffer.from(shot.data,'base64'));
 const click=selector=>page.evaluate('document.querySelector('+JSON.stringify(selector)+').click()');
 await click('#questTracker');assert.match(await page.evaluate('document.querySelector("#panelBody").textContent'),/目前可接任務.*銀騎士村/s);
 await click('[data-quest-route="QUEST-CLASS-KNIGHT-15"]');
 await waitFor(()=>page.evaluate('document.querySelector("#panel").open&&document.querySelector("[data-quest=QUEST-CLASS-KNIGHT-15]")'));
 await click('[data-quest="QUEST-CLASS-KNIGHT-15"]');
 await waitFor(()=>page.evaluate('document.querySelector("[data-abandon=QUEST-CLASS-KNIGHT-15]")&&window.questMarks===0'));
 await click('[data-quest-route="QUEST-CLASS-KNIGHT-15"]');
 await waitFor(()=>page.evaluate('document.querySelector("#questTracker").textContent.startsWith("停止尋路")&&window.testRenderer.lastState.player.path.length>0'));
 await click('#questTracker');await waitFor(()=>page.evaluate('!window.testRenderer.lastState.player.path.length&&!document.querySelector("#questTracker").textContent.startsWith("停止尋路")'));
 for(const [width,height]of[[844,390],[568,320]]){
  await page.command('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});await delay(150);
  const bounds=await page.evaluate('(()=>{const r=document.querySelector("#questTracker").getBoundingClientRect(),hot=document.querySelector("#hotbar").getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,hotTop:hot.top}})()');
  assert(bounds.left>=0&&bounds.top>=0&&bounds.right<=width&&bounds.bottom<bounds.hotTop);
 }
 await page.command('Page.reload');await waitFor(()=>page.evaluate('document.querySelector("#loading")?.hidden&&document.querySelector("#heroName")?.textContent==="任務引導測試"'));
 await click('#questTracker');assert(await page.evaluate('!!document.querySelector("[data-abandon=QUEST-CLASS-KNIGHT-15]")'));
 assert.equal(await page.evaluate('document.querySelectorAll(".loot-banner").length'),0);
 assert.deepEqual(errors,[]);
 await writeFile('reports/quest-guidance/browser.json',JSON.stringify({browser:(await page.command('Browser.getVersion')).product,actualPhone:false,syntheticSave:true,checks:['yellow-marker-eligible-only','equipment-pickup-banner','quest-giver-navigation','accepted-objective-navigation','cancel-navigation','small-landscape-layout','reload-preserves-quest-no-loot-replay'],errors},null,2));
});
