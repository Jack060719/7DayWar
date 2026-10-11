// Fresh reconstruction. Rates absent from the source are explicit provisional design.
import {LEGACY_DROPS} from './monster-baseline-v1.mjs';
import {SOURCE_ITEM_MAPPING} from './silver-items.mjs';
export const DROP_POLICY=Object.freeze({revision:1,missingItemBasisPoints:50,blessedScrollBasisPoints:1000,origin:'assistant_design_reconstruction'});
const rows={};
for(const group of SOURCE_ITEM_MAPPING){const list=rows[group.monster_id]??=[];for(const id of group.item_ids){const prior=LEGACY_DROPS.find(r=>r.monster_id===group.monster_id&&r.item_id===id);list.push(Object.freeze(prior?{...prior}:{monster_id:group.monster_id,item_id:id,probability_basis_points:50,quantity_min:1,quantity_max:1,item_enchant:0,despawn_seconds:300,origin:'assistant_design_missing_source_rate'}));}}
export const SOURCE_DROPS=Object.freeze(Object.fromEntries(Object.entries(rows).map(([id,extra])=>{const ids=new Set(extra.map(r=>r.item_id));return[id,Object.freeze([...LEGACY_DROPS.filter(r=>r.monster_id===id&&!ids.has(r.item_id)),...extra])]})));
export const DEEP_SCROLL_REGIONS=Object.freeze({'MON-SUCCUBUS':Object.freeze({tier:'INTERMEDIATE',maps:Object.freeze(['MAP-DUN-GLUDIN-F07','MAP-DUN-GIRAN-F03','MAP-DUN-DRAGON-F04','MAP-DUN-DRAGON-F05'])}),'MON-SUCCUBUS-QUEEN':Object.freeze({tier:'ADVANCED',maps:Object.freeze(['MAP-DUN-GIRAN-F04','MAP-DUN-DRAGON-F05','MAP-DUN-DRAGON-F06','MAP-DUN-DRAGON-F07','MAP-DUN-IVORY-F07'])})});
export function deepDropTag(type,map){return DEEP_SCROLL_REGIONS[type]?.maps.includes(map)?{dropRevision:'deep-scroll-v1',dropOriginMap:map}:{}}
export function deepScrollDrops(actor){const spec=DEEP_SCROLL_REGIONS[actor.type];return actor.dropRevision==='deep-scroll-v1'&&spec?.maps.includes(actor.dropOriginMap)?['WEAPON','ARMOR'].map(category=>({monster_id:actor.type,item_id:`ITEM-FUSION-${category}-${spec.tier}-NORMAL`,probability_basis_points:50,quantity_min:1,quantity_max:1,item_enchant:0,despawn_seconds:300,origin:'assistant_design_deep_scrolls'})):[];}
