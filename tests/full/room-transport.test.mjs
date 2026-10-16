import test from 'node:test';
import assert from 'node:assert/strict';
import {RoomTransport} from '../../dist/full/room-transport.mjs';
import {createSignalingServer} from '../../portable/signaling.mjs';
// Controlled WebRTC double: exercises negotiation and transport lifecycle, not browser interoperability.
class Channel {
  label = 'lineage-dream'; protocol = 'lineage-dream-v1'; readyState = 'connecting'; bufferedAmount = 0;
  send(data) { if (this.readyState !== 'open') throw Error('closed'); queueMicrotask(() => { if (this.other?.readyState === 'open') this.other.onmessage?.({data}); }); }
  close() { if (this.readyState === 'closed') return; this.readyState = 'closed'; this.onclose?.(); if (this.other?.readyState !== 'closed') this.other?.close(); }
}
class Peer {
  static all = new Map(); static next = 0;
  constructor(options) { this.options = options; this.id = ++Peer.next; Peer.all.set(this.id, this); this.connectionState = 'new'; }
  createDataChannel(label, options) { assert.equal(options.ordered, true); assert.equal(options.maxRetransmits, undefined); return this.channel = new Channel(); }
  async createOffer() { return {type: 'offer', sdp: 'v=0 id=' + this.id}; }
  async createAnswer() { return {type: 'answer', sdp: 'v=0 id=' + this.id}; }
  async setLocalDescription(desc) { this.localDescription = desc; this.onicecandidate?.({candidate: {toJSON: () => ({candidate: 'candidate:fixture', sdpMid: '0', sdpMLineIndex: 0})}}); }
  async setRemoteDescription(desc) {
    this.remoteDescription = desc;
    if (desc.type === 'answer') {
      const guest = Peer.all.get(Number(desc.sdp.split('=')[2]));
      guest.channel = new Channel(); guest.channel.other = this.channel; this.channel.other = guest.channel;
      guest.ondatachannel?.({channel: guest.channel});
      for (const pc of [this, guest]) { pc.connectionState = 'connected'; pc.onconnectionstatechange?.(); pc.channel.readyState = 'open'; pc.channel.onopen?.(); }
    }
  }
  async addIceCandidate(value) { assert(this.remoteDescription); this.candidates ||= []; this.candidates.push(value); }
  close() { this.connectionState = 'closed'; this.channel?.close(); Peer.all.delete(this.id); }
}
async function waitFor(check, timeout = 7000) { const end = Date.now() + timeout; while (!check()) { if (Date.now() > end) throw Error('timed out'); await new Promise(resolve => setTimeout(resolve, 20)); } }
async function setup(t) {
  const previous = globalThis.RTCPeerConnection; globalThis.RTCPeerConnection = Peer;
  const server = createSignalingServer(); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const clients = [], errors = [], base = 'http://127.0.0.1:' + server.address().port + '/signal';
  t.after(async () => { await Promise.all(clients.map(c => c.close())); await new Promise(resolve => server.close(resolve)); if (previous === undefined) delete globalThis.RTCPeerConnection; else globalThis.RTCPeerConnection = previous; Peer.all.clear(); });
  const make = (callbacks = {}) => { const c = new RoomTransport({serverURL: base, onError: e => errors.push(e), ...callbacks}); clients.push(c); return c; };
  return {make, errors};
}
test('host and guest negotiate an ordered channel, exchange fragmented JSON and close when the host leaves', async t => {
  const {make, errors} = await setup(t), received = [], closes = [];
  const host = make({onMessage: (data, from) => received.push({data, from})}), guest = make({onMessage: (data, from) => received.push({data, from}), onClose: reason => closes.push(reason)});
  const room = await host.host(); await guest.join(room.code.toLowerCase());
  await waitFor(() => host.peers.length === 1 && guest.peers.length === 1);
  assert(host.isHost); assert(!guest.isHost); assert.deepEqual(guest.peers, ['host']);
  const payload = {kind: 'snapshot', text: '家人一起玩'.repeat(25000)};
  assert(host.to(guest.id, payload)); assert(guest.send({kind: 'command', seq: 1}));
  await waitFor(() => received.length === 2);
  assert.deepEqual(received.find(r => r.from === 'host').data, payload);
  assert.deepEqual(received.find(r => r.from === guest.id).data, {kind: 'command', seq: 1});
  assert.equal(errors.length, 0); assert.throws(() => guest.broadcast({}), /只有房主/);
  await host.close('host-left'); await waitFor(() => guest._closed);
  assert.equal(closes.length, 1); assert.equal(guest.send({}), false);
});
test('ten-person star connects nine members, rejects the eleventh, and supports broadcast and removal', async t => {
  const {make, errors} = await setup(t), host = make(), room = await host.host(), messages = [];
  const guests = Array.from({length: 9}, () => make({onMessage: data => messages.push(data)}));
  for (const guest of guests) await guest.join(room.code);
  await waitFor(() => host.peers.length === 9);
  const extra = make(); await assert.rejects(extra.join(room.code), /最多 10 人/);
  assert(host.broadcast({event: 'ready'})); await waitFor(() => messages.length === 9);
  assert.equal(errors.length, 0);
  await host.disconnect(guests[0].id, 'duplicate-character'); await waitFor(() => guests[0]._closed);
  await extra.join(room.code); await waitFor(() => host.peers.length === 9);
});
test('backpressure rejects without advancing message sequence; invalid protocol disconnects only that peer', async t => {
  const {make} = await setup(t), messages = [], host = make({onMessage: data => messages.push(data)}), room = await host.host(), guest = make();
  await guest.join(room.code); await waitFor(() => host.peers.length === 1);
  const row = guest._links.get('host'); row.channel.bufferedAmount = 8 * 1024 * 1024;
  assert.equal(guest.send({kind: 'blocked'}), false); assert.equal(row.tx, 0);
  row.channel.bufferedAmount = 0; assert(guest.send({kind: 'accepted'})); await waitFor(() => messages.length === 1);
  assert.deepEqual(messages, [{kind: 'accepted'}]);
  row.channel.send(JSON.stringify({v: 2, n: 2, i: 0, total: 1, data: '{}'}));
  await waitFor(() => host.peers.length === 0 && guest._closed); assert.equal(host._closed, false);
});
test('canceling an in-flight join cleans up its room membership without reopening transport', async t => {
  const previous = globalThis.RTCPeerConnection; globalThis.RTCPeerConnection = Peer;
  t.after(() => previous === undefined ? delete globalThis.RTCPeerConnection : globalThis.RTCPeerConnection = previous);
  let finish; const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => { calls.push({url, options}); if (url.endsWith('/rooms')) return new Promise(resolve => { finish = () => resolve({ok: true, json: async () => ({version: 1, code: 'ABCDEF123456', id: 'host', hostId: 'host', token: 'private'})}); }); return {ok: true, json: async () => ({ok: true})}; });
  const room = new RoomTransport({serverURL: 'http://localhost/signal'}), pending = room.host();
  await waitFor(() => finish); await room.close(); finish(); await assert.rejects(pending, /已取消/);
  assert(room._closed); assert.equal(calls.length, 2); assert(calls[1].url.endsWith('/leave')); assert.equal(calls[1].options.headers.Authorization, 'Bearer private');
});

