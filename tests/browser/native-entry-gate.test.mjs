import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {launchTestBrowser, startTestServer} from '../helpers/browser.mjs';

const binary = process.env.BROWSER_BINARY;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function waitFor(check) {
  const until = Date.now() + 30000;
  while (!await check()) {
    if (Date.now() > until) throw Error('Entry condition timed out');
    await delay(100);
  }
}

test('public entry gates both games, remembers access, preserves saves and works under a Pages subpath', {skip: !binary, timeout: 120000}, async t => {
  const site = await startTestServer();
  t.after(() => site.close());
  // Serve the unchanged game under a project path, as GitHub Pages does.
  let blockEntry = false;
  const requests = [], prefix = '/sample-project';
  const proxy = http.createServer((req, res) => {
    requests.push(req.url);
    if (!req.url.startsWith(prefix + '/')) {res.writeHead(404); res.end(); return;}
    if (blockEntry && req.url === prefix + '/full/app.mjs') {res.writeHead(503); res.end('Synthetic interruption'); return;}
    const upstream = http.request(site.url + req.url.slice(prefix.length), {method: req.method}, response => {
      const headers = {...response.headers};
      if (headers.location?.startsWith('/')) headers.location = prefix + headers.location;
      res.writeHead(response.statusCode, headers);
      response.pipe(res);
    });
    upstream.on('error', () => {if (!res.headersSent) res.writeHead(502); res.end();});
    req.pipe(upstream);
  });
  await new Promise(resolve => proxy.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => {proxy.close(resolve); proxy.closeAllConnections();}));
  const origin = 'http://127.0.0.1:' + proxy.address().port;
  const browser = await launchTestBrowser(binary, {disableSandbox: process.env.BROWSER_NO_SANDBOX === '1', rememberAccess: false});
  t.after(() => browser.close());
  const p = await browser.page();
  t.after(() => p.close());
  await p.command('Page.enable');
  const reportDir = path.resolve(process.env.BROWSER_REPORT_DIR || 'reports/entry-gate');
  await mkdir(reportDir, {recursive: true});
  const navigate = async route => {
    await p.command('Page.navigate', {url: origin + prefix + route});
    await waitFor(() => p.evaluate('document.readyState === "complete" && !!document.querySelector("#accessGate")'));
  };
  const readyGate = () => p.evaluate('document.body.classList.contains("access-locked") && !document.querySelector("#accessSubmit").disabled');
  const submit = value => p.evaluate('document.querySelector("#accessPassword").value=' + JSON.stringify(value) + ';document.querySelector("#accessForm").requestSubmit()');
  await navigate('/full/');
  await waitFor(readyGate);
  assert.equal(await p.evaluate('document.title'), '七日戰線 · 7DayWar｜開發測試版');
  assert.equal(await p.evaluate('document.querySelector(".access-disclaimer").textContent'), '此遊戲僅用於學生練習AI應用，造成任何損害均不負責');
  assert.equal(await p.evaluate('(async () => (await indexedDB.databases()).length)()'), 0, 'entry must not start or migrate a game save');
  const screenshots = [];
  for (const [width, height] of [[390, 844], [844, 390], [568, 320]]) {
    await p.command('Emulation.setDeviceMetricsOverride', {width, height, deviceScaleFactor: 1, mobile: true});
    await delay(120);
    await p.evaluate('document.querySelector("#accessGate").scrollTop=0');
    const geometry = await p.evaluate('(() => {const g=document.querySelector("#accessGate"), c=g.querySelector(".access-card"), r=c.getBoundingClientRect(), b=document.querySelector("#accessSubmit").getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,scrollable:g.scrollHeight>=g.clientHeight,buttonHeight:b.height,overflow:g.scrollWidth>g.clientWidth};})()');
    assert(geometry.left >= 0 && geometry.right <= width && geometry.top >= 0);
    assert.equal(geometry.overflow, false);
    assert(geometry.buttonHeight >= 44);
    await p.evaluate('document.querySelector(".access-disclaimer").scrollIntoView({block:"end"})');
    const file = 'gate-' + width + 'x' + height + '.png';
    const shot = await p.command('Page.captureScreenshot', {format: 'png'});
    await writeFile(path.join(reportDir, file), Buffer.from(shot.data, 'base64'));
    screenshots.push(file);
    const disclaimer = await p.evaluate('(() => {const r=document.querySelector(".access-disclaimer").getBoundingClientRect(),g=document.querySelector("#accessGate");return {top:r.top,bottom:r.bottom,viewport:innerHeight,scroll:g.scrollTop,scrollHeight:g.scrollHeight,clientHeight:g.clientHeight};})()');
    assert(disclaimer.top >= -1 && disclaimer.bottom <= disclaimer.viewport + 1, JSON.stringify({width,height,disclaimer}));
  }
  await submit('wrong');
  assert.match(await p.evaluate('document.querySelector("#accessStatus").textContent'), /密碼不正確/);
  assert(!requests.some(url => /\/(?:app|engine|storage|offline-worker)\.mjs/.test(url)), 'no game modules before correct password');
  assert.equal(await p.evaluate('localStorage.getItem("7daywar.access.v1")'), null);

  blockEntry = true;
  await submit('7day');
  await waitFor(() => p.evaluate('document.querySelector("#accessSubmit").textContent === "重新載入"'));
  assert(await readyGate());
  assert.equal(await p.evaluate('localStorage.getItem("7daywar.access.v1")'), 'accepted');
  assert.equal(await p.evaluate('(async () => (await indexedDB.databases()).length)()'), 0, 'failed entry download leaves saves untouched');
  blockEntry = false;
  await p.command('Emulation.setDeviceMetricsOverride', {width: 844, height: 390, deviceScaleFactor: 1, mobile: true});
  await p.evaluate('document.querySelector("#accessSubmit").click()');
  await waitFor(() => p.evaluate('!!document.querySelector("[data-action=recommended]")'));
  assert(await p.evaluate('document.querySelector("#accessGate").hidden'));
  await p.evaluate('document.querySelector("[data-action=recommended]").click();document.querySelector("#newName").value="入口合成角色";document.querySelector("[data-action=create]").click();document.querySelector("[data-action=confirmNew]").click()');
  await waitFor(() => p.evaluate('document.querySelector("#loading").hidden && !document.querySelector("#panel").open && document.querySelector("#heroName").textContent==="入口合成角色"'));
  await delay(2200);
  await p.command('Page.reload');
  await waitFor(() => p.evaluate('document.querySelector("#accessGate")?.hidden && document.querySelector("#heroName")?.textContent==="入口合成角色" && document.querySelector("#loading").hidden'));

  // Removing only the access marker must not remove progress.
  await p.evaluate('localStorage.removeItem("7daywar.access.v1")');
  await p.command('Page.reload');
  await waitFor(readyGate);
  await submit('7day');
  await waitFor(() => p.evaluate('document.querySelector("#heroName").textContent==="入口合成角色" && document.querySelector("#loading").hidden'));

  // The retained legacy entry also gates direct access and shares acceptance.
  await navigate('/');
  await waitFor(() => p.evaluate('document.querySelector("#accessGate").hidden && !!document.querySelector("[data-do=recommend]")'));
  assert.equal(await p.evaluate('document.title'), '七日戰線 · 7DayWar');
  await p.evaluate('localStorage.removeItem("7daywar.access.v1")');
  await p.command('Page.reload');
  await waitFor(readyGate);
  assert.equal(await p.evaluate('document.querySelector("#modal").open'), false);

  // A quota failure cannot prevent this visit; the prompt returns on reload.
  const deniedWrite = await p.command('Page.addScriptToEvaluateOnNewDocument', {source: 'const originalSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==="7daywar.access.v1")throw new DOMException("Synthetic quota failure","QuotaExceededError");return originalSet.call(this,k,v)}'});
  await navigate('/full/');
  await waitFor(readyGate);
  await submit('7day');
  await waitFor(() => p.evaluate('document.querySelector("#accessGate").hidden && document.querySelector("#heroName").textContent==="入口合成角色"'));
  await p.command('Page.reload');
  await waitFor(readyGate);

  await p.command('Page.removeScriptToEvaluateOnNewDocument', {identifier: deniedWrite.identifier});
  // Blocking all legacy storage must retain the existing game save protection.
  await p.command('Page.addScriptToEvaluateOnNewDocument', {source: 'Object.defineProperty(window,"localStorage",{get(){throw new DOMException("Synthetic storage denial","SecurityError")}})'});
  await navigate('/full/');
  await waitFor(readyGate);
  await submit('7day');
  await waitFor(() => p.evaluate('document.querySelector("#accessGate").hidden && document.querySelector("#panelBody").textContent.includes("Synthetic storage denial")'));
  assert(await p.evaluate('document.querySelector("#panelBody").textContent.includes("進度已保護")'));

  await writeFile(path.join(reportDir, 'result.json'), JSON.stringify({
    browser: (await p.command('Browser.getVersion')).product,
    syntheticOnly: true, actualPhone: false, deployedGitHubPages: false,
    projectSubpath: prefix, screenshots,
    checks: ['password-rejection', 'no-game-before-acceptance', 'interrupted-entry-retry',
      'remembered-on-reload', 'save-preserved-after-marker-removal', 'legacy-direct-entry',
      'marker-quota-failure-current-visit', 'storage-denied-save-protection', 'responsive-scrollable-disclaimer'],
  }, null, 2));
});
