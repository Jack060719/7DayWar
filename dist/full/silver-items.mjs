import { CONTENT } from './catalog.mjs';

// Reimplementation from the freshly verified source names and delivered Stage 2
// catalog. These are new provisional definitions, not the lost Stage 3 values.
const freeze = value => {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};
const clone = value => JSON.parse(JSON.stringify(value));
const baselineItems = Object.fromEntries([
  ...CONTENT.items, ...CONTENT.equipment, ...CONTENT.skill_books,
].map(item => [item.id, item]));

export const SILVER_ITEM_SOURCE = freeze({
  body_sha256: 'efa61ec0589b99ddb9dcb8fa6b8baae0256ce201e1249f3b7aee004376b927dd',
});

function provisionalItem(id, name, baselineId, overrides = {}) {
  const base = baselineItems[baselineId];
  if (!base) throw new Error(`Missing provisional item baseline: ${baselineId}`);
  return {
    ...clone(base),
    ...overrides,
    id,
    name_zh: name,
    acquisition: '銀騎士村周邊指定怪物主要掉落；見來源掉落群組。',
    source_ids: ['SRC-SILVER-MONSTER12'],
    evidence_tier: 'assistant_design_provisional_reimplementation',
    origin: 'assistant_design_provisional_reimplementation',
    reconstruction_status: 'new_provisional_definition_not_original_lost_artifact',
    source_name_verified: true,
    baseline_item_id: baselineId,
    provisional_fields: [...new Set([...Object.keys(base), ...Object.keys(overrides)])].filter(key =>
      !['id', 'name_zh', 'source_ids', 'evidence_tier', 'acquisition', 'material_basis', 'material_components'].includes(key)
      && !(key === 'material' && overrides.material_basis === 'explicit_source_name')),
    design_note_zh: '名稱取自已核對來源；數值與使用規則依最接近的第二階段物品暫定重建，不是找回的舊自訂數值。',
  };
}

export const SILVER_ITEMS = freeze(Object.fromEntries([
  provisionalItem('EQ-DWARF-DAGGER', '小侏儒短劍', 'EQ-DAGGER'),
  provisionalItem('EQ-DWARF-CLOAK', '侏儒斗篷', 'EQ-CLOAK'),
  provisionalItem('EQ-DWARF-HELMET', '侏儒鐵盔', 'EQ-HELMET'),
  provisionalItem('EQ-DWARF-SHIELD', '侏儒圓盾', 'EQ-SHIELD'),
  provisionalItem('EQ-HUNTER-BOW', '獵人弓', 'EQ-BOW'),
  provisionalItem('EQ-GREAT-AXE', '大斧', 'EQ-BATTLE-AXE'),
  provisionalItem('EQ-SILVER-AXE', '銀斧', 'EQ-BATTLE-AXE', {
    material: 'silver', material_basis: 'explicit_source_name',
  }),
  provisionalItem('EQ-ROUGH-MITHRIL-DAGGER', '粗糙的米特利短劍', 'EQ-DAGGER', {
    material: 'mithril', material_basis: 'explicit_source_name',
  }),
  provisionalItem('EQ-STEEL-HELMET', '鋼盔', 'EQ-HELMET', {
    material: 'steel', material_basis: 'explicit_source_name',
  }),
  provisionalItem('EQ-YAOMO-DAGGER', '妖魔短劍', 'EQ-DAGGER'),
  provisionalItem('EQ-SILVER-STUDDED-LEATHER', '銀釘皮甲', 'EQ-STUDDED-ARMOR', {
    material: 'silver', material_components: ['leather', 'silver'],
    material_basis: 'explicit_source_name',
  }),
  provisionalItem('ITEM-METAL-CHUNK', '金屬塊', 'ITEM-IRON', {
    effect: '製作材料；本次只建立獨立物品，不新增配方。',
  }),
  provisionalItem('ITEM-STRONG-GREEN-POTION', '強化綠色藥水', 'ITEM-GREEN-POTION', {
    effect: '暫定：動作與移動間隔除1.33，持續600秒；與一般加速共用haste群組，只刷新、不疊加。',
    runtime_use: {
      kind: 'buff', group: 'haste', values: { haste: 1.33 },
      duration_seconds: 600, strength: 1, cooldown_seconds: 1,
    },
  }),
  provisionalItem('ITEM-CONCENTRATED-STRONG-HEALING-POTION', '濃縮強力體力恢復劑', 'ITEM-ORANGE-POTION', {
    effect: '暫定：恢復均勻整數45至65HP；治癒藥水共享冷卻1秒，受藥水霜化限制。',
    runtime_use: {
      kind: 'heal', min: 45, max: 65, cooldown_seconds: 1,
      blocked_by: 'potionBlock',
    },
  }),
].map(item => [item.id, item])));

