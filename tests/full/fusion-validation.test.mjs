// New recovery acceptance tests for optional unique scrolls and revisioned
// pending transactions. No inherited Stage 3 test bytes were recovered.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame} from '../../dist/full/engine.mjs';
import {validate} from '../../dist/full/validate.mjs';
import {ITEMS} from '../../dist/full/data.mjs';
import {fusionScrollId, fusionScrollTier, fusionRecipe, FUSION_BLESSING_STATS} from '../../dist/full/fusion-policy.mjs';

const BASE = createGame('knight', '驗證測試', undefined, 78231);
const fresh = () => structuredClone(BASE);
function id(state, prefix) {const n = state.nextId; state.nextId = (BigInt(n) + 1n).toString(); return prefix + n;}
function addScroll(state, {category = 'weapon', tier = 'basic', quality = 'normal', identified = true, destination = state.inventory} = {}) {
  const scroll = {uid: id(state, 'scroll'), itemId: fusionScrollId(category, tier, quality), identified};
  (destination.scrolls ??= []).push(scroll);
  return scroll;
}
function addGear(state, itemId, plus, quality = 'normal', blessingStat) {
  const gear = {uid: id(state, 'e'), itemId, plus, durability: ITEMS[itemId].durability_max || 100, identified: true, cursed: false, quality};
  if (blessingStat !== undefined) gear.blessingStat = blessingStat;
  state.inventory.equipment.push(gear);
  return gear;
}
function pendingFixture({category = 'weapon', plus = 6, qualities = ['normal', 'normal'], stats = [], scrollQuality = 'normal', selectedStat, outputQuality, success = true} = {}) {
  const state = fresh(), itemId = category === 'weapon' ? 'EQ-DAGGER' : 'EQ-LEATHER-ARMOR';
  const gear = qualities.map((quality, i) => addGear(state, itemId, plus, quality, stats[i]));
  const scroll = addScroll(state, {category, tier: fusionScrollTier(plus), quality: scrollQuality});
  const request = {uids: gear.map(item => item.uid), scrollUid: scroll.uid};
  if (selectedStat !== undefined) request.blessingStat = selectedStat;
  const recipe = fusionRecipe(state, request, ITEMS);
  assert.equal(recipe.ok, true, recipe.message);
  const tx = {id: '1', recipeRevision: 1, uids: request.uids, itemId, plus, scrollUid: scroll.uid, scrollItemId: scroll.itemId,
    outputQuality: outputQuality ?? (recipe.outputQuality === 'mixed' ? 'normal' : recipe.outputQuality), success};
  if (tx.outputQuality === 'blessed' && category === 'armor') tx.blessingStat = recipe.blessingStat;
  state.fusion = {next: '2', applied: '0', pending: tx, receipts: []};
  return {state, gear, scroll, tx};
}
const valid = state => {const result = validate(state); assert.equal(result.ok, true, result.errors.join('; '));};
const invalid = state => {const result = validate(state); assert.equal(result.ok, false, 'Corrupt fixture was accepted'); return result;};
function deepFreeze(value) {Object.freeze(value); for (const x of Object.values(value)) if (x && typeof x === 'object' && !Object.isFrozen(x)) deepFreeze(x); return value;}

test('old saves may omit both scroll arrays and all gear quality fields', () => {
  const state = fresh();
  delete state.inventory.scrolls; delete state.storage.scrolls;
  state.inventory.equipment.forEach(gear => {delete gear.quality;});
  const before = structuredClone(state);
  valid(state);
  assert.deepEqual(state, before);
});

test('identified and hidden unique scrolls are valid in inventory and storage', () => {
  const state = fresh();
  for (const category of ['weapon', 'armor']) for (const tier of ['basic', 'intermediate', 'advanced']) for (const quality of ['normal', 'blessed']) {
    addScroll(state, {category, tier, quality, identified: quality === 'blessed', destination: category === 'weapon' ? state.inventory : state.storage});
  }
  valid(state);
});

test('scroll arrays, canonical IDs, identification booleans and scroll-prefixed UIDs are checked', () => {
  for (const mutate of [
    state => {state.inventory.scrolls = {};},
    state => {state.storage.scrolls = null;},
    state => {state.inventory.scrolls[0].itemId = 'ITEM-IDENTIFY-SCROLL';},
    state => {state.inventory.scrolls[0].identified = 1;},
    state => {delete state.inventory.scrolls[0].identified;},
    state => {state.inventory.scrolls[0].uid = 'e999'; state.nextId = '1000';},
    state => {state.inventory.scrolls[0].uid = 'scroll0';},
    state => {state.inventory.scrolls[0].uid = 'scroll01';},
    state => {state.inventory.scrolls[0].uid = 'scroll-not-an-integer';},
    state => {state.nextId = state.inventory.scrolls[0].uid.slice(6);}
  ]) {
    const state = fresh(); addScroll(state); mutate(state); invalid(state);
  }
});

