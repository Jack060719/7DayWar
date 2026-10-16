import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {launchTestBrowser, startTestServer} from '../helpers/browser.mjs';
import {createSignalingServer} from '../../portable/signaling.mjs';
const binary = process.env.BROWSER_BINARY;
const reportDir = path.resolve(process.env.BROWSER_REPORT_DIR || 'reports/native-ui-transport');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function waitFor(check, timeout = 30000) { const until = Date.now() + timeout; while (!await check()) { if (Date.now() > until) throw Error('Browser condition timed out'); await delay(100); } }
async function setup(t) {
  const site = await startTestServer(), browser = await launchTestBrowser(binary, {disableSandbox: process.env.BROWSER_NO_SANDBOX === '1'}), pages = [];
  t.after(async () => { for (const p of pages) p.close(); await browser.close(); await site.close(); });
  await mkdir(reportDir, {recursive: true});
  async function page(url = site.url + '/full/design-disclosure.json') { const p = await browser.page(); pages.push(p); await p.command('Page.enable'); await p.command('Page.navigate', {url}); await waitFor(() => p.evaluate('location.href === '+JSON.stringify(url)+' && document.readyState === "complete"')); return p; }
  return {site, browser, page};
}

test('native Chrome landscape HUD, long name, touch targets, scene space and building cache', {skip: !binary, timeout: 90000}, async t => {
  const {site, page} = await setup(t), p = await page(site.url + '/full/');
  const version = await p.command('Browser.getVersion'), shots = [];
  await waitFor(() => p.evaluate('!!document.querySelector("[data-action=recommended]")'));
  await p.evaluate('document.querySelector("[data-action=recommended]").click(); document.querySelector("#newName").value="天地玄黃宇宙洪荒日月盈昃辰宿列張寒來暑往"; document.querySelector("[data-action=create]").click(); document.querySelector("[data-action=confirmNew]").click()');
  await waitFor(() => p.evaluate('!document.querySelector("#panel").open && document.querySelector("#loading").hidden'));
  await delay(4000);
  for (const [width, height] of [[568, 320], [640, 360], [844, 390]]) {
    await p.command('Emulation.setDeviceMetricsOverride', {width, height, deviceScaleFactor: 1, mobile: true});
    await delay(400);
    const geometry = await p.evaluate('(() => { const rect = e => { const b=e.getBoundingClientRect?.()||e; return {x:b.x,y:b.y,width:b.width,height:b.height,right:b.right,bottom:b.bottom}; };const name=document.querySelector("#heroName"), range=document.createRange();range.selectNodeContents(name); return {width:innerWidth,height:innerHeight,name:name.textContent,nameBox:rect(name),nameText:[...range.getClientRects()].map(rect),nameOverflow:name.scrollWidth>name.clientWidth+1,world:rect(document.querySelector("#world")),identity:rect(document.querySelector("#identity")),auto:rect(document.querySelector("#autoState")),hotbar:rect(document.querySelector("#hotbar")),menus:rect(document.querySelector("#menus")),buttons:[...document.querySelectorAll("#character,#hotbar button,#menus button,#autoState")].map(rect)}; })()');
    assert.equal(geometry.name.length, 20); assert(!geometry.nameOverflow);
    for (const b of geometry.nameText) assert(b.x >= 0 && b.y >= 0 && b.right <= width && b.bottom <= height, 'name stays within the viewport');
    assert(geometry.world.width * geometry.world.height > width * height * .9, 'scene gains area from the removed fixed rails');
    assert(geometry.identity.y < height / 2 && geometry.identity.x < width / 2);
    assert(geometry.auto.y >= geometry.identity.bottom);
    assert(geometry.menus.bottom <= geometry.hotbar.y, 'right menu does not collide with the shortcut bar');
    for (const b of geometry.buttons) { assert(b.width >= 43.9 && b.height >= 43.9, 'touch targets remain at least 44px'); assert(b.x >= 0 && b.y >= 0 && b.right <= width && b.bottom <= height); }
    const screenshot = await p.command('Page.captureScreenshot', {format: 'png'}), file = width + 'x' + height + '.png';
    await writeFile(path.join(reportDir, file), Buffer.from(screenshot.data, 'base64')); shots.push({viewport: [width, height], file, geometry});
  }
  let safeArea;
  try {
    await p.command('Emulation.setSafeAreaInsetsOverride', {insets: {left: 44, right: 44, bottom: 21, top: 0}});
    await p.command('Emulation.setDeviceMetricsOverride', {width: 568, height: 320, deviceScaleFactor: 1, mobile: true}); await delay(300);
    safeArea = await p.evaluate('(() => {const box=id=>{const b=document.getElementById(id).getBoundingClientRect();return{x:b.x,y:b.y,right:b.right,bottom:b.bottom};};return {identity:box("identity"),hotbar:box("hotbar"),menus:box("menus"),world:box("world")};})()');
    for (const id of ['identity', 'hotbar', 'menus']) {assert(safeArea[id].x >= 44); assert(safeArea[id].right <= 524); assert(safeArea[id].bottom <= 299);}
    const screenshot = await p.command('Page.captureScreenshot', {format: 'png'}); await writeFile(path.join(reportDir, '568x320-safe-area.png'), Buffer.from(screenshot.data, 'base64'));
  } catch (error) { if (!error.message.includes("wasn't found")) throw error; safeArea = {unsupported: error.message}; }
  const cache = await p.evaluate('(async()=>{const {FullRenderer}=await import("/full/renderer.mjs");const canvas=document.createElement("canvas");canvas.width=600;canvas.height=320;const r=new FullRenderer(canvas),art={atlas:"world/structure-smith.png",rect:[0,0,320,260],anchor:[142,255]};await r.loadClip(art.atlas);const before=r.clipUsage.get(art.atlas).at;await new Promise(resolve=>setTimeout(resolve,10));r.drawArt(art,0,0);const ordinary=r.clipUsage.get(art.atlas).at;r.roofOcclusion=()=>({strength:.5,im:r.images.get(art.atlas),r:art.rect,size:{w:320,h:260},hero:{x:140,y:200},height:72,left:0,top:0});const fade=ordinary+10;r.drawStructure({art},null,null,fade);return {loaded:r.images.has(art.atlas),ordinaryRefreshed:ordinary>before,fadedRefreshed:r.clipUsage.get(art.atlas).at===fade};})()');
  assert.deepEqual(cache, {loaded:true,ordinaryRefreshed:true,fadedRefreshed:true});
  await writeFile(path.join(reportDir, 'ui.json'), JSON.stringify({browser: version.product, syntheticOnly: true, actualPhone: false, shots, safeArea, cache}, null, 2));
});