// Only the source's generic potion/utility names are resolved as synonyms.
// Distinct equipment and material names above retain distinct canonical IDs.
const sourceGroups = [
  ['哥布林', 'MON-GOBLIN', [
    ['短劍', 'EQ-SHORT-SWORD'],
    ['皮帽', 'EQ-LEATHER-CAP'],
    ['小紅水', 'ITEM-RED-POTION'],
    ['金幣', 'ITEM-ADENA'],
  ]],
  ['哈柏哥布林', 'MON-HOBGOBLIN', [
    ['闊劍', 'EQ-BROAD-SWORD'],
    ['鋼盔', 'EQ-STEEL-HELMET'],
    ['燈', 'ITEM-LANTERN'],
    ['自我加速藥水', 'ITEM-GREEN-POTION'],
    ['強化綠色藥水', 'ITEM-STRONG-GREEN-POTION'],
    ['濃縮強力體力恢復劑', 'ITEM-CONCENTRATED-STRONG-HEALING-POTION'],
    ['金幣', 'ITEM-ADENA'],
  ]],
  ['侏儒', 'MON-DWARF', [
    ['小侏儒短劍', 'EQ-DWARF-DAGGER'],
    ['侏儒斗篷', 'EQ-DWARF-CLOAK'],
    ['侏儒鐵盔', 'EQ-DWARF-HELMET'],
    ['侏儒圓盾', 'EQ-DWARF-SHIELD'],
    ['金幣', 'ITEM-ADENA'],
  ]],
  ['侏儒戰士', 'MON-DWARF-WARRIOR', [
    ['侏儒斗篷', 'EQ-DWARF-CLOAK'],
    ['侏儒圓盾', 'EQ-DWARF-SHIELD'],
    ['金屬塊', 'ITEM-METAL-CHUNK'],
    ['金幣', 'ITEM-ADENA'],
  ]],
  ['妖魔', 'MON-ORC', [
    ['妖魔短劍', 'EQ-YAOMO-DAGGER'],
    ['皮甲', 'EQ-LEATHER-ARMOR'],
    ['小紅水', 'ITEM-RED-POTION'],
    ['金幣', 'ITEM-ADENA'],
  ]],
  ['妖魔弓箭手', 'MON-ORC-ARCHER', [
    ['獵人弓', 'EQ-HUNTER-BOW'],
    ['箭矢', 'ITEM-ARROW'],
    ['綠色藥水', 'ITEM-GREEN-POTION'],
    ['金幣', 'ITEM-ADENA'],
  ]],
  ['妖魔鬥士', 'MON-ORC-FIGHTER', [
    ['大斧', 'EQ-GREAT-AXE'],
    ['銀斧', 'EQ-SILVER-AXE'],
    ['中紅水', 'ITEM-ORANGE-POTION'],
    ['對武器施法的卷軸（武卷）', 'ITEM-FUSION-WEAPON-BASIC-NORMAL'],
    ['金幣', 'ITEM-ADENA'],
  ]],
  ['甘地妖魔', 'MON-GANDI', [
    ['圖騰', 'ITEM-TOTEM-GANDI'],
    ['中紅水', 'ITEM-ORANGE-POTION'],
    ['粗糙的米特利短劍', 'EQ-ROUGH-MITHRIL-DAGGER'],
    ['金幣', 'ITEM-ADENA'],
  ]],
  ['妖魔法師', 'MON-ORC-WIZARD', [
    ['魔法書（初級治癒術/火球術）', [
      ['初級治癒術', 'BOOK-G01-01'], ['火球術', 'BOOK-G04-01'],
    ]],
    ['魔力藥水（藍水）', 'ITEM-BLUE-POTION'],
    ['金幣', 'ITEM-ADENA'],
  ]],
  ['阿吐巴妖魔', 'MON-ATUBA', [
    ['圖騰', 'ITEM-TOTEM-ATUBA'],
    ['大斧', 'EQ-GREAT-AXE'],
    ['對防具施法的卷軸（防卷）', 'ITEM-FUSION-ARMOR-BASIC-NORMAL'],
    ['金幣', 'ITEM-ADENA'],
  ]],
  ['狼人', 'MON-WEREWOLF', [
    ['木棒', 'EQ-CLUB'],
    ['長劍', 'EQ-LONG-SWORD'],
    ['銀釘皮甲', 'EQ-SILVER-STUDDED-LEATHER'],
    ['小盾牌', 'EQ-SMALL-SHIELD'],
    ['長靴', 'EQ-BOOTS'],
    ['魔法書（吸血鬼之吻/通暢氣脈術）', [
      ['吸血鬼之吻', 'BOOK-G04-04'], ['通暢氣脈術', 'BOOK-G04-02'],
    ]],
    ['肉', 'ITEM-MEAT'],
    ['金幣', 'ITEM-ADENA'],
  ]],
  ['萊肯', 'MON-LYCANTHROPE', [
    ['對武器施法的卷軸（武卷）', 'ITEM-FUSION-WEAPON-BASIC-NORMAL'],
    ['魔法書（吸血鬼之吻/通暢氣脈術/緩速術）', [
      ['吸血鬼之吻', 'BOOK-G04-04'], ['通暢氣脈術', 'BOOK-G04-02'],
      ['緩速術', 'BOOK-G04-05'],
    ]],
    ['戰斧', 'EQ-BATTLE-AXE'],
    ['銀釘皮甲', 'EQ-SILVER-STUDDED-LEATHER'],
    ['鱗甲', 'EQ-SCALE-MAIL'],
    ['大盾牌', 'EQ-LARGE-SHIELD'],
    ['鑽石', 'ITEM-DIAMOND'],
    ['金幣', 'ITEM-ADENA'],
  ]],
];

