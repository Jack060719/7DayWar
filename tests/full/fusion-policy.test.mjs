// New recovery acceptance tests; no original Stage 3 test bytes were recovered.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FUSION_SCROLLS, FUSION_SCROLL_BY_ID, FUSION_BLESSING_STATS,
  FUSION_RISK_POLICY, fusionScrollId, fusionScrollTier,
  fusionChanceBasisPoints, fusionChance, fusionRecipe
} from '../../dist/full/fusion-policy.mjs';
import {
  isFusionScroll, fusionScrolls, fusionScroll, countFusionScrolls,
  fusionScrollName, fusionScrollInstance
} from '../../dist/full/fusion-inventory.mjs';

const gear = (uid, itemId, plus, extra = {}) => ({uid, itemId, plus, identified: true, cursed: false, durability: 100, ...extra});
function fixture({category = 'weapon', plus = 0, scrollQuality = 'normal', qualities = ['normal', 'normal'], stats = []} = {}) {
  const itemId = category === 'weapon' ? 'EQ-DAGGER' : 'EQ-LEATHER-ARMOR';
  const state = {
    rng: 9876, nextId: '10', equipped: {},
    inventory: {equipment: [gear('e1', itemId, plus, {quality: qualities[0]}), gear('e2', itemId, plus, {quality: qualities[1]})], stacks: {},
      scrolls: [fusionScrollInstance('scroll3', fusionScrollId(category, fusionScrollTier(plus), scrollQuality))]},
    storage: {equipment: [], stacks: {}}, fusion: {next: '1', applied: '0', pending: null, receipts: []}
  };
  stats.forEach((stat, i) => {state.inventory.equipment[i].blessingStat = stat;});
  return {state, request: {uids: ['e1', 'e2'], scrollUid: 'scroll3'}};
}
function deepFreeze(object) {
  Object.freeze(object);
  for (const value of Object.values(object)) if (value && typeof value === 'object' && !Object.isFrozen(value)) deepFreeze(value);
  return object;
}

test('twelve distinct frozen scroll definitions cover all category/tier/quality combinations', () => {
  assert.equal(FUSION_SCROLLS.length, 12);
  assert.equal(new Set(FUSION_SCROLLS.map(item => item.id)).size, 12);
  for (const category of ['weapon', 'armor']) for (const tier of ['basic', 'intermediate', 'advanced']) for (const quality of ['normal', 'blessed']) {
    const id = `ITEM-FUSION-${category.toUpperCase()}-${tier.toUpperCase()}-${quality.toUpperCase()}`;
    assert.equal(fusionScrollId(category, tier, quality), id);
    const item = FUSION_SCROLL_BY_ID[id];
    assert.equal(item.category, category);
    assert.equal(item.tier, tier);
    assert.equal(item.quality, quality);
    assert.equal(item.stackable, false);
    assert.equal(item.weight, 1);
    assert.ok(Object.isFrozen(item));
  }
  assert.ok(Object.isFrozen(FUSION_SCROLLS));
  assert.ok(Object.isFrozen(FUSION_SCROLL_BY_ID));
  assert.throws(() => fusionScrollId('weapon', 'high'));
  assert.throws(() => fusionScrollId('helmet', 'basic'));
  assert.throws(() => fusionScrollId('armor', 'basic', 'cursed'));
});

test('tier boundaries are based on input +N, including an unbounded advanced tier', () => {
  for (const n of [0, 1, 6, 9]) assert.equal(fusionScrollTier(n), 'basic');
  for (const n of [10, 11, 15]) assert.equal(fusionScrollTier(n), 'intermediate');
  for (const n of [16, 17, 99, Number.MAX_SAFE_INTEGER - 1]) assert.equal(fusionScrollTier(n), 'advanced');
  for (const n of [-1, 1.5, NaN, Infinity, '6', null, Number.MAX_SAFE_INTEGER]) assert.throws(() => fusionScrollTier(n));
});

test('safe outputs end at weapon +6 and armor +4 with no success roll', () => {
  for (const [category, safeMaxInput] of [['weapon', 5], ['armor', 3]]) {
    for (let plus = 0; plus <= safeMaxInput; plus++) for (const scrollQuality of ['normal', 'blessed']) {
      const {state, request} = fixture({category, plus, scrollQuality});
      const recipe = fusionRecipe(state, request);
      assert.equal(recipe.ok, true);
      assert.equal(recipe.outputPlus, plus + 1);
      assert.equal(recipe.chanceBasisPoints, 10000);
      assert.equal(recipe.chance, 1);
      assert.equal(recipe.guaranteed, true);
      assert.equal(recipe.requiresSuccessRoll, false);
    }
    const {state, request} = fixture({category, plus: safeMaxInput + 1});
    assert.equal(fusionRecipe(state, request).guaranteed, false);
    assert.equal(fusionRecipe(state, request).requiresSuccessRoll, true);
    assert.equal(fusionRecipe(state, request).chanceBasisPoints, 9500);
  }
});

