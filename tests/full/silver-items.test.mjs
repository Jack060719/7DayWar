import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CONTENT } from '../../dist/full/catalog.mjs';

const catalogBeforeImport = structuredClone(CONTENT);
const { SILVER_ITEMS, SOURCE_ITEM_MAPPING, SILVER_ITEM_SOURCE } =
  await import('../../dist/full/silver-items.mjs');
const source = JSON.parse(fs.readFileSync(new URL(
  '../fixtures/monster12-drop-groups60.json', import.meta.url), 'utf8'));
const typed = JSON.parse(fs.readFileSync(new URL(
  '../fixtures/monster12-normalized-typed.json', import.meta.url), 'utf8'));
const baseline = Object.fromEntries([
  ...CONTENT.items, ...CONTENT.equipment, ...CONTENT.skill_books,
].map(item => [item.id, item]));
const fusionReferences = new Set([
  'ITEM-FUSION-WEAPON-BASIC-NORMAL', 'ITEM-FUSION-ARMOR-BASIC-NORMAL',
]);
const expectedNew = {
  'EQ-DWARF-DAGGER': '小侏儒短劍',
  'EQ-DWARF-CLOAK': '侏儒斗篷',
  'EQ-DWARF-HELMET': '侏儒鐵盔',
  'EQ-DWARF-SHIELD': '侏儒圓盾',
  'EQ-HUNTER-BOW': '獵人弓',
  'EQ-GREAT-AXE': '大斧',
  'EQ-SILVER-AXE': '銀斧',
  'EQ-ROUGH-MITHRIL-DAGGER': '粗糙的米特利短劍',
  'EQ-STEEL-HELMET': '鋼盔',
  'EQ-YAOMO-DAGGER': '妖魔短劍',
  'EQ-SILVER-STUDDED-LEATHER': '銀釘皮甲',
  'ITEM-METAL-CHUNK': '金屬塊',
  'ITEM-STRONG-GREEN-POTION': '強化綠色藥水',
  'ITEM-CONCENTRATED-STRONG-HEALING-POTION': '濃縮強力體力恢復劑',
};

test('all 60 independently recovered groups keep source order, names and unknown rates', () => {
  assert.deepEqual(SILVER_ITEM_SOURCE, source.source);
  assert.equal(SOURCE_ITEM_MAPPING.length, 60);
  assert.equal(new Set(SOURCE_ITEM_MAPPING.map(group => group.monster_id)).size, 12);
  assert.deepEqual(SOURCE_ITEM_MAPPING.map(group => ({
    monster_source_name: group.monster_source_name,
    source_group_index: group.source_group_index,
    source_text: group.source_text,
    spellbook_members_source: group.spellbook_members_source,
    confirmed_later_semantic_mapping: group.confirmed_later_semantic_mapping,
    mapping_source: group.mapping_source,
    canonical_item_id: null,
    drop_probability: group.drop_probability,
    quantity: group.quantity,
  })), source.groups);
  assert.deepEqual(SOURCE_ITEM_MAPPING.map(group => group.source_text),
    typed.monsters.flatMap(monster => monster.drop_groups.map(group => group.source_text)));
});

test('every group resolves to real distinct items or books; only 3 external fusion references', () => {
  const external = SOURCE_ITEM_MAPPING.filter(group => fusionReferences.has(group.item_id));
  assert.equal(external.length, 3);
  assert.equal(SOURCE_ITEM_MAPPING.flatMap(group => group.item_ids).length, 64);
  for (const group of SOURCE_ITEM_MAPPING) {
    assert(group.item_ids.length > 0);
    assert.equal(group.canonical_item_id, group.item_id);
    for (const id of group.item_ids) {
      assert(baseline[id] || SILVER_ITEMS[id] || fusionReferences.has(id), `Unresolved ${id}`);
    }
    if (!group.spellbook_members.length) assert.deepEqual(group.item_ids, [group.item_id]);
  }
  assert.deepEqual(Object.fromEntries(Object.entries(SILVER_ITEMS).map(([id, item]) =>
    [id, item.name_zh])), expectedNew);
  for (const [id, name] of Object.entries(expectedNew)) {
    assert(!baseline[id], `${id} must not replace a baseline item`);
    const mappings = SOURCE_ITEM_MAPPING.filter(group => group.source_text === name);
    assert(mappings.length > 0);
    assert(mappings.every(group => group.item_id === id));
  }
  for (const id of fusionReferences) assert(!SILVER_ITEMS[id]);
});

test('source synonyms and tribal totems resolve deliberately without adding fire arrows', () => {
  const get = (monster, name) => SOURCE_ITEM_MAPPING.find(group =>
    group.monster_source_name === monster && group.source_text === name);
  assert.equal(get('哥布林', '短劍').item_id, 'EQ-SHORT-SWORD');
  assert.equal(get('哥布林', '小紅水').item_id, 'ITEM-RED-POTION');
  assert.equal(get('妖魔鬥士', '中紅水').item_id, 'ITEM-ORANGE-POTION');
  assert.equal(get('哈柏哥布林', '燈').item_id, 'ITEM-LANTERN');
  assert.equal(get('妖魔弓箭手', '箭矢').item_id, 'ITEM-ARROW');
  assert.equal(get('妖魔弓箭手', '綠色藥水').item_id, 'ITEM-GREEN-POTION');
  assert.equal(get('妖魔法師', '魔力藥水（藍水）').item_id, 'ITEM-BLUE-POTION');
  assert.equal(get('甘地妖魔', '圖騰').item_id, 'ITEM-TOTEM-GANDI');
  assert.equal(get('阿吐巴妖魔', '圖騰').item_id, 'ITEM-TOTEM-ATUBA');
  assert.equal(get('狼人', '木棒').item_id, 'EQ-CLUB');
  assert(SOURCE_ITEM_MAPPING.every(group => !group.item_ids.some(id => /FIRE.*ARROW/.test(id))));
  assert.equal(SILVER_ITEMS['EQ-HUNTER-BOW'].requires_ammunition, 'ITEM-ARROW');
});

