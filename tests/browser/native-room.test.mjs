import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {launchTestBrowser,startTestServer} from '../helpers/browser.mjs';
import {createSignalingServer} from '../../portable/signaling.mjs';

const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(check){for(let i=0;i<300;i++){if(await check())return;await delay(100);}throw Error('Browser condition timed out');}

test('two independent native browser profiles create, join, use an item, trade durably and leave through the actual game UI',{skip:!process.env.BROWSER_BINARY,timeout:120000},async t=>{
 const server=await startTestServer(),signal=createSignalingServer({allowedOrigins:[server.url]}),browsers=[],pages=[],errors=[];
 await new Promise(resolve=>signal.listen(0,'127.0.0.1',resolve));
 t.after(async()=>{for(const page of pages)page.close();for(const browser of browsers)await browser.close();await server.close();await new Promise(resolve=>signal.close(resolve));});
 const signalURL='http://127.0.0.1:'+signal.address().port+'/signal';
 async function create(name){
  const browser=await launchTestBrowser(process.env.BROWSER_BINARY,{disableSandbox:process.env.BROWSER_NO_SANDBOX==='1'});browsers.push(browser);
  const page=await browser.page();pages.push(page);page.on('Runtime.exceptionThrown',event=>errors.push(event.exceptionDetails.exception?.description||event.exceptionDetails.text));
  await page.command('Runtime.enable');await page.command('Page.enable');await page.command('Emulation.setDeviceMetricsOverride',{width:844,height:390,deviceScaleFactor:1,mobile:true});
  await page.command('Page.navigate',{url:server.url+'/full/'});
  await until(()=>page.evaluate('!!document.querySelector("[data-action=recommended]")'));
  await page.evaluate('document.querySelector("[data-action=recommended]").click();document.querySelector("#newName").value='+JSON.stringify(name)+';document.querySelector("[data-action=create]").click();document.querySelector("[data-action=confirmNew]").click()');
  await until(()=>page.evaluate('!document.querySelector("#panel").open&&document.querySelector("#loading").hidden'));
  return page;
 }
 async function openRoom(page){await page.evaluate('document.querySelector("#menus [data-panel=settings]").click();document.querySelector("[data-action=room]").click()');}
 const host=await create('合成房主'),guest=await create('合成家人');
 await openRoom(host);await host.evaluate('document.querySelector("#signalURL").value='+JSON.stringify(signalURL)+';document.querySelector("[data-action=hostRoom]").click()');
 await until(()=>host.evaluate('document.querySelector("#roomStatus")?.textContent.includes("共同冒險中")'));
 const code=await host.evaluate('document.querySelector("#roomStatus").textContent.match(/房號 ([A-F0-9]{12})/)[1]');
 await openRoom(guest);await guest.evaluate('document.querySelector("#signalURL").value='+JSON.stringify(signalURL)+';document.querySelector("#roomCode").value='+JSON.stringify(code)+';document.querySelector("[data-action=joinRoom]").click()');
 await until(()=>guest.evaluate('document.querySelector("#roomStatus")?.textContent.includes("2 / 10")'));
 assert.match(await host.evaluate('document.querySelector("#roomStatus").textContent'),/合成家人/);
 assert.match(await guest.evaluate('document.querySelector("#roomStatus").textContent'),/合成房主/);
 await guest.evaluate('document.querySelector("[data-action=close]").click();document.querySelector("#hotbar [data-use=ITEM-RED-POTION]").click()');
 await until(()=>guest.evaluate('document.querySelector("#redCount").textContent==="99"'));
 await until(()=>guest.evaluate('(async()=>{const s=await import("/full/storage.mjs");return(await s.readSave()).state.inventory.stacks["ITEM-RED-POTION"]===99})()'));
 const checkpoint=await guest.evaluate('(async()=>{const s=await import("/full/storage.mjs"),e=await s.readSave();return{sequence:e.room.sequence,count:e.state.inventory.stacks["ITEM-RED-POTION"],position:{map:e.state.player.map,x:e.state.player.x,y:e.state.player.y}}})()');
 assert(checkpoint.sequence>0);
 async function openTrade(page){await page.evaluate('document.querySelector("#panel[open] [data-action=close]")?.click();document.querySelector("#menus [data-panel=settings]").click();document.querySelector("[data-action=trade]").click()');}
 await openTrade(host);await until(()=>host.evaluate('!!document.querySelector("[data-trade-invite]")'));await host.evaluate('document.querySelector("[data-trade-invite]").click()');
 await until(()=>host.evaluate('!!document.querySelector("#tradeGold")'));await host.evaluate('const input=document.querySelector("#tradeGold");input.value="17";input.dispatchEvent(new Event("input",{bubbles:true}));document.querySelector("[data-trade-save]").click()');
 await until(()=>host.evaluate('document.querySelector("#tradeGold")?.value==="17"&&document.querySelector("#tradeEditHint")?.textContent.includes("尚未保存的輸入")'));await host.evaluate('document.querySelector("[data-trade-confirm]").click()');
 await until(()=>host.evaluate('document.querySelector("[data-trade-confirm]")?.disabled'));await openTrade(guest);await until(()=>guest.evaluate('!!document.querySelector("[data-trade-confirm]")&&document.querySelector("#panel").textContent.includes("金幣 17")'));await guest.evaluate('document.querySelector("[data-trade-confirm]").click()');
 const savedGold=page=>page.evaluate('(async()=>{const e=await(await import("/full/storage.mjs")).readSave();return{gold:e.state.player.gold,escrow:!!e.state.tradeEscrow,receipts:e.state.tradeReceipts?.length||0}})()');
 await until(async()=>{const a=await savedGold(host),b=await savedGold(guest);return a.gold===283&&b.gold===317&&!a.escrow&&!b.escrow&&a.receipts===1&&b.receipts===1});const trade={host:await savedGold(host),guest:await savedGold(guest)};
 await host.evaluate('document.querySelector("[data-action=close]").click()');await openRoom(host);
 await host.evaluate('document.querySelector("[data-action=leaveRoom]").click()');
 await until(()=>host.evaluate('!!document.querySelector("[data-action=hostRoom]")'));
 await until(()=>guest.evaluate('(async()=>{const s=await import("/full/storage.mjs");return !(await s.readSave()).room})()'));
 const final=await guest.evaluate('(async()=>{const s=await import("/full/storage.mjs"),e=await s.readSave();return{count:e.state.inventory.stacks["ITEM-RED-POTION"],position:{map:e.state.player.map,x:e.state.player.x,y:e.state.player.y}}})()');
 assert.equal(final.count,99);assert.deepEqual(final.position,checkpoint.position);assert.deepEqual(errors,[]);
 await mkdir('reports/native-room',{recursive:true});
 await writeFile('reports/native-room/result.json',JSON.stringify({browser:(await host.command('Browser.getVersion')).product,independentProfiles:2,actualGameUI:true,realWebRTC:true,realIndexedDB:true,actualPhone:false,checkpoint,trade,final,uncaughtErrors:errors},null,2));
});