test('provisional risk rates and blessing bonus are exact basis points', () => {
  assert.equal(FUSION_RISK_POLICY.origin, 'assistant_design_provisional');
  for (const category of ['weapon', 'armor']) for (const [plus, normal] of [[6, 9500], [9, 9500], [10, 9000], [15, 9000], [16, 8500], [100, 8500]]) {
    assert.equal(fusionChanceBasisPoints(plus, category), normal);
    assert.equal(fusionChanceBasisPoints(plus, category, 'blessed'), normal + 300);
    assert.equal(fusionChance(plus, category, 'blessed'), (normal + 300) / 10000);
  }
  assert.equal(fusionChanceBasisPoints(4, 'weapon'), 10000);
  assert.equal(fusionChanceBasisPoints(4, 'armor'), 9500);
  assert.throws(() => fusionChance(6, 'invalid'));
  assert.throws(() => fusionChance(6, 'weapon', 'invalid'));
});

test('different instance IDs and matching canonical IDs and plus values are mandatory', () => {
  for (const mutate of [
    ({request}) => {request.uids = ['e1', 'e1'];},
    ({request}) => {request.uids = ['e1'];},
    ({request}) => {request.uids = ['e1', 'missing'];},
    ({state}) => {state.inventory.equipment[1].itemId = 'EQ-SHORT-SWORD';},
    ({state}) => {state.inventory.equipment[1].plus = 1;},
    ({state}) => {state.inventory.equipment.forEach(item => {item.plus = -1;});},
    ({state}) => {state.inventory.equipment.forEach(item => {item.plus = .5;});},
    ({state}) => {state.inventory.equipment.forEach(item => {item.plus = Number.MAX_SAFE_INTEGER;});},
    ({state}) => {state.inventory.equipment.forEach(item => {item.itemId = 'ITEM-RED-POTION';});},
    ({state}) => {state.inventory.equipment.push({...state.inventory.equipment[0]});}
  ]) {
    const f = fixture(); mutate(f);
    assert.equal(fusionRecipe(f.state, f.request).ok, false);
  }
});

test('both gear inputs must be identified, unequipped and uncursed', () => {
  for (const index of [0, 1]) for (const restriction of ['identified', 'cursed', 'equipped']) {
    const {state, request} = fixture();
    if (restriction === 'equipped') state.equipped.weapon = state.inventory.equipment[index].uid;
    else state.inventory.equipment[index][restriction] = restriction === 'cursed';
    assert.equal(fusionRecipe(state, request).error, 'unavailable_inputs');
  }
});

test('scroll must be an identified unique carried instance, never a stack or storage substitute', () => {
  for (const mutate of [
    ({state}) => {delete state.inventory.scrolls;},
    ({state}) => {state.inventory.scrolls[0].identified = false;},
    ({state}) => {state.inventory.stacks[state.inventory.scrolls[0].itemId] = 50; delete state.inventory.scrolls;},
    ({state}) => {state.storage.scrolls = state.inventory.scrolls; state.inventory.scrolls = [];},
    ({state}) => {state.inventory.scrolls.push({...state.inventory.scrolls[0]});},
    ({state}) => {state.storage.scrolls = [{...state.inventory.scrolls[0]}];},
    ({state}) => {state.storage.equipment = [{...state.inventory.equipment[0]}];},
    ({state, request}) => {state.inventory.scrolls[0].uid = request.scrollUid = 'e1';},
    ({state}) => {state.inventory.scrolls[0].itemId = 'ITEM-IDENTIFY-SCROLL';},
    ({state}) => {state.inventory.scrolls = {};}
  ]) {
    const f = fixture(); mutate(f);
    assert.equal(fusionRecipe(f.state, f.request).ok, false);
  }
});