test('spellbook member mapping distinguishes the explicit fireball synonym from exact names', () => {
  const groups = SOURCE_ITEM_MAPPING.filter(group => group.spellbook_members.length);
  assert.equal(groups.length, 3);
  assert.deepEqual(groups.map(group => group.item_ids), [
    ['BOOK-G01-01', 'BOOK-G04-01'],
    ['BOOK-G04-04', 'BOOK-G04-02'],
    ['BOOK-G04-04', 'BOOK-G04-02', 'BOOK-G04-05'],
  ]);
  for (const group of groups) {
    assert.equal(group.item_id, null);
    assert.deepEqual(group.spellbook_members.map(member => member.source_name), group.spellbook_members_source);
    for (const member of group.spellbook_members) {
      const book = baseline[member.book_id];
      assert.equal(member.book_name, book.name_zh);
      assert.equal(member.skill_id, book.skill_id);
      assert.equal(member.current_name, CONTENT.skills.find(skill => skill.id === book.skill_id).name_zh);
      if (member.source_name === '火球術') {
        assert.equal(member.current_name, '燃燒的火球');
        assert.equal(member.mapping_basis, 'explicit_source_synonym');
      } else {
        assert.equal(member.source_name, member.current_name);
        assert.equal(member.mapping_basis, 'exact_current_skill_name');
      }
    }
  }
});

test('new equipment has disclosed baseline statistics and explicit named materials', () => {
  for (const item of Object.values(SILVER_ITEMS)) {
    assert.equal(item.reconstruction_status, 'new_provisional_definition_not_original_lost_artifact');
    assert.equal(item.evidence_tier, 'assistant_design_provisional_reimplementation');
    assert(item.provisional_fields.length);
    assert(baseline[item.baseline_item_id]);
    if (item.slot) {
      assert.deepEqual(item.stats, baseline[item.baseline_item_id].stats);
      assert.notEqual(item.stats, baseline[item.baseline_item_id].stats);
      assert(item.provisional_fields.includes('stats'));
    }
  }
  assert.equal(SILVER_ITEMS['EQ-SILVER-AXE'].material, 'silver');
  assert.equal(SILVER_ITEMS['EQ-ROUGH-MITHRIL-DAGGER'].material, 'mithril');
  assert.equal(SILVER_ITEMS['EQ-STEEL-HELMET'].material, 'steel');
  assert.equal(SILVER_ITEMS['EQ-SILVER-STUDDED-LEATHER'].material, 'silver');
  assert.deepEqual(SILVER_ITEMS['EQ-SILVER-STUDDED-LEATHER'].material_components, ['leather', 'silver']);
});

test('provisional potion contract specifies 600s haste and 45–65 healing with shared cooldown', () => {
  const strong = SILVER_ITEMS['ITEM-STRONG-GREEN-POTION'];
  const heal = SILVER_ITEMS['ITEM-CONCENTRATED-STRONG-HEALING-POTION'];
  assert.deepEqual(strong.runtime_use, {
    kind: 'buff', group: 'haste', values: { haste: 1.33 },
    duration_seconds: 600, strength: 1, cooldown_seconds: 1,
  });
  assert.deepEqual(heal.runtime_use, {
    kind: 'heal', min: 45, max: 65, cooldown_seconds: 1, blocked_by: 'potionBlock',
  });
  assert(strong.provisional_fields.includes('runtime_use'));
  assert(heal.provisional_fields.includes('runtime_use'));
  assert.match(strong.effect, /動作與移動/);
  assert.match(strong.effect, /只刷新、不疊加/);
  assert.match(strong.effect, /暫定/);
  assert.match(heal.effect, /暫定/);
});

test('exports are deeply immutable and importing them leaves all baseline catalog data intact', () => {
  function assertDeepFrozen(value) {
    if (!value || typeof value !== 'object') return;
    assert(Object.isFrozen(value));
    Object.values(value).forEach(assertDeepFrozen);
  }
  assertDeepFrozen(SILVER_ITEMS);
  assertDeepFrozen(SOURCE_ITEM_MAPPING);
  assertDeepFrozen(SILVER_ITEM_SOURCE);
  assert.throws(() => { SILVER_ITEMS['EQ-DWARF-DAGGER'].stats.small_dice = '100d100'; }, TypeError);
  assert.throws(() => { SOURCE_ITEM_MAPPING[0].item_ids.push('ITEM-FIRE-ARROW'); }, TypeError);
  assert.deepEqual(CONTENT, catalogBeforeImport);
  assert(!Object.isFrozen(baseline['EQ-DAGGER'].stats), 'Do not freeze baseline objects through shared references');
});

test('reconstruction report matches the exported 14 definitions and 60 source mappings', () => {
  const report = JSON.parse(fs.readFileSync(new URL(
    '../fixtures/item-mapping-reconstructed.json', import.meta.url), 'utf8'));
  assert.equal(report.status, 'REIMPLEMENTED_FROM_VERIFIED_SOURCE_NOT_ORIGINAL_LOST_ARTIFACT');
  assert.deepEqual(report.source, SILVER_ITEM_SOURCE);
  assert.deepEqual(report.new_item_definitions, Object.values(SILVER_ITEMS));
  assert.deepEqual(report.groups, SOURCE_ITEM_MAPPING);
});