test('native WebRTC supports two then ten browser participants with ordered data and host termination', {skip: !binary, timeout: 120000}, async t => {
  const {site, page} = await setup(t), signal = createSignalingServer({allowedOrigins: [site.url]});
  await new Promise(resolve => signal.listen(0, '127.0.0.1', resolve)); t.after(() => new Promise(resolve => signal.close(resolve)));
  const signalURL = 'http://127.0.0.1:' + signal.address().port + '/signal', peers = [], errors = [];
  async function client() { const p = await page(); await p.evaluate('(async()=>{const {RoomTransport}=await import("/full/room-transport.mjs");window.messages=[];window.events=[];window.errors=[];window.roomCloses=[];window.transport=new RoomTransport({serverURL:'+JSON.stringify(signalURL)+',onMessage:(data,from)=>messages.push({data,from}),onPeer:event=>events.push(event),onError:error=>errors.push(error.message),onClose:reason=>roomCloses.push(reason)});})()'); peers.push(p); return p; }
  const host = await client(), room = await host.evaluate('transport.host()'), first = await client();
  await first.evaluate('transport.join('+JSON.stringify(room.code)+')');
  await waitFor(() => host.evaluate('transport.peers.length===1'));
  await host.evaluate('transport.broadcast({kind:"large",text:"家人".repeat(70000)})');
  await first.evaluate('transport.send({kind:"command",sequence:1})');
  await waitFor(async () => await host.evaluate('messages.length===1') && await first.evaluate('messages.length===1'));
  assert.equal(await first.evaluate('messages[0].data.text.length'), 140000);
  const twoPerson = {hostPeers:await host.evaluate('transport.peers.length'),guestPeers:await first.evaluate('transport.peers.length'),receivedCharacters:140000};
  for (let i = 0; i < 8; i++) { const guest = await client(); await guest.evaluate('transport.join('+JSON.stringify(room.code)+')'); }
  await waitFor(() => host.evaluate('transport.peers.length===9'), 45000);
  await host.evaluate('transport.broadcast({kind:"all-ten",sequence:2})');
  await waitFor(async () => (await Promise.all(peers.slice(1).map(p=>p.evaluate('messages.some(m=>m.data.kind==="all-ten")')))).every(Boolean));
  const tenthPeerCount = await host.evaluate('transport.peers.length');
  for (const guest of peers.slice(1)) await guest.evaluate('transport.send({kind:"ack-ten"})');
  await waitFor(() => host.evaluate('messages.filter(m=>m.data.kind==="ack-ten").length===9'));
  const stats = await host.evaluate('(async()=>{const rows=[];for(const row of transport._links.values()){const stats=await row.pc.getStats();for(const stat of stats.values())if(stat.type==="candidate-pair"&&stat.state==="succeeded")rows.push({state:stat.state,nominated:stat.nominated,bytesSent:stat.bytesSent,bytesReceived:stat.bytesReceived});}return rows;})()');
  for (const p of peers) errors.push(...await p.evaluate('errors'));
  assert.deepEqual(errors, []); assert(stats.length>=9);
  await host.evaluate('transport.close("test-complete")');
  await waitFor(async () => (await Promise.all(peers.slice(1).map(p=>p.evaluate('transport._closed&&roomCloses.length===1')))).every(Boolean));
  await writeFile(path.join(reportDir, 'transport.json'), JSON.stringify({syntheticOnly:true,realRTCPeerConnection:true,actualPhone:false,twoPerson,tenPerson:{members:1+tenthPeerCount,guestAcknowledgements:9},largeMessageCharacters:140000,stats,errors,hostTerminationClosedAllGuests:true},null,2));
});


