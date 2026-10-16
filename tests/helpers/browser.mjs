import {spawn} from 'node:child_process';
import {mkdtemp, readFile, rm, realpath} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

export async function connectBrowserPage(webSocketDebuggerUrl) {
  const socket = new WebSocket(webSocketDebuggerUrl), pending = new Map(), listeners = new Map();
  let sequence = 0;
  await new Promise((resolve, reject) => {
    socket.onopen = resolve;
    socket.onerror = reject;
  });
  socket.onmessage = ({data}) => {
    const message = JSON.parse(data), job = pending.get(message.id);
    if (!job) {for (const listener of listeners.get(message.method) || []) listener(message.params);return;}
    pending.delete(message.id);
    clearTimeout(job.timer);
    if (message.error) job.reject(Error(message.error.message));
    else job.resolve(message.result);
  };
  socket.onclose = () => {
    for (const job of pending.values()) {
      clearTimeout(job.timer);
      job.reject(Error('Browser connection closed'));
    }
    pending.clear();
  };
  function command(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++sequence;
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(Error('Browser command timed out: ' + method));
      }, 20000);
      pending.set(id, {resolve, reject, timer});
      socket.send(JSON.stringify({id, method, params}));
    });
  }
  async function evaluate(expression) {
    const result = await command('Runtime.evaluate', {expression, awaitPromise: true, returnByValue: true});
    if (result.exceptionDetails) throw Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  }
  return {command, evaluate, on(method, listener) {if (!listeners.has(method)) listeners.set(method, []);listeners.get(method).push(listener);}, close: () => socket.close()};
}

// Only synthetic local test pages use this isolated, disposable browser profile.
export async function launchTestBrowser(executable, {disableSandbox = false, rememberAccess = true} = {}) {
  if (!executable) throw Error('Set BROWSER_BINARY to an installed Chrome or Chromium executable');
  const temp = await realpath(tmpdir()), profile = await mkdtemp(path.join(temp, 'lineage-browser-test-'));
  const child = spawn(executable, [
    '--headless=new', '--disable-gpu', '--in-process-gpu',
    '--no-first-run', '--no-default-browser-check', '--disable-background-networking',
    ...(disableSandbox ? ['--no-sandbox'] : []),
    '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank',
  ], {windowsHide: true, stdio: ['ignore', 'ignore', 'pipe']});
  let stderr = '', spawnError;
  child.stderr.on('data', bytes => { stderr = (stderr + bytes).slice(-4000); });
  child.on('error', error => { spawnError = error; });
  let port;
  async function close() {
    if (child.exitCode === null) {
      const exited = new Promise(resolve => child.once('exit', resolve));
      child.kill();
      await Promise.race([exited, delay(3000)]);
    }
    const absolute = await realpath(profile);
    if (path.dirname(absolute) !== temp || !path.basename(absolute).startsWith('lineage-browser-test-')) throw Error('Unexpected browser profile path');
    await rm(absolute, {recursive: true, force: true, maxRetries: 8, retryDelay: 250});
  }
  try {
    for (let i = 0; i < 100; i++) {
      if (spawnError) throw spawnError;
      if (child.exitCode !== null) throw Error('Browser exited: ' + stderr);
      try { port = Number((await readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]); break; }
      catch { await delay(100); }
    }
    if (!port) throw Error('Browser did not start: ' + stderr);
    async function page() {
      const response = await fetch('http://127.0.0.1:' + port + '/json/new?about:blank', {method: 'PUT'});
      if (!response.ok) throw Error('Could not create browser page');
      const page = await connectBrowserPage((await response.json()).webSocketDebuggerUrl);
      // Gameplay tests use an already accepted synthetic browser. Entry tests opt out.
      if (rememberAccess) await page.command('Page.addScriptToEvaluateOnNewDocument', {
        source: "try { localStorage.setItem('7daywar.access.v1', 'accepted'); } catch {}",
      });
      return page;
    }
    return {page, close};
  } catch (error) {
    await close();
    throw error;
  }
}

export async function startTestServer(root = new URL('../../', import.meta.url)) {
  const {fileURLToPath} = await import('node:url');
  const child = spawn(process.execPath, ['portable/server.mjs', '--root', '../dist', '--port', '0'], {
    cwd: fileURLToPath(root), windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
  });
  const url = await new Promise((resolve, reject) => {
    child.stdout.on('data', bytes => {
      const match = /localhost:(\d+)/.exec(String(bytes));
      if (match) resolve('http://127.0.0.1:' + match[1]);
    });
    child.stderr.on('data', bytes => reject(Error(String(bytes))));
    child.on('error', reject);
    child.on('exit', code => reject(Error('Server exited: ' + code)));
  });
  return {url, async close() {
    if (child.exitCode !== null) return;
    const exited = new Promise(resolve => child.once('exit', resolve));
    child.kill();
    await exited;
  }};
}
