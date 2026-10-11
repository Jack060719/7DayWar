// Reimplemented during recovery, 2026-10-10. These are not recovered Stage 3 bytes.
// This module describes recipes only: it cannot consume items, allocate IDs,
// resolve success/blessing rolls, or change an existing pending transaction.
import {CONTENT} from './catalog.mjs';

// Definitions deliberately have no dependency on data.mjs or engine.mjs, so the
// runtime item index can incorporate them without an import cycle.
const CATEGORIES = Object.freeze(['weapon', 'armor']);
const TIERS = Object.freeze(['basic', 'intermediate', 'advanced']);
const QUALITIES = Object.freeze(['normal', 'blessed']);
const categoryNames = {weapon: '武器', armor: '防具'};
const tierNames = {basic: '初階', intermediate: '中階', advanced: '高階'};
const EQUIPMENT_BY_ID = Object.freeze(Object.fromEntries(CONTENT.equipment.map(item => [item.id, item])));

export function fusionScrollId(category, tier, quality = 'normal') {
  if (!CATEGORIES.includes(category) || !TIERS.includes(tier) || !QUALITIES.includes(quality)) {
    throw new RangeError('Invalid fusion scroll category, tier or quality');
  }
  return `ITEM-FUSION-${category.toUpperCase()}-${tier.toUpperCase()}-${quality.toUpperCase()}`;
}

export const FUSION_SCROLLS = Object.freeze(CATEGORIES.flatMap(category =>
  TIERS.flatMap(tier => QUALITIES.map(quality => Object.freeze({
    id: fusionScrollId(category, tier, quality),
    name_zh: `${quality === 'blessed' ? '祝福的' : ''}${tierNames[tier]}${categoryNames[category]}融合卷軸`,
    family: 'fusion_scroll', category, tier, quality,
    weight: 1, stackable: false, tradeable: true, binding: 'none',
    effect: '消耗一張，以兩件同型且同強化值的裝備進行融合。',
    origin: 'reimplemented_fusion_scrolls_20261010'
  })))
));
export const FUSION_SCROLL_BY_ID = Object.freeze(Object.fromEntries(FUSION_SCROLLS.map(item => [item.id, item])));
// These five possible armor attributes are preserved provisional design.
export const FUSION_BLESSING_STATS = Object.freeze(['STR', 'DEX', 'CON', 'INT', 'WIS']);

export const FUSION_POLICY_VERSION = 'fusion-reimplemented-20261010-v1';
// Risky chances remain provisional assistant tuning, not brother-specified rates.
export const FUSION_RISK_POLICY = Object.freeze({
  origin: 'assistant_design_provisional',
  basic: 9500, intermediate: 9000, advanced: 8500,
  blessedBonusBasisPoints: 300
});

function validPlus(plus) {
  return Number.isSafeInteger(plus) && plus >= 0 && plus < Number.MAX_SAFE_INTEGER;
}

export function fusionScrollTier(plus) {
  if (!validPlus(plus)) throw new RangeError('Fusion input +N must be a nonnegative safe integer with room for +1');
  return plus <= 9 ? 'basic' : plus <= 15 ? 'intermediate' : 'advanced';
}

export function fusionChanceBasisPoints(plus, category = 'weapon', scrollQuality = 'normal') {
  const tier = fusionScrollTier(plus);
  if (!['weapon', 'armor'].includes(category) || !['normal', 'blessed'].includes(scrollQuality)) {
    throw new RangeError('Invalid fusion category or scroll quality');
  }
  if (plus < (category === 'weapon' ? 6 : 4)) return 10000;
  return FUSION_RISK_POLICY[tier] + (scrollQuality === 'blessed' ? FUSION_RISK_POLICY.blessedBonusBasisPoints : 0);
}

export function fusionChance(plus, category = 'weapon', scrollQuality = 'normal') {
  return fusionChanceBasisPoints(plus, category, scrollQuality) / 10000;
}

const fail = (error, message) => ({ok: false, error, message});
const qualityOf = item => item.quality === undefined ? 'normal' : item.quality;
const statOf = item => item.blessingStat ?? null;

/**
 * fusionRecipe(state, {uids: [firstUid, secondUid], scrollUid, blessingStat?}, items?)
 * Returns a pure plan. For mixed inputs outputQuality is "mixed" and output
 * omits quality; resolve blessedChanceBasisPoints only AFTER a success. The
 * blessingStat field is conditional metadata: attach it only to a blessed
 * result. Success is guaranteed when requiresSuccessRoll is false.
 */
