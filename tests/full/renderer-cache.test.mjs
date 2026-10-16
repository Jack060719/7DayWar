import test from 'node:test';
import assert from 'node:assert/strict';
import {FullRenderer} from '../../dist/full/renderer.mjs';
import {createGame} from '../../dist/full/engine.mjs';
import {geometry, project} from '../../dist/full/world.mjs';

function renderer() {
  const draws = [];
  const ctx = {globalAlpha: 1, drawImage: (...args) => draws.push(args), clearRect() {}, save() {}, restore() {}, setTransform() {}, fillRect() {}, measureText: () => ({width: 20})};
  const canvas = {getContext: () => ctx, getBoundingClientRect: () => ({width: 600, height: 320})};
  return {r: new FullRenderer(canvas), ctx, draws};
}

for (const faded of [false, true]) test((faded ? 'faded roof' : 'ordinary building') + ' refreshes cache use and evicts an older texture under pressure', async t => {
  const {r, ctx, draws} = renderer();
  let now = 1;
  t.mock.method(performance, 'now', () => now);
  const previousImage = globalThis.Image;
  t.after(() => previousImage === undefined ? delete globalThis.Image : globalThis.Image = previousImage);
  globalThis.Image = class {naturalWidth = 2048; naturalHeight = 2048; set src(value) {queueMicrotask(() => this.onload());}};
  await r.loadClip('world/recent.png');
  now = 2;
  await r.loadClip('world/older.png');
  const art = {atlas: 'world/recent.png', rect: [0, 0, 64, 64], anchor: [32, 64]};
  const b = {art, x: 0, y: 0};
  r.roofCanvas = {width: 64, height: 64, getContext: () => ctx};
  r.roofFeather = {};
  r.roofOcclusion = () => ({strength: faded ? .5 : 0, im: r.images.get(art.atlas), r: art.rect, size: {w: 64, h: 64}, hero: {x: 100, y: 100}, height: 72, left: 0, top: 0});
  now = 3;
  r.drawStructure(b, {}, {}, now);
  assert(draws.length > 0, 'the building was drawn');
  assert.equal(r.clipUsage.get(art.atlas).at, 3);
  now = 4;
  await r.loadClip('world/new.png');
  assert(r.images.has(art.atlas), 'the visible building remains loaded');
  assert(!r.images.has('world/older.png'), 'the least recently drawn texture is evicted');
  assert.equal([...r.clipUsage.values()].reduce((n, row) => n + row.bytes, 0), 32 * 1024 * 1024);
});

test('building loading follows visible art bounds, including a roof whose anchor is outside the canvas', () => {
  const {r} = renderer(), s = createGame('knight', 'Render test', undefined, 41);
  const original = JSON.stringify(s), g = geometry(s.player.map), b = g.structures[0];
  assert(b);
  r.map = s.player.map;
  r.actorIndex = {};
  r.prepareCamera = () => {};
  r.actor = () => false;
  r.drawEffects = () => {};
  r.text = () => {};
  r.loadMap = () => {};
  const loaded = [], drawn = [];
  r.loadClip = file => loaded.push(file);
  r.drawStructure = building => drawn.push(building);
  const q = project(b.x, b.y);
  r.camera = {x: q.x - r.width / (2 * r.scale), y: q.y - r.height / (2 * r.scale) - 20};
  assert(r.screen(b.x, b.y).y > r.height, 'building anchor is below the canvas');
  r.draw(s, 100);
  assert(drawn.includes(b), 'visible roof is retained even with an offscreen anchor');
  assert(loaded.length > 0 && loaded.length < g.structures.length, 'offscreen buildings are not loaded');
  loaded.length = drawn.length = 0;
  r.camera = {x: 1e6, y: 1e6};
  r.draw(s, 116);
  assert.equal(loaded.length, 0);
  assert.equal(drawn.length, 0);
  assert.equal(JSON.stringify(s), original, 'render culling does not change simulation state');
});
