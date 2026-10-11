// Reimplemented during recovery, 2026-10-10. These are not recovered Stage 3 bytes.
import {FUSION_SCROLL_BY_ID} from './fusion-policy.mjs';
export {FUSION_SCROLLS, FUSION_SCROLL_BY_ID, fusionScrollId} from './fusion-policy.mjs';

export function isFusionScroll(itemId) {
  return typeof itemId === 'string' && Object.hasOwn(FUSION_SCROLL_BY_ID, itemId);
}

// Accept either a bag (including storage) or a state, where the default bag is
// inventory. Missing optional scroll arrays represent zero scrolls, not stacks.
export function fusionScrolls(bagOrState) {
  const bag = bagOrState?.inventory ?? bagOrState;
  return Array.isArray(bag?.scrolls) ? bag.scrolls.slice() : [];
}

// An ambiguous UID never silently resolves to the first instance.
export function fusionScroll(bagOrState, uid) {
  if (typeof uid !== 'string' || !uid) return null;
  const matches = fusionScrolls(bagOrState).filter(item => item?.uid === uid);
  return matches.length === 1 && isFusionScroll(matches[0].itemId) ? matches[0] : null;
}

export function countFusionScrolls(bagOrState, itemId, {identifiedOnly = false} = {}) {
  if (itemId !== undefined && !isFusionScroll(itemId)) return 0;
  return fusionScrolls(bagOrState).filter(item => item && isFusionScroll(item.itemId)
    && (itemId === undefined || item.itemId === itemId)
    && (!identifiedOnly || item.identified === true)).length;
}

export function fusionScrollName(instance) {
  // Check identification first: even malformed/unknown IDs must not reveal
  // category, tier or blessing through the display fallback.
  if (instance?.identified !== true) return '未鑑定的融合卷';
  return FUSION_SCROLL_BY_ID[instance.itemId]?.name_zh ?? '未知卷軸';
}

// The caller allocates a UID; this pure constructor never advances game RNG or
// nextId and never inserts the instance into an inventory.
export function fusionScrollInstance(uid, itemId, identified = true) {
  if (typeof uid !== 'string' || !uid || !isFusionScroll(itemId) || typeof identified !== 'boolean') {
    throw new TypeError('Invalid fusion scroll instance');
  }
  return {uid, itemId, identified};
}