export const SOURCE_ITEM_MAPPING = freeze(sourceGroups.flatMap(
  ([monsterName, monsterId, groups]) => groups.map(([sourceText, target], index) => {
    const books = Array.isArray(target) ? target : [];
    const itemId = books.length ? null : target;
    const fusion = itemId?.startsWith('ITEM-FUSION-') || false;
    const item = SILVER_ITEMS[itemId] || baselineItems[itemId];
    if (!books.length && !fusion && !item) throw new Error(`Unresolved item: ${target}`);
    const spellbookMembers = books.map(([sourceName, bookId]) => {
      const book = baselineItems[bookId];
      if (!book?.skill_id) throw new Error(`Unresolved source spellbook: ${bookId}`);
      const skill = CONTENT.skills.find(row => row.id === book.skill_id);
      if (!skill) throw new Error(`Unresolved spellbook skill: ${book.skill_id}`);
      return {
        source_name: sourceName, current_name: skill.name_zh,
        book_id: bookId, book_name: book.name_zh, skill_id: book.skill_id,
        mapping_basis: sourceName === skill.name_zh ? 'exact_current_skill_name' : 'explicit_source_synonym',
      };
    });
    return {
      monster_source_name: monsterName,
      monster_id: monsterId,
      source_group_index: index + 1,
      source_text: sourceText,
      spellbook_members_source: books.map(([name]) => name),
      confirmed_later_semantic_mapping: fusion
        ? (itemId.includes('-WEAPON-') ? 'weapon_fusion_scroll' : 'armor_fusion_scroll') : null,
      mapping_source: fusion ? 'confirmed_fusion_scroll_semantics' : null,
      canonical_item_id: itemId,
      item_id: itemId,
      item_ids: books.length ? books.map(([, id]) => id) : [itemId],
      spellbook_members: spellbookMembers,
      mapping_kind: books.length ? 'spellbook_group' : fusion ? 'confirmed_fusion_scroll'
        : SILVER_ITEMS[itemId] ? 'distinct_provisional_item'
        : item.name_zh === sourceText ? 'exact_catalog_name' : 'source_synonym',
      // These remain unspecified by the source; the loot policy owns balancing.
      drop_probability: null,
      quantity: null,
    };
  }),
));