test('native Chrome cold-load and settled heap measurements use an isolated synthetic town scene', {skip: !binary, timeout: 90000}, async t => {
  const {site, page} = await setup(t), p = await page('about:blank');
  await p.command('Emulation.setDeviceMetricsOverride', {width: 844, height: 390, deviceScaleFactor: 1, mobile: true});
  await p.command('Page.addScriptToEvaluateOnNewDocument', {source: 'performance.setResourceTimingBufferSize(20000)'});
  await p.command('Performance.enable');
  await p.command('Page.navigate', {url:site.url+'/full/'});
  await waitFor(() => p.evaluate('!!document.querySelector("[data-action=recommended]") && document.querySelector("#loading").hidden'));
  const creationReadyMs = await p.evaluate('performance.now()');
  await p.evaluate('document.querySelector("[data-action=recommended]").click(); document.querySelector("#newName").value="效能合成角色"; document.querySelector("[data-action=create]").click(); document.querySelector("[data-action=confirmNew]").click()');
  await waitFor(() => p.evaluate('!document.querySelector("#panel").open && document.querySelector("#loading").hidden && document.querySelector("#heroName").textContent==="效能合成角色"'));
  const controlsReadyMs = await p.evaluate('performance.now()');
  await waitFor(() => p.evaluate('(() => {const c=document.querySelector("#world"),ctx=c.getContext("2d");return [[.25,.5],[.5,.7],[.75,.5]].every(([x,y])=>{const p=ctx.getImageData(Math.floor(c.width*x),Math.floor(c.height*y),1,1).data;return p[0]+p[1]+p[2]>100;});})()'));
  const firstTerrainPaintMs = await p.evaluate('performance.now()');
  let previous = -1, stable = 0;
  await waitFor(async () => {const count=await p.evaluate('performance.getEntriesByType("resource").length');stable=count===previous?stable+1:0;previous=count;await delay(400);return stable>=3;},20000);
  const resources = await p.evaluate('(() => { const entries=[...performance.getEntriesByType("navigation"),...performance.getEntriesByType("resource")].filter(e=>e.name.startsWith(location.origin));const byInitiator={};for(const e of entries){const key=e.entryType==="navigation"?"document":e.initiatorType;const row=byInitiator[key]||={completedRequests:0,transferBytes:0,encodedBodyBytes:0};row.completedRequests++;row.transferBytes+=e.transferSize;row.encodedBodyBytes+=e.encodedBodySize;}return {sampleAtMs:performance.now(),completedRequests:entries.length,transferBytes:entries.reduce((n,e)=>n+e.transferSize,0),encodedBodyBytes:entries.reduce((n,e)=>n+e.encodedBodySize,0),byInitiator};})()');
  const playableReadyMs = resources.sampleAtMs;
  const metrics = value => Object.fromEntries(value.metrics.filter(m=>['JSHeapUsedSize','JSHeapTotalSize','Nodes','Documents','LayoutDuration','ScriptDuration','TaskDuration'].includes(m.name)).map(m=>[m.name,m.value]));
  const settled = metrics(await p.command('Performance.getMetrics'));
  await delay(15000);
  const after15Seconds = metrics(await p.command('Performance.getMetrics'));
  assert(creationReadyMs>0 && playableReadyMs>=creationReadyMs);assert(resources.completedRequests>0 && resources.transferBytes>0);assert(settled.JSHeapUsedSize>0);
  const version=await p.command('Browser.getVersion');
  const report={browser:version.product,syntheticOnly:true,actualPhone:false,profile:'fresh disposable profile',viewport:[844,390],headless:true,launchRenderingFlags:['--disable-gpu','--in-process-gpu'],hardwareGpuDisabledByLaunchFlag:true,scene:'new knight, stationary Silver town, original assets; no combat stress test',readinessPollIntervalMs:100,creationReadyMs,controlsReadyMs,firstTerrainPaintMs,playableReadyMs,playableCriterion:'controls active, terrain pixels drawn and initial resource count stable',settlingRule:'completed resource count unchanged over three 400ms intervals',resources,settled,after15Seconds,heapChangeBytes:after15Seconds.JSHeapUsedSize-settled.JSHeapUsedSize,limits:['local HTTP, no mobile radio latency','desktop Chrome, no Android/iOS device','natural GC; two heap samples do not establish a memory leak or prove its absence','no frame-rate claim or hardware GPU benchmark']};
  await writeFile(path.join(reportDir,'performance.json'),JSON.stringify(report,null,2));
});
