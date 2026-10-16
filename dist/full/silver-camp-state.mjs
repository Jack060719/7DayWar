import {createWildTraits} from './pets-v4.mjs';
import {applyMonsterBirth} from './elite-policy.mjs';
import{silverCampLayout,SILVER_MAP,outsideFootprint}from'./silver-camps.mjs';
import{spawnDefinition}from'./silver-monsters.mjs';
import{CONTENT}from'./data.mjs';
import{petStats}from'./rules.mjs';
export function campActor(slot,campId,clock,active,generation=0,state=null){const d=spawnDefinition(slot.type,SILVER_MAP),petType=CONTENT.pets.find(p=>p.wild_monster_id===slot.type)?.id;const a={id:'silver-slot-'+slot.id+'-g'+generation,generation,type:d.id,...(d.profile_id?{definitionProfile:d.profile_id}:{}),populationId:'POP-SILVER-CAMP-'+slot.type.slice(4),slot:0,campId,campSlotId:slot.id,x:slot.x,y:slot.y,origin:{x:slot.x,y:slot.y},hp:active?d.hp:0,mp:d.mp,maxHp:d.hp,level:d.level,effects:[],attackAt:clock,moveAt:clock,nextAI:clock+250,path:[],targetId:null,respawnAt:active?null:clock,deadAt:active?null:clock,lootDone:!active,weaponDurability:null,healingPotions:0};if(petType){a.petType=petType;a.aptitudes={hp:100,attack:100,defense:100,speed:100};if(state&&active)a.petV4=createWildTraits(state,petType,'wild:'+(state.id||'world')+':'+a.id+':'+state.rng);a.maxHp=petStats({...a,type:petType,...(a.petV4?{v4:a.petV4}:{})}).maxHp;a.hp=active?a.maxHp:0;}return state&&active?applyMonsterBirth(state,a):a;}
export function initializeSilverCamps(s,{initial=false}={}){const w=s.worlds[SILVER_MAP];if(!w||w.campRevision===1)return false;const layout=silverCampLayout();w.campRevision=1;w.campCycles={};for(const c of layout.camps){w.campCycles[c.id]={cleared:!initial,...(!initial?{initialPending:true}:{})};for(const slot of c.slots)w.monsters.push(campActor(slot,c.id,s.clockMs,initial,0,s));}return true;}
export function refreshSilverCamps(s,viewers=[s.player]){
 const w=s.worlds[SILVER_MAP];if(!w||s.player.map!==SILVER_MAP||w.campRevision!==1)return;
 for(const camp of silverCampLayout().camps){
  const rows=w.monsters.filter(m=>m.campId===camp.id),cycle=w.campCycles[camp.id];
  if(rows.every(m=>m.hp<=0||m.captured)&&!cycle.cleared){cycle.cleared=true;cycle.clearedAt=s.clockMs}
  if(!cycle.cleared)continue;
  if(cycle.nextSpawnAt===undefined){
   if(!cycle.initialPending&&cycle.clearedAt===undefined)cycle.clearedAt=Math.max(...rows.filter(m=>!m.captured).map(m=>m.deadAt??s.clockMs),0);
   cycle.nextSpawnAt=Math.max(cycle.initialPending?s.clockMs:cycle.clearedAt+90000,...rows.map(m=>m.respawnAt||0));
  }
  if(cycle.nextSpawnAt>s.clockMs||!viewers.every(player=>outsideFootprint(player,camp)))continue;
  for(const slot of camp.slots){
   const index=w.monsters.findIndex(m=>m.campSlotId===slot.id),monster=w.monsters[index];
   if(monster.hp>0||monster.captured&&monster.respawnAt===null)continue;
   w.monsters[index]=campActor(slot,camp.id,s.clockMs,true,(monster.generation||0)+1,s);
  }
  cycle.cleared=false;delete cycle.clearedAt;delete cycle.nextSpawnAt;delete cycle.initialPending;
 }
}
export function prepareSilverMigration(state){if(state.monsterRevision===1)return null;const next=structuredClone(state);next.monsterRevision=1;initializeSilverCamps(next);return{state:next,notice:'已保留升級前原始存檔；舊活怪數值維持原版，新營地在離開視野後才補入。'};}
