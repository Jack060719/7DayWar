import test from 'node:test';
import assert from 'node:assert/strict';
import {createSignalingServer} from '../../portable/signaling.mjs';
async function service(t, options = {}) {
  const server = createSignalingServer(options); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = 'http://127.0.0.1:' + server.address().port + '/signal';
  const request = async (path, body, token, headers = {}) => { const res = await fetch(base + path, {method: body ? 'POST' : 'GET', headers: {...(body ? {'Content-Type': 'application/json'} : {}), ...(token ? {Authorization: 'Bearer ' + token} : {}), ...headers}, ...(body ? {body: JSON.stringify({version: 1, ...body})} : {})}); return {status: res.status, data: await res.json(), headers: res.headers}; };
  return {base, request, host: () => request('/rooms', {})};
}
test('signaling gives unique private credentials, supports ten people and releases departed slots', async t => {
  const {request, host} = await service(t), h = (await host()).data, path = '/rooms/' + h.code;
  assert.match(h.code, /^[A-F0-9]{12}$/); assert.equal(h.token.length, 43);
  const members = [];
  for (let i = 0; i < 9; i++) { const r = await request(path + '/join', {}); assert.equal(r.status, 201); members.push(r.data); }
  assert.equal(new Set([h.token, ...members.map(m => m.token)]).size, 10);
  assert.equal((await request(path + '/join', {})).status, 409);
  const poll = await request(path + '/poll', null, h.token); assert.equal(poll.data.events.length, 9);
  assert(!JSON.stringify(poll.data).includes('token'));
  const cursor = poll.data.events.at(-1).seq;
  assert.equal((await request(path + '/poll?after=' + cursor, null, h.token)).data.events.length, 0);
  await request(path + '/leave', {}, members[0].token);
  assert.equal((await request(path + '/join', {})).status, 201);
});
test('signaling authenticates polling, restricts host topology and strips unrelated payload fields', async t => {
  const {request, host} = await service(t), h = (await host()).data, path = '/rooms/' + h.code;
  const a = (await request(path + '/join', {})).data, b = (await request(path + '/join', {})).data;
  assert.equal((await request(path + '/poll')).status, 403);
  assert.equal((await request(path + '/signal', {to: b.id, signal: {type: 'candidate', candidate: null}}, a.token)).status, 403);
  assert.equal((await request(path + '/signal', {to: a.id, signal: {type: 'offer', sdp: 'v=0', player: {gold: 999}}}, h.token)).status, 200);
  const events = (await request(path + '/poll', null, a.token)).data.events;
  assert.deepEqual(events.map(e => e.signal), [{type: 'offer', sdp: 'v=0'}]);
  assert.equal((await request(path + '/kick', {id: b.id}, a.token)).status, 403);
  assert.equal((await request(path + '/kick', {id: b.id}, h.token)).status, 200);
  assert.equal((await request(path + '/poll', null, b.token)).status, 403);
});
test('host leave and missing heartbeat terminate rooms; peers cannot keep a dead host alive', async t => {
  let at = 1000; const {request, host} = await service(t, {now: () => at, ttlMs: 30000});
  const h = (await host()).data, path = '/rooms/' + h.code, a = (await request(path + '/join', {})).data;
  at += 20000; assert.equal((await request(path + '/poll', null, a.token)).status, 200);
  at += 10001; assert.equal((await request(path + '/poll', null, a.token)).status, 410);
  const next = (await host()).data, nextPath = '/rooms/' + next.code;
  await request(nextPath + '/leave', {}, next.token);
  assert.equal((await request(nextPath + '/join', {})).status, 410);
});
test('version, size and request limits reject invalid input without creating rooms', async t => {
  const {request, host} = await service(t, {rateLimit: 5, maxRooms: 1});
  assert.equal((await request('/rooms', {version: 2})).status, 409);
  assert.equal((await request('/rooms', {padding: 'x'.repeat(33000)})).status, 413);
  assert.equal((await host()).status, 201);
  assert.equal((await host()).status, 503);
  await request('/unknown'); assert.equal((await host()).status, 429);
});
test('CORS is explicit; disallowed and null origins cannot create or inspect a room', async t => {
  const {base, request} = await service(t, {allowedOrigins: ['https://family.example']});
  for (const origin of ['https://other.example', 'null']) assert.equal((await request('/rooms', {}, null, {Origin: origin})).status, 403);
  const good = await request('/rooms', {}, null, {Origin: 'https://family.example'});
  assert.equal(good.status, 201); assert.equal(good.headers.get('Access-Control-Allow-Origin'), 'https://family.example');
  assert.equal(good.headers.get('Cache-Control'), 'no-store');
  const preflight = await fetch(base + '/rooms', {method: 'OPTIONS', headers: {Origin: 'https://family.example'}});
  assert.equal(preflight.status, 204); assert.match(preflight.headers.get('Access-Control-Allow-Headers'), /Authorization/);
});
test('unacknowledged signaling is replayed, acknowledged messages are removed and backlog is bounded', async t => {
  const {request, host} = await service(t), h = (await host()).data, path = '/rooms/' + h.code, a = (await request(path + '/join', {})).data;
  const send = () => request(path + '/signal', {to: a.id, signal: {type: 'offer', sdp: 'v=0'}}, h.token);
  await send();
  const first = (await request(path + '/poll', null, a.token)).data;
  assert.deepEqual((await request(path + '/poll', null, a.token)).data, first);
  assert.equal((await request(path + '/poll?after=999', null, a.token)).status, 400);
  assert.equal((await request(path + '/poll?after=' + first.events[0].seq, null, a.token)).data.events.length, 0);
  for (let i = 0; i < 128; i++) assert.equal((await send()).status, 200);
  assert.equal((await send()).status, 429);
});