test('scroll category and input-derived tier must match exactly', () => {
  for (const category of ['weapon', 'armor']) for (const plus of [0, 9, 10, 15, 16]) {
    const {state, request} = fixture({category, plus});
    for (const scroll of FUSION_SCROLLS.filter(item => item.quality === 'normal')) {
      state.inventory.scrolls[0].itemId = scroll.id;
      assert.equal(fusionRecipe(state, request).ok, scroll.category === category && scroll.tier === fusionScrollTier(plus));
    }
  }
});

test('missing legacy gear quality means normal without migration or blessings', () => {
  for (const scrollQuality of ['normal', 'blessed']) {
    const {state, request} = fixture({scrollQuality});
    state.inventory.equipment.forEach(item => {delete item.quality;});
    const before = structuredClone(state);
    const recipe = fusionRecipe(state, request);
    assert.equal(recipe.ok, true);
    assert.equal(recipe.outputQuality, 'normal');
    assert.equal(recipe.output.quality, 'normal');
    assert.equal(recipe.blessedChanceBasisPoints, 0);
    assert.equal(recipe.requiresBlessingRoll, false);
    assert.deepEqual(state, before);
  }
});

test('any blessed input requires a blessed scroll, and two normals never gain blessing from a scroll', () => {
  for (const qualities of [['normal', 'normal'], ['normal', 'blessed'], ['blessed', 'normal'], ['blessed', 'blessed']]) {
    for (const scrollQuality of ['normal', 'blessed']) {
      const {state, request} = fixture({qualities, scrollQuality});
      const recipe = fusionRecipe(state, request);
      const n = qualities.filter(quality => quality === 'blessed').length;
      if (n && scrollQuality === 'normal') assert.equal(recipe.error, 'blessed_scroll_required');
      else {
        assert.equal(recipe.ok, true);
        assert.equal(recipe.outputQuality, ['normal', 'mixed', 'blessed'][n]);
        assert.equal(recipe.blessedChanceBasisPoints, n * 5000);
        assert.equal(recipe.requiresBlessingRoll, n === 1);
        assert.equal(recipe.output.quality, n === 1 ? undefined : qualities[0]);
      }
    }
  }
});

test('mixed safe fusion requires only a conditional blessing roll, never a success roll', () => {
  const {state, request} = fixture({category: 'armor', plus: 3, qualities: ['blessed', 'normal'], scrollQuality: 'blessed', stats: ['WIS']});
  const recipe = fusionRecipe(state, request);
  assert.equal(recipe.ok, true);
  assert.equal(recipe.requiresSuccessRoll, false);
  assert.equal(recipe.requiresBlessingRoll, true);
  assert.equal(recipe.blessedChanceBasisPoints, 5000);
  assert.equal(recipe.blessingStat, 'WIS');
  assert.equal(recipe.output.quality, undefined);
  assert.equal(recipe.output.blessingStat, undefined);
});

test('different blessed armor attributes require preserving one explicit valid input choice', () => {
  const {state, request} = fixture({category: 'armor', qualities: ['blessed', 'blessed'], scrollQuality: 'blessed', stats: ['STR', 'WIS']});
  assert.equal(fusionRecipe(state, request).error, 'blessing_choice_required');
  for (const blessingStat of ['STR', 'WIS']) {
    const recipe = fusionRecipe(state, {...request, blessingStat});
    assert.equal(recipe.ok, true);
    assert.equal(recipe.outputQuality, 'blessed');
    assert.equal(recipe.requiresBlessingRoll, false);
    assert.equal(recipe.output.blessingStat, blessingStat);
  }
  for (const blessingStat of ['DEX', 'CHA', '', null]) assert.equal(fusionRecipe(state, {...request, blessingStat}).error, 'invalid_blessing_choice');
});

test('same blessed armor stat is preserved automatically; provisional whitelist excludes CHA', () => {
  assert.deepEqual(FUSION_BLESSING_STATS, ['STR', 'DEX', 'CON', 'INT', 'WIS']);
  for (const stat of FUSION_BLESSING_STATS) {
    const {state, request} = fixture({category: 'armor', qualities: ['blessed', 'blessed'], scrollQuality: 'blessed', stats: [stat, stat]});
    assert.equal(fusionRecipe(state, request).output.blessingStat, stat);
    assert.equal(fusionRecipe(state, {...request, blessingStat: 'other'}).ok, false);
  }
  for (const stat of ['CHA', 'str', '', null, 1, undefined]) {
    const {state, request} = fixture({category: 'armor', qualities: ['blessed', 'blessed'], scrollQuality: 'blessed', stats: [stat, stat]});
    assert.equal(fusionRecipe(state, request).error, 'invalid_blessing_stat');
  }
});

