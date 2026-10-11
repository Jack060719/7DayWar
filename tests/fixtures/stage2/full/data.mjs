import {NPC_LAYOUT_OVERRIDES} from './npc-layout-overrides.mjs';
import {CONTENT} from './catalog.mjs';
export {CONTENT};
const index=rows=>Object.freeze(Object.fromEntries(rows.map(r=>[r.id,r])));
const runtimeNPCs=CONTENT.npcs.map(n=>NPC_LAYOUT_OVERRIDES[n.id]?{...n,position_tiles:NPC_LAYOUT_OVERRIDES[n.id],position_layout_origin:'assistant_design_regional_refinement'}:n);
export const MAPS=index(CONTENT.maps), CONNECTIONS=index(CONTENT.connections), MONSTERS=index(CONTENT.monsters), POPULATIONS=index(CONTENT.populations), SKILLS=index(CONTENT.skills), QUESTS=index(CONTENT.quests), NPCS=index(runtimeNPCs), PETS=index(CONTENT.pets);
// Provisional collection contracts extend runtime items; catalog source rows remain immutable.
const formContracts=CONTENT.monsters.filter(m=>m.boss).map(m=>({id:'ITEM-FORM-CONTRACT-'+m.id.slice(4),name_zh:m.name_zh+'變身契約',family:'form_contract',form_monster_id:m.id,weight:1,stackable:true,max_stack:9999,tradeable:true,binding:'none',effect:'符合等級並消耗一張，永久解鎖該Boss變身；重複解鎖不消耗。',origin:'assistant_design_provisional_collection_v1'}));
const runtimeItems=CONTENT.items.map(it=>it.id==='ITEM-POLYMORPH-SCROLL'?{...it,effect:'消耗一張，變為圖鑑已解鎖或保留舊權限的形態1800秒；攻速依形態暫定表，保留職業與武器，不送怪物技能。',runtime_rule_origin:'assistant_design_provisional_collection_v1'}:it);
export const ITEMS=index([...runtimeItems,...CONTENT.equipment,...CONTENT.skill_books,...formContracts]);
export const CLASSES=Object.freeze(Object.fromEntries(['knight','elf','mage','darkelf'].map(id=>[id,CONTENT.class_rules.find(r=>r.id===CONTENT.classes[id])])));
export const RULES=index(CONTENT.class_rules.filter(r=>r.id.startsWith('RULE-')));
export const REWARDS=index(CONTENT.quest_reward_definitions);
export const ATTRS=['STR','DEX','CON','WIS','CHA','INT'];
export const has=(table,id)=>typeof id==='string'&&Object.hasOwn(table,id);
export const mapNPCs=id=>runtimeNPCs.filter(n=>n.map_id===id);
export const mapConnections=id=>CONTENT.connections.filter(c=>c.from_map_id===id||(c.bidirectional&&c.to_map_id===id));
export const isTown=id=>MAPS[id]?.kind==='settlement';
