import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {launchTestBrowser,startTestServer} from '../helpers/browser.mjs';
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function waitFor(check){const end=Date.now()+30000;while(!await check()){if(Date.now()>end)throw Error('Offline suspension browser condition timed out');await delay(50)}}
test('published app policy skips old saves, background absence and reload without a Worker',{skip:!process.env.BROWSER_BINARY,timeout:90000},async t=>{
 const site=await startTestServer(),browser=await launchTestBrowser(process.env.BROWSER_BINARY,{disableSandbox:process.env.BROWSER_NO_SANDBOX==='1'}),p=await browser.page();
 t.after(async()=>{try{await p.evaluate('window.testSession?.session?.release()')}catch{}p.close();await browser.close();await site.close()});
 const errors=[];p.on('Runtime.exceptionThrown',e=>errors.push(e.exceptionDetails.exception?.description||e.exceptionDetails.text));
 await p.command('Page.enable');await p.command('Runtime.enable');await p.command('Emulation.setDeviceMetricsOverride',{width:844,height:390,deviceScaleFactor:1,mobile:true});
 await p.command('Page.addScriptToEvaluateOnNewDocument',{source:'window.offlineWorkerStarts=0;const NativeWorker=window.Worker;window.Worker=class extends NativeWorker{constructor(url,...args){if(String(url).includes("offline-worker")){window.offlineWorkerStarts++;throw Error("Offline Worker must stay disabled")}super(url,...args)}}'});
 await p.command('Page.navigate',{url:site.url+'/full/data.mjs'});await waitFor(()=>p.evaluate('document.readyState==="complete"&&location.pathname==="/full/data.mjs"'));
 const original=await p.evaluate('(async()=>{const E=await import("/full/engine.mjs"),R=await import("/full/roster.mjs"),S=await import("/full/storage.mjs"),lease=await S.acquireSession(),r=R.fromSolo(E.createGame("knight","暫停離線測試",undefined,941));for(const [i,classId]of ["elf","mage","darkelf"].entries())R.createMember(r,{classId,name:"Synthetic "+i,seed:942+i});await S.writeRoster(r,0,Date.now()-7*86400000);await lease.release();return{ids:r.simulation.members.map(m=>m.state.id),xp:r.simulation.members.map(m=>m.state.player.totalXP),clock:r.simulation.clockMs}})()');
 const observe='(async()=>{const {GameSession}=await import("/full/session.mjs"),tick=GameSession.prototype.tick;GameSession.prototype.tick=function(...args){window.testSession=this;return tick.apply(this,args)}})()';
 async function open(){await p.command('Page.navigate',{url:site.url+'/full/'});await waitFor(()=>p.evaluate('document.querySelector("#loading")?.hidden&&document.querySelector("#heroName")?.textContent==="暫停離線測試"'));await p.evaluate(observe);await waitFor(()=>p.evaluate('!!window.testSession'));assert.equal(await p.evaluate('document.querySelector("#panel").open'),false);assert.equal(await p.evaluate('window.offlineWorkerStarts'),0);assert.equal(await p.evaluate('window.testSession.catchUpEnabled'),false)}
 await open();
 const loaded=await p.evaluate('({ids:testSession.roster.simulation.members.map(m=>m.state.id),xp:testSession.roster.simulation.members.map(m=>m.state.player.totalXP),clock:testSession.roster.simulation.clockMs,report:testSession.report,phase:testSession.phase})');
 assert.deepEqual(loaded.ids,original.ids);assert.deepEqual(loaded.xp,original.xp);assert(loaded.clock-original.clock<10000);assert.equal(loaded.report,null);assert.equal(loaded.phase,'ready');
 await waitFor(()=>p.evaluate('testSession.roster.simulation.members.every(m=>m.state.clockMs>0)'));
 await p.evaluate('document.querySelector("#hotbar [data-use=ITEM-RED-POTION]").click()');await waitFor(()=>p.evaluate('!testSession.busy&&testSession.state.inventory.stacks["ITEM-RED-POTION"]===99'));
 const before=await p.evaluate('testSession.roster.simulation.clockMs');
 await p.evaluate('testSession.stateWallAt-=3*86400000;document.dispatchEvent(new Event("visibilitychange"))');
 await waitFor(()=>p.evaluate('testSession.phase==="ready"&&!testSession.busy&&Math.abs(Date.now()-testSession.stateWallAt)<1000'));
 assert(await p.evaluate('testSession.roster.simulation.clockMs')-before<10000);assert.equal(await p.evaluate('window.offlineWorkerStarts'),0);assert.equal(await p.evaluate('testSession.report'),null);
 await p.evaluate('document.querySelector("#autoState").click()');assert.match(await p.evaluate('document.querySelector("#panelBody").textContent'),/離線結算暫停/);await p.evaluate('document.querySelector("[data-action=close]").click()');
 await p.evaluate('(async()=>{await testSession.checkpoint();testSession.busy=true;await testSession.session.release()})()');await open();
 assert.equal(await p.evaluate('testSession.state.inventory.stacks["ITEM-RED-POTION"]'),99);assert.equal(await p.evaluate('testSession.listCharacters().length'),4);assert.equal(await p.evaluate('testSession.report'),null);assert.deepEqual(errors,[]);
 await mkdir('reports/offline-suspended',{recursive:true});await writeFile('reports/offline-suspended/browser.json',JSON.stringify({browser:(await p.command('Browser.getVersion')).product,actualPhone:false,syntheticSave:true,checks:['seven-day-four-character-save-opens','zero-offline-workers','no-offline-report','all-four-foreground-clocks-advance','normal-command-persists','synthetic-background-return-skips-gap','pause-notice','reload-retains-earned-progress'],errors},null,2));
});