test('unsupported explicit gear qualities and fabricated blessing choices are rejected', () => {
  for (const quality of ['rare', 'cursed', null, 1]) {
    const {state, request} = fixture({qualities: [quality, 'normal']});
    assert.equal(fusionRecipe(state, request).error, 'invalid_quality');
  }
  const {state, request} = fixture();
  assert.equal(fusionRecipe(state, {...request, blessingStat: 'STR'}).error, 'invalid_blessing_choice');
});

test('recipes are deterministic and do not read RNG, mutate inputs or alter legacy pending transactions', t => {
  t.mock.method(Math, 'random', () => {throw new Error('Probability RNG must not be used by policy');});
  for (const plus of [0, 6, 10, 16]) {
    const {state, request} = fixture({plus, qualities: ['blessed', 'normal'], scrollQuality: 'blessed'});
    state.fusion.pending = {id: '99', uids: ['old1', 'old2'], success: false, plus: 3};
    const before = structuredClone(state);
    Object.defineProperty(state, 'rng', {get() {throw new Error('State RNG must not be read by policy');}, enumerable: false});
    deepFreeze(state); deepFreeze(request);
    const first = fusionRecipe(state, request);
    assert.equal(first.ok, true);
    assert.deepEqual(fusionRecipe(state, request), first);
    assert.deepEqual(state.fusion, before.fusion);
    assert.deepEqual(state.inventory, before.inventory);
    assert.equal(state.nextId, before.nextId);
    first.uids[0] = 'changed-output';
    first.output.plus = 123;
    assert.equal(request.uids[0], 'e1');
    assert.equal(state.inventory.equipment[0].plus, plus);
  }
});

test('runtime equipment can be provided without making policy depend on the runtime data module', () => {
  const {state, request} = fixture({category: 'armor'});
  state.inventory.equipment.forEach(item => {item.itemId = 'EQ-RUNTIME-ARMOR';});
  assert.equal(fusionRecipe(state, request).ok, false);
  assert.equal(fusionRecipe(state, request, {'EQ-RUNTIME-ARMOR': {slot: 'armor', enchantable: true}}).ok, true);
  assert.equal(fusionRecipe(state, request, {'EQ-RUNTIME-ARMOR': {slot: 'armor', enchantable: false}}).ok, false);
});

test('optional inventory/storage arrays and pure count/lookup helpers support old bags', () => {
  const itemId = fusionScrollId('weapon', 'basic');
  assert.deepEqual(fusionScrolls({equipment: [], stacks: {}}), []);
  assert.equal(countFusionScrolls({inventory: {equipment: [], stacks: {}}}), 0);
  assert.equal(fusionScroll({}, 'missing'), null);
  const a = fusionScrollInstance('s1', itemId), b = fusionScrollInstance('s2', itemId, false);
  const bag = deepFreeze({scrolls: [a, b], stacks: {[itemId]: 999}});
  assert.equal(countFusionScrolls(bag, itemId), 2);
  assert.equal(countFusionScrolls(bag, itemId, {identifiedOnly: true}), 1);
  assert.equal(countFusionScrolls(bag), 2);
  assert.equal(countFusionScrolls(bag, 'unknown'), 0);
  assert.equal(fusionScroll({inventory: bag}, 's1'), a);
  assert.equal(fusionScroll({scrolls: [a, {...a}]}, 's1'), null);
  const copy = fusionScrolls(bag); copy.pop();
  assert.equal(bag.scrolls.length, 2);
  assert.equal(countFusionScrolls({storage: bag}.storage), 2);
  assert.equal(isFusionScroll(itemId), true);
  assert.equal(isFusionScroll('__proto__'), false);
  assert.throws(() => fusionScrollInstance('', itemId));
  assert.throws(() => fusionScrollInstance('s1', 'unknown'));
  assert.throws(() => fusionScrollInstance('s1', itemId, 1));
});

test('unidentified scroll names reveal neither category, tier nor blessing', () => {
  const names = new Set(FUSION_SCROLLS.map((item, i) => fusionScrollName(fusionScrollInstance(`s${i}`, item.id, false))));
  assert.deepEqual([...names], ['未鑑定的融合卷']);
  assert.equal(fusionScrollName({itemId: 'unknown', identified: false}), '未鑑定的融合卷');
  for (const item of FUSION_SCROLLS) assert.equal(fusionScrollName({itemId: item.id, identified: true}), item.name_zh);
});