test('failed RTC initialization releases membership and leaves a closed transport', async t => {
  const {make} = await setup(t), host = make(), room = await host.host(), guest = make();
  globalThis.RTCPeerConnection = class { constructor() { throw Error('invalid ICE configuration'); } };
  try { await assert.rejects(guest.join(room.code), /invalid ICE/); assert(guest._closed); assert.equal(guest._token, null); }
  finally { globalThis.RTCPeerConnection = Peer; }
  const result = await fetch(host.serverURL + '/rooms/' + room.code + '/poll', {headers: {Authorization: 'Bearer ' + host._token}});
  const events = (await result.json()).events;
  assert(events.some(e => e.type === 'leave' && e.id === guest.id));
});

test('a delayed negotiation from a closed room cannot overwrite the next room polling cursor', async t => {
  const previous = globalThis.RTCPeerConnection; globalThis.RTCPeerConnection = Peer;
  t.after(() => previous === undefined ? delete globalThis.RTCPeerConnection : globalThis.RTCPeerConnection = previous);
  const room = new RoomTransport({serverURL: 'http://localhost/signal'}); t.after(() => room.close());
  let entries = 0, release, oldPoll;
  t.mock.method(room, '_request', async path => {
    if (path === '/rooms') return {version: 1, code: ++entries === 1 ? 'AAAAAA111111' : 'BBBBBB222222', id: 'host', hostId: 'host', token: 'temporary'};
    if (path.includes('AAAAAA111111/poll')) return {version: 1, events: [{seq: 1, type: 'join', id: 'old-peer'}]};
    return {version: 1, events: []};
  });
  t.mock.method(room, '_offer', () => new Promise(resolve => { release = resolve; }));
  const originalPoll = room._poll.bind(room); room._poll = (...args) => (oldPoll = originalPoll(...args));
  await room.host(); await waitFor(() => release); const stalePoll = oldPoll;
  await room.close(); await room.host(); release(); await stalePoll;
  assert.equal(room.code, 'BBBBBB222222'); assert.equal(room._cursor, 0); assert.equal(room._closed, false);
});
