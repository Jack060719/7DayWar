import test from 'node:test';
import assert from 'node:assert/strict';
import {privateEngine} from '../helpers/private-engine.mjs';
import {rewardExperience,rewardDrops} from '../../dist/full/trial-rewards.mjs';
import {monsterDefinition,monsterDrops,SILVER_PROFILE} from '../../dist/full/silver-monsters.mjs';
import {MONSTERS,ITEMS,SKILLS} from '../../dist/full/data.mjs';
import {xpAtLevel,addXP} from '../../dist/full/rules.mjs';
const e=await privateEngine();
function fixture(){const state=e.createGame('knight','Synthetic rewards',undefined,841);state.player.map='MAP-REG-SILVER';const world=e.ensureWorld(state,state.player.map),monster=world.monsters.find(m=>m.type==='MON-GOBLIN');monster.elite=false;Object.assign(state.player,monster.origin);return{state,monster}}
function kill(state,monster){Object.assign(monster,{hp:0,lootDone:false,respawnAt:null});e.probeKill(state,monster,[])}
test('thirty ordinary goblin kills reach level 12 with exact XP and no retroactive threshold change',()=>{
 const {state,monster}=fixture();assert.equal(monsterDefinition(monster).exp,1);assert.equal(rewardExperience(monster),14520);assert.equal(xpAtLevel(12),435600n);
 for(let i=0;i<29;i++)kill(state,monster);assert.equal(state.player.level,11);kill(state,monster);assert.equal(state.player.level,12);assert.equal(state.player.totalXP,'435600');assert.equal(state.summary.kills,'30');assert(e.validate(state).ok,e.validate(state).errors.join());
 const once=JSON.stringify(state);e.probeKill(state,monster,[]);assert.equal(JSON.stringify(state),once,'same death must never award twice');
});
test('each twelve-level milestone takes progressively more ordinary same-tier kills',()=>{
 for(const [type,from,to,kills,xp]of [['MON-HOBGOBLIN',12,24,60,119700],['MON-OGRE',24,36,120,267270],['MON-TROLL',36,48,240,364785]]){
  const s=e.createGame(),monster={type,...(type==='MON-HOBGOBLIN'?{definitionProfile:SILVER_PROFILE}:{})};addXP(s,xpAtLevel(from));assert.equal(rewardExperience(monster),xp);
  for(let i=0;i<kills-1;i++)addXP(s,rewardExperience(monster));assert(s.player.level<to);addXP(s,rewardExperience(monster));assert.equal(s.player.level,to);
 }
 assert.equal(rewardExperience({type:'MON-GOBLIN',definitionProfile:SILVER_PROFILE,elite:true}),29040);
 assert.equal(rewardExperience({type:'MON-DEATH-KNIGHT'}),3817944);
});
test('reopening mid-progression retains rewards, RNG, loot identities and remaining kill count',()=>{
 const {state,monster}=fixture();for(let i=0;i<17;i++)kill(state,monster);const resumed=JSON.parse(JSON.stringify(state)),other=resumed.worlds[state.player.map].monsters.find(m=>m.id===monster.id);
 for(let i=17;i<30;i++){kill(state,monster);kill(resumed,other)}assert.deepEqual(resumed,JSON.parse(JSON.stringify(state)));assert.equal(resumed.player.level,12);
});
test('every runtime reward references valid items and preserves the entire Boss drop table',()=>{
 for(const type of Object.keys(MONSTERS)){const monster={type,...(['MON-GOBLIN','MON-HOBGOBLIN','MON-DWARF','MON-DWARF-WARRIOR','MON-ORC','MON-ORC-ARCHER','MON-ORC-FIGHTER','MON-GANDI','MON-ORC-WIZARD','MON-ATUBA','MON-WEREWOLF','MON-LYCANTHROPE'].includes(type)?{definitionProfile:SILVER_PROFILE}:{})};
  assert(Number.isSafeInteger(rewardExperience(monster)));assert(rewardExperience(monster)>0);
  for(const row of rewardDrops(monster)){for(const id of row.item_pool||[row.item_id])assert(ITEMS[id],type+': '+id);assert(row.quantity_min<=row.quantity_max);assert(row.probability_basis_points>0&&row.probability_basis_points<=10000)}
  if(MONSTERS[type].boss)assert.deepEqual(rewardDrops(monster),monsterDrops(monster));
 }
 const monster={type:'MON-LYCANTHROPE',definitionProfile:SILVER_PROFILE},source=monsterDrops(monster),rows=rewardDrops(monster);
 for(const id of ['ITEM-FUSION-WEAPON-BASIC-NORMAL','BOOK-G04-07','ITEM-DIAMOND'])assert.deepEqual(rows.find(r=>r.item_id===id),source.find(r=>r.item_id===id),id);
});
test('ordinary loot pools are single 15%/10% rolls with tier limits and useful consumables',()=>{
 const rows=rewardDrops({type:'MON-GOBLIN',definitionProfile:SILVER_PROFILE});
 assert.deepEqual(rows.filter(r=>r.item_pool).map(r=>r.probability_basis_points),[1500,1000]);
 assert(rows.find(r=>r.item_pool?.some(id=>ITEMS[id].skill_id)).item_pool.every(id=>SKILLS[ITEMS[id].skill_id].tier===1));
 for(const [id,chance,min,max]of [['ITEM-ADENA',10000,30,60],['ITEM-RED-POTION',3000,1,3],['ITEM-BLUE-POTION',1000,1,1],['ITEM-GREEN-POTION',1000,1,1],['ITEM-RETURN-SCROLL',500,1,1],['ITEM-TELEPORT-SCROLL',500,1,1],['ITEM-IDENTIFY-SCROLL',800,1,1]]){const r=rows.find(r=>r.item_id===id);assert(r);assert.deepEqual([r.probability_basis_points,r.quantity_min,r.quantity_max],[chance,min,max])}
 assert(!rows.some(r=>r.item_id==='ITEM-CLEAR-POTION'));
 assert(rewardDrops({type:'MON-OGRE'}).some(r=>r.item_id==='ITEM-CLEAR-POTION'));
});
test('actual seeded kills produce gold, gear, books, potions and scrolls at the trial rates',()=>{
 const {state,monster}=fixture(),world=state.worlds[state.player.map],counts={gear:0,book:0,red:0,return:0},n=6000;let gold=0;
 for(let i=0;i<n;i++){world.ground=[];kill(state,monster);const drops=world.ground,g= drops.find(d=>d.itemId==='ITEM-ADENA');assert(g&&g.count>=30&&g.count<=60);gold+=g.count;
  counts.gear+=drops.filter(d=>d.gear).length;counts.book+=drops.filter(d=>ITEMS[d.itemId]?.skill_id).length;counts.red+=drops.filter(d=>d.itemId==='ITEM-RED-POTION').length;counts.return+=drops.filter(d=>d.itemId==='ITEM-RETURN-SCROLL').length;
  for(const d of drops)if(d.gear)assert.equal(d.gear.identified,false);
 }
 for(const [key,chance]of [['gear',.15],['book',.1],['red',.3],['return',.05]])assert(Math.abs(counts[key]/n-chance)<.015,key+': '+counts[key]);assert(Math.abs(gold/n-45)<1);
});