test('scroll UIDs are unique across both bags and equipment', () => {
  for (const mutate of [
    (state, scroll) => {state.inventory.scrolls.push({...scroll});},
    (state, scroll) => {state.storage.scrolls = [{...scroll}];},
    (state, scroll) => {state.inventory.equipment[0].uid = scroll.uid; state.equipped.weapon = scroll.uid;}
  ]) {
    const state = fresh(), scroll = addScroll(state); mutate(state, scroll); invalid(state);
  }
});

test('fusion scrolls cannot be stored as fungible stacks', () => {
  for (const bagName of ['inventory', 'storage']) {
    const state = fresh(); state[bagName].stacks[fusionScrollId('weapon', 'basic')] = 3; invalid(state);
  }
});

test('ground.scroll uses the same unique identity and identification rules', () => {
  const state = fresh(), scroll = addScroll(state, {identified: false});
  state.inventory.scrolls = [];
  const drop = {id: id(state, 'g'), x: state.player.x, y: state.player.y, scroll};
  state.worlds[state.player.map].ground.push(drop);
  valid(state);
  for (const mutate of [
    (s, d) => {s.inventory.scrolls.push({...d.scroll});},
    (s, d) => {d.scroll.identified = 'false';},
    (s, d) => {d.scroll.itemId = 'EQ-DAGGER';},
    (s, d) => {d.count = 2;},
    (s, d) => {d.itemId = 'ITEM-RED-POTION'; d.count = 1;},
    (s, d) => {d.gear = {...s.inventory.equipment[0]};}
  ]) {
    const copy = structuredClone(state); mutate(copy, copy.worlds[copy.player.map].ground[0]); invalid(copy);
  }
});

test('ground fusion scroll stacks are rejected while ordinary ground stacks remain valid', () => {
  const state = fresh(), drop = {id: id(state, 'g'), x: state.player.x, y: state.player.y, itemId: 'ITEM-RED-POTION', count: 1};
  state.worlds[state.player.map].ground.push(drop); valid(state);
  drop.itemId = fusionScrollId('armor', 'basic'); invalid(state);
});

test('normal/legacy gear and blessed weapons cannot carry an armor blessing attribute', () => {
  for (const quality of [undefined, 'normal', 'blessed']) {
    const state = fresh(), weapon = state.inventory.equipment.find(item => ITEMS[item.itemId].slot === 'weapon');
    if (quality === undefined) delete weapon.quality; else weapon.quality = quality;
    valid(state);
    weapon.blessingStat = 'STR'; invalid(state);
  }
  for (const quality of ['rare', '', null, 1]) {
    const state = fresh(); state.inventory.equipment[0].quality = quality; invalid(state);
  }
});

test('blessed armor requires exactly one of the five provisional attributes in every location', () => {
  for (const blessingStat of FUSION_BLESSING_STATS) for (const destination of ['inventory', 'storage', 'ground']) {
    const state = fresh(), gear = addGear(state, 'EQ-LEATHER-ARMOR', 0, 'blessed', blessingStat);
    if (destination !== 'inventory') {
      state.inventory.equipment = state.inventory.equipment.filter(item => item.uid !== gear.uid);
      if (destination === 'storage') state.storage.equipment.push(gear);
      else state.worlds[state.player.map].ground.push({id: id(state, 'g'), x: state.player.x, y: state.player.y, gear});
    }
    valid(state);
  }
  for (const blessingStat of [undefined, null, 'CHA', 'str', 'STR/DEX', 2]) {
    const state = fresh(); addGear(state, 'EQ-LEATHER-ARMOR', 0, 'blessed', blessingStat); invalid(state);
  }
});

test('revision 1 validates carried scroll, pair identity, input plus, category and tier together', () => {
  const base = pendingFixture(); valid(base.state);
  for (const mutate of [
    ({state}) => {state.inventory.scrolls = [];},
    ({state, scroll}) => {state.storage.scrolls = [{...scroll}]; state.inventory.scrolls = [];},
    ({scroll}) => {scroll.identified = false;},
    ({tx}) => {tx.scrollUid = 'scroll999';},
    ({tx}) => {tx.scrollItemId = fusionScrollId('armor', 'basic');},
    ({tx}) => {tx.itemId = 'EQ-SHORT-SWORD';},
    ({tx}) => {tx.plus = 7;},
    ({tx, scroll}) => {tx.scrollItemId = scroll.itemId = fusionScrollId('armor', 'basic');},
    ({tx, scroll}) => {tx.scrollItemId = scroll.itemId = fusionScrollId('weapon', 'intermediate');},
    ({gear}) => {gear[1].plus = 7;},
    ({gear}) => {gear[1].identified = false;},
    ({gear}) => {gear[1].cursed = true;},
    ({state, gear}) => {state.equipped.weapon = gear[0].uid;}
  ]) {
    const fixture = pendingFixture(); mutate(fixture); invalid(fixture.state);
  }
});

