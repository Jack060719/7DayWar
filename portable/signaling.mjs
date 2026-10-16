// Ephemeral room discovery and WebRTC signaling. No game state or save files are retained.
import http from 'node:http';
import {randomBytes} from 'node:crypto';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
export const ROOM_VERSION = 1;
export const ROOM_LIMIT = 10;
const BODY_LIMIT = 32768, QUEUE_LIMIT = 1024 * 1024;
const fail = (status, message) => Object.assign(new Error(message), {status});
function readBody(req) {
  return new Promise((resolve, reject) => {
    let bytes = 0, chunks = [];
    req.on('data', chunk => { bytes += chunk.length; if (bytes <= BODY_LIMIT) chunks.push(chunk); else chunks = []; });
    req.on('error', reject);
    req.on('end', () => {
      if (bytes > BODY_LIMIT) return reject(fail(413, '訊息過大'));
      try { const value = JSON.parse(Buffer.concat(chunks).toString()); if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error(); resolve(value); }
      catch { reject(fail(400, 'JSON 格式不正確')); }
    });
  });
}
export function createSignalingServer({allowedOrigins = [], ttlMs = 30000, now = Date.now, maxRooms = 50, rateLimit = 1800} = {}) {
  const origins = new Set(allowedOrigins.map(value => { const u = new URL(value); if (!['http:', 'https:'].includes(u.protocol) || u.origin !== value) throw Error('Origin must be an exact HTTP(S) origin'); return value; }));
  const rooms = new Map(), rates = new Map();
  function enqueue(room, member, event) {
    const bytes = Buffer.byteLength(JSON.stringify(event));
    const pending = [...room.members.values()].reduce((n, m) => n + m.bytes, 0);
    if (pending + bytes > QUEUE_LIMIT || member.queue.length >= 128) throw fail(429, '配對訊息過多，請稍後重新加入');
    member.queue.push({...event, seq: ++member.seq, bytes}); member.bytes += bytes;
  }
  function remove(room, id, reason) {
    if (id === 'host') { rooms.delete(room.code); return; }
    room.members.delete(id);
    try { enqueue(room, room.members.get('host'), {type: 'leave', id, reason}); } catch { rooms.delete(room.code); }
  }
  function sweep() {
    const at = now();
    for (const room of rooms.values()) {
      if (at - room.members.get('host').seen > ttlMs || at - room.created > 8 * 60 * 60 * 1000) { rooms.delete(room.code); continue; }
      for (const member of room.members.values()) if (member.id !== 'host' && at - member.seen > ttlMs) remove(room, member.id, 'timeout');
    }
    for (const [ip, row] of rates) if (at - row.at >= 60000) rates.delete(ip);
  }
  function member(id) { return {id, token: randomBytes(32).toString('base64url'), seen: now(), seq: 0, queue: [], bytes: 0, signals: 0, signalAt: now()}; }
  function credentials(room, m) { return {version: ROOM_VERSION, code: room.code, id: m.id, hostId: 'host', token: m.token, limit: ROOM_LIMIT}; }
  const server = http.createServer(async (req, res) => {
    const answer = (status, value) => { res.writeHead(status, {'Content-Type': 'application/json; charset=utf-8'}); res.end(value === undefined ? undefined : JSON.stringify(value)); };
    res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Referrer-Policy', 'no-referrer');
    try {
      sweep();
      const origin = req.headers.origin;
      if (origin && !origins.has(origin)) throw fail(403, '不允許此遊戲網址連接');
      if (origin) { res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Vary', 'Origin'); }
      if (req.method === 'OPTIONS') { res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS'); res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type'); return answer(204); }
      const ip = req.socket.remoteAddress || 'unknown', bucket = rates.get(ip) || {at: now(), count: 0};
      if (!rates.has(ip) && rates.size >= 4096) throw fail(503, '配對服務忙碌');
      rates.set(ip, bucket); if (++bucket.count > rateLimit) throw fail(429, '請求過於頻繁');
      const url = new URL(req.url, 'http://localhost'), match = new RegExp('^/signal/rooms(?:/([A-F0-9]{12})/(join|poll|signal|leave|kick))?$').exec(url.pathname);
      if (!match) throw fail(404, '找不到配對路徑');
      if (req.method !== 'POST' && !(req.method === 'GET' && match[2] === 'poll')) throw fail(405, '不支援此操作');
      const body = req.method === 'POST' ? await readBody(req) : null;
      if (body && body.version !== ROOM_VERSION) throw fail(409, '遊戲連線版本不一致');
      if (!match[1]) {
        if (rooms.size >= maxRooms) throw fail(503, '房間已滿，請稍後重試');
        let code; do { code = randomBytes(6).toString('hex').toUpperCase(); } while (rooms.has(code));
        const host = member('host'), room = {code, created: now(), members: new Map([['host', host]])}; rooms.set(code, room);
        return answer(201, credentials(room, host));
      }
      const room = rooms.get(match[1]); if (!room) throw fail(410, '房間已結束或房號不存在');
      if (match[2] === 'join') {
        if (room.members.size >= ROOM_LIMIT) throw fail(409, '房間最多 10 人（含房主）');
        const m = member(randomBytes(8).toString('hex'));
        enqueue(room, room.members.get('host'), {type: 'join', id: m.id}); room.members.set(m.id, m);
        return answer(201, credentials(room, m));
      }
      const auth = req.headers.authorization, m = [...room.members.values()].find(row => auth === 'Bearer ' + row.token);
      if (!m) throw fail(403, '房間身分已失效'); m.seen = now();
      if (match[2] === 'poll') {
        const after = Number(url.searchParams.get('after') || 0);
        if (!Number.isSafeInteger(after) || after < 0 || after > m.seq) throw fail(400, '無效的配對游標');
        m.queue = m.queue.filter(event => event.seq > after); m.bytes = m.queue.reduce((n, event) => n + event.bytes, 0);
        return answer(200, {version: ROOM_VERSION, events: m.queue.map(({bytes, ...event}) => event)});
      }
      if (match[2] === 'leave') { remove(room, m.id, 'left'); return answer(200, {ok: true}); }
      if (match[2] === 'kick') {
        if (m.id !== 'host' || body.id === 'host' || !room.members.has(body.id)) throw fail(403, '只有房主能移除隊員');
        remove(room, body.id, 'removed'); return answer(200, {ok: true});
      }
      const target = room.members.get(body.to);
      if (!target || target.id === m.id || (m.id !== 'host' && target.id !== 'host')) throw fail(403, '只能與房主連接');
      if (now() - m.signalAt >= 60000) { m.signalAt = now(); m.signals = 0; }
      if (++m.signals > (m.id === 'host' ? 600 : 180)) throw fail(429, '配對訊息過於頻繁');
      const signal = body.signal;
      if (!signal || !['offer', 'answer', 'candidate'].includes(signal.type)) throw fail(400, '無效的配對訊息');
      if (signal.type === 'offer' && m.id !== 'host' || signal.type === 'answer' && m.id === 'host') throw fail(403, '無效的配對方向');
      let payload;
      if (signal.type === 'candidate') {
        const c = signal.candidate;
        if (c !== null && (!c || typeof c.candidate !== 'string' || c.candidate.length > 4096 || c.sdpMid !== null && c.sdpMid !== undefined && (typeof c.sdpMid !== 'string' || c.sdpMid.length > 64) || c.sdpMLineIndex !== null && c.sdpMLineIndex !== undefined && (!Number.isInteger(c.sdpMLineIndex) || c.sdpMLineIndex < 0 || c.sdpMLineIndex > 100))) throw fail(400, '無效的 ICE 候選');
        payload = {type: 'candidate', candidate: c === null ? null : {candidate: c.candidate, sdpMid: c.sdpMid ?? null, sdpMLineIndex: c.sdpMLineIndex ?? null}};
      } else {
        if (typeof signal.sdp !== 'string' || !signal.sdp.startsWith('v=0') || signal.sdp.length > 24576) throw fail(400, '無效的 SDP');
        payload = {type: signal.type, sdp: signal.sdp};
      }
      enqueue(room, target, {type: 'signal', from: m.id, signal: payload}); return answer(200, {ok: true});
    } catch (error) { req.resume(); if (!res.headersSent) answer(error.status || 500, {error: error.status ? error.message : '配對服務暫時無法使用'}); }
  });
  server.requestTimeout = 10000; server.headersTimeout = 10000; server.maxHeadersCount = 32;
  const timer = setInterval(sweep, Math.min(1000, ttlMs)); timer.unref(); server.on('close', () => clearInterval(timer));
  return server;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2), index = args.indexOf('--port'), port = index < 0 ? 8788 : Number(args[index + 1]);
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw Error('Invalid port');
  const allowedOrigins = args.flatMap((value, i) => value === '--origin' ? [args[i + 1]] : []);
  const server = createSignalingServer({allowedOrigins});
  server.on('error', error => { console.error(error.message); process.exitCode = 1; });
  server.listen(port, args.includes('--lan') ? '0.0.0.0' : '127.0.0.1', () => console.log('Signaling ready on port ' + server.address().port + '; HTTPS reverse proxy required for public hosting.'));
}