export function fusionRecipe(state, request = {}, items = EQUIPMENT_BY_ID) {
  const {uids, scrollUid, blessingStat: choice} = request ?? {};
  if (!Array.isArray(uids) || uids.length !== 2 || uids.some(id => typeof id !== 'string' || !id) || uids[0] === uids[1]) {
    return fail('invalid_inputs', '請選擇兩件不同的裝備實例');
  }
  const bag = state?.inventory;
  if (!Array.isArray(bag?.equipment) || (bag.scrolls !== undefined && !Array.isArray(bag.scrolls))) {
    return fail('invalid_inventory', '背包資料無效');
  }
  const matches = uids.map(id => bag.equipment.filter(item => item?.uid === id));
  if (matches.some(items => items.length !== 1)) return fail('missing_inputs', '找不到唯一的融合裝備');
  const pair = matches.map(items => items[0]);
  const [a, b] = pair;
  const item = typeof a.itemId === 'string' && Object.hasOwn(items, a.itemId) ? items[a.itemId] : null;
  if (!item?.slot || item.enchantable !== true || a.itemId !== b.itemId || a.plus !== b.plus || !validPlus(a.plus)) {
    return fail('incompatible_inputs', '需要相同裝備與相同的非負整數強化值');
  }
  const equipped = Object.values(state.equipped ?? {});
  if (pair.some(gear => gear.identified !== true || gear.cursed || equipped.includes(gear.uid))) {
    return fail('unavailable_inputs', '裝備必須已鑑定、未穿戴且無詛咒');
  }
  const qualities = pair.map(qualityOf);
  if (qualities.some(quality => !['normal', 'blessed'].includes(quality))) {
    return fail('invalid_quality', '裝備品質無效');
  }
  const scrolls = (bag.scrolls ?? []).filter(entry => entry?.uid === scrollUid);
  const scroll = scrolls.length === 1 ? scrolls[0] : null;
  if (typeof scrollUid !== 'string' || !scrollUid || !scroll || scroll.identified !== true
    || !Object.hasOwn(FUSION_SCROLL_BY_ID, scroll.itemId)) {
    return fail('unavailable_scroll', '請選擇一張已鑑定的融合卷軸');
  }
  // Identity must be unique across both bags and gear/scroll collections. This
  // rejects malformed saves instead of accidentally consuming an aliased UID.
  for (const id of [...uids, scrollUid]) {
    let occurrences = 0;
    for (const container of [bag, state.storage]) {
      for (const key of ['equipment', 'scrolls']) {
        for (const entry of Array.isArray(container?.[key]) ? container[key] : []) {
          if (entry?.uid === id) occurrences++;
        }
      }
    }
    if (occurrences !== 1) return fail('duplicate_uid', '材料實例編號重複');
  }
  const category = item.slot === 'weapon' ? 'weapon' : 'armor';
  const tier = fusionScrollTier(a.plus);
  const scrollItem = FUSION_SCROLL_BY_ID[scroll.itemId];
  if (scrollItem.category !== category || scrollItem.tier !== tier) {
    return fail('wrong_scroll', '融合卷軸的裝備種類或階級不符');
  }
  const blessedInputs = pair.filter((gear, i) => qualities[i] === 'blessed');
  if (blessedInputs.length && scrollItem.quality !== 'blessed') {
    return fail('blessed_scroll_required', '含祝福裝備的融合需要祝福融合卷軸');
  }
  let blessingStat = null;
  if (category === 'armor' && blessedInputs.length) {
    const stats = blessedInputs.map(statOf);
    if (stats.some(stat => !FUSION_BLESSING_STATS.includes(stat))) {
      return fail('invalid_blessing_stat', '裝備祝福屬性無效');
    }
    if (stats.length === 2 && stats[0] !== stats[1]) {
      if (choice === undefined) return fail('blessing_choice_required', '請選擇要保留的其中一項祝福屬性');
      if (!stats.includes(choice)) return fail('invalid_blessing_choice', '只能保留其中一件材料的祝福屬性');
      blessingStat = choice;
    } else {
      blessingStat = stats[0];
      if (choice !== undefined && choice !== blessingStat) return fail('invalid_blessing_choice', '只能保留材料原有的祝福屬性');
    }
  } else if (choice !== undefined && choice !== null) {
    return fail('invalid_blessing_choice', '此配方沒有可選擇的祝福屬性');
  }
  const outputQuality = blessedInputs.length === 2 ? 'blessed' : blessedInputs.length === 1 ? 'mixed' : 'normal';
  const blessedChanceBasisPoints = blessedInputs.length * 5000;
  const chanceBasisPoints = fusionChanceBasisPoints(a.plus, category, scrollItem.quality);
  const output = {itemId: a.itemId, plus: a.plus + 1, identified: true, cursed: false};
  if (outputQuality !== 'mixed') output.quality = outputQuality;
  if (outputQuality === 'blessed' && blessingStat !== null) output.blessingStat = blessingStat;
  return {
    ok: true, policyVersion: FUSION_POLICY_VERSION,
    uids: [...uids], itemId: a.itemId, plus: a.plus, outputPlus: a.plus + 1,
    scrollUid: scroll.uid, scrollItemId: scroll.itemId, scrollQuality: scrollItem.quality,
    category, tier, chanceBasisPoints, chance: chanceBasisPoints / 10000,
    guaranteed: chanceBasisPoints === 10000, requiresSuccessRoll: chanceBasisPoints !== 10000,
    outputQuality, blessedChanceBasisPoints, requiresBlessingRoll: outputQuality === 'mixed',
    blessingStat, output
  };
}