test('revision 1 normal inputs retain normal output even with blessed scrolls', () => {
  for (const scrollQuality of ['normal', 'blessed']) {
    const {state, tx} = pendingFixture({scrollQuality}); valid(state);
    tx.outputQuality = 'blessed'; invalid(state);
  }
  for (const outputQuality of [undefined, 'mixed', 'rare', null]) {
    const {state, tx} = pendingFixture(); tx.outputQuality = outputQuality; invalid(state);
  }
});

test('safe revision 1 outcomes cannot fail, while risky outcomes retain their sampled success or failure', () => {
  for (const category of ['weapon', 'armor']) {
    const firstRisk = category === 'weapon' ? 6 : 4;
    const safe = pendingFixture({category, plus: firstRisk - 1}); valid(safe.state);
    safe.tx.success = false; invalid(safe.state);
    for (const success of [true, false]) valid(pendingFixture({category, plus: firstRisk, success}).state);
  }
});

test('mixed revision 1 results retain a fixed legal quality even on failure', () => {
  for (const success of [true, false]) for (const outputQuality of ['normal', 'blessed']) {
    const {state, tx} = pendingFixture({qualities: ['normal', 'blessed'], scrollQuality: 'blessed', success, outputQuality});
    valid(state);
    tx.outputQuality = 'mixed'; invalid(state);
  }
  const f = pendingFixture({qualities: ['normal', 'blessed'], scrollQuality: 'blessed'});
  f.tx.scrollItemId = f.scroll.itemId = fusionScrollId('weapon', 'basic', 'normal'); invalid(f.state);
});

test('blessed armor pending choice preserves one input attribute and cannot change output quality', () => {
  for (const success of [true, false]) for (const selectedStat of ['STR', 'WIS']) {
    const {state, tx} = pendingFixture({category: 'armor', qualities: ['blessed', 'blessed'], stats: ['STR', 'WIS'], scrollQuality: 'blessed', selectedStat, success});
    valid(state);
    tx.blessingStat = 'DEX'; invalid(state);
  }
  const f = pendingFixture({category: 'armor', qualities: ['blessed', 'blessed'], stats: ['STR', 'WIS'], scrollQuality: 'blessed', selectedStat: 'STR'});
  delete f.tx.blessingStat; invalid(f.state);
  f.tx.blessingStat = 'STR'; f.tx.outputQuality = 'normal'; invalid(f.state);
});

test('mixed armor stores its inherited stat only when fixed output is blessed', () => {
  for (const outputQuality of ['normal', 'blessed']) {
    const f = pendingFixture({category: 'armor', qualities: ['normal', 'blessed'], stats: [undefined, 'CON'], scrollQuality: 'blessed', outputQuality});
    valid(f.state);
    if (outputQuality === 'normal') f.tx.blessingStat = 'CON'; else delete f.tx.blessingStat;
    invalid(f.state);
  }
});

test('legacy pending without recipeRevision keeps its old success and does not require scrolls', () => {
  for (const success of [true, false]) for (const plus of [0, 6, 16]) {
    const f = pendingFixture({plus});
    f.state.fusion.pending = {id: '1', uids: [...f.tx.uids], itemId: f.tx.itemId, plus, success};
    delete f.state.inventory.scrolls;
    const before = structuredClone(f.state);
    valid(f.state);
    assert.deepEqual(f.state, before);
  }
});

test('unknown pending and receipt revisions are rejected instead of treated as legacy', () => {
  for (const revision of [0, 2, '1', null, false]) {
    const f = pendingFixture(); f.tx.recipeRevision = revision; invalid(f.state);
    const state = fresh(); state.fusion = {next: '2', applied: '1', pending: null, receipts: [{id: '1', itemId: 'EQ-DAGGER', plus: 0, success: true, uids: ['e100', 'e101'], recipeRevision: revision}]}; invalid(state);
  }
});

test('validation is pure and never samples a pending result', t => {
  t.mock.method(Math, 'random', () => {throw new Error('Validation must not draw randomness');});
  for (const success of [true, false]) {
    const f = pendingFixture({qualities: ['blessed', 'normal'], scrollQuality: 'blessed', outputQuality: 'blessed', success});
    const before = structuredClone(f.state); deepFreeze(f.state);
    valid(f.state); valid(f.state);
    assert.deepEqual(f.state, before);
  }
});
