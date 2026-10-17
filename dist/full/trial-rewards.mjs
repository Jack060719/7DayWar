// Approved fast-progression trial. Authored species/drop source tables stay unchanged.
import {ITEMS,SKILLS} from './data.mjs';
import {xpAtLevel} from './rules.mjs';
import {monsterDefinition,monsterDrops} from './silver-monsters.mjs';
const experience=new Map;
const tierOf=level=>Math.floor(level/12);
export function rewardExperience(monster){
 const def=monsterDefinition(monster),tier=tierOf(def.level);
 if(!experience.has(tier)){const kills=BigInt(30*2**tier),total=xpAtLevel((tier+1)*12)-xpAtLevel(Math.max(1,tier*12));experience.set(tier,Number((total+kills-1n)/kills))}
 // Preserve the authored Boss premium (ordinary species use level squared as their old baseline).
 const premium=def.boss?Math.max(1,def.exp/(def.level*def.level)):1;
 return Math.round(experience.get(tier)*premium)*(monster.elite===true?2:1);
}
const equipmentPools=[
 ['EQ-DAGGER','EQ-SHORT-SWORD','EQ-BOW','EQ-STAFF','EQ-LEATHER-ARMOR','EQ-SMALL-SHIELD','EQ-LEATHER-CAP','EQ-LEATHER-GLOVES','EQ-BOOTS'],
 ['EQ-SHORT-SWORD','EQ-BOW','EQ-STAFF','EQ-BROAD-SWORD','EQ-STUDDED-ARMOR','EQ-MAGE-ROBE','EQ-SMALL-SHIELD','EQ-HELMET','EQ-GLOVES','EQ-BOOTS'],
 ['EQ-BROAD-SWORD','EQ-LONG-SWORD','EQ-CROSSBOW','EQ-STAFF','EQ-SCALE-MAIL','EQ-MAGE-ROBE','EQ-LARGE-SHIELD','EQ-HELMET','EQ-GLOVES','EQ-BOOTS']
];
const commonEquipment=new Set(equipmentPools.flat());
const bookPools=[1,2,3,4].map(tier=>Object.values(ITEMS).filter(item=>{const skill=SKILLS[item.skill_id];return skill?.school==='general'&&skill.tier<=tier}).map(item=>item.id));
const row=(item_id,chance,min=1,max=min)=>({item_id,probability_basis_points:chance,quantity_min:min,quantity_max:max,item_enchant:0,despawn_seconds:300});
export function rewardDrops(monster){
 const def=monsterDefinition(monster),source=monsterDrops(monster);
 if(def.boss)return source;
 const tier=tierOf(def.level),books=bookPools[Math.min(tier,3)],commonBooks=new Set(books);
 const supply=[row('ITEM-RED-POTION',3000,1,3),row('ITEM-BLUE-POTION',1000),row('ITEM-GREEN-POTION',1000),row('ITEM-ANTIDOTE',1000),row('ITEM-RETURN-SCROLL',500),row('ITEM-TELEPORT-SCROLL',500),row('ITEM-IDENTIFY-SCROLL',800),row('ITEM-REMOVE-CURSE-SCROLL',300)];
 if(tier>=1)supply.push(row('ITEM-ORANGE-POTION',1200,1,2));
 if(tier>=2)supply.push(row('ITEM-CLEAR-POTION',600));
 const gold=tier===0?[30,60]:tier===1?[80,150]:[150*2**(tier-2),300*2**(tier-2)];supply.unshift(row('ITEM-ADENA',10000,...gold));
 for(const item of supply)for(const old of source)if(old.item_id===item.item_id){item.probability_basis_points=Math.max(item.probability_basis_points,old.probability_basis_points);item.quantity_min=Math.max(item.quantity_min,old.quantity_min);item.quantity_max=Math.max(item.quantity_max,old.quantity_max)}
 const replaced=new Set(supply.map(item=>item.item_id));
 const rare=source.filter(item=>!replaced.has(item.item_id)&&!(commonEquipment.has(item.item_id)&&!item.item_enchant)&&!commonBooks.has(item.item_id));
 return [...rare,...supply,{...row(null,1500),item_pool:equipmentPools[Math.min(tier,2)]},{...row(null,1000),item_pool:books}];
}
