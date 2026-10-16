import test from 'node:test';
import assert from 'node:assert/strict';
import {privateEngine} from '../helpers/private-engine.mjs';
import {PETS,MONSTERS} from '../../dist/full/data.mjs';
import {uid,addXP,xpAtLevel} from '../../dist/full/rules.mjs';
import {PET_RANGES,createWildTraits,petStatsV4} from '../../dist/full/pets-v4.mjs';
const e=await privateEngine(),copy=value=>JSON.parse(JSON.stringify(value));
function pet(s,type='PET-CAT',level=1){const id=uid(s,'pet'),p={id,sourceId:'wild:'+id,collarUid:uid(s,'collar'),collarInBag:true,type,name:'Synthetic',level,x:s.player.x,y:s.player.y,map:s.player.map,hp:1,mp:0,food:100,foodAt:s.clockMs+60000,mpRegenAt:s.clockMs+8000,magicAt:0,v4At:s.clockMs,xp:'0',active:true,dead:false,aptitudes:{hp:100,attack:100,defense:100,speed:100},effects:[],attackAt:0,moveAt:0,path:[],mode:'stay',v4:createWildTraits(s,type,s.id+':'+id)};p.v4.nature={type:'common',quality:'white',positive:['meleeHit'],negative:[]};for(const key of Object.keys(PET_RANGES[type]))p.v4.birth[key]=PET_RANGES[type][key][1]*10000;s.pets.push(p);return p}
function wild(){const s=e.createGame('elf','Capture traits',undefined,281);s.player.map='MAP-REG-TALKING';const m=e.ensureWorld(s,s.player.map).monsters.find(m=>m.petType);Object.assign(s.player,m.origin);m.hp=Math.max(1,Math.floor(m.maxHp*.25));const food=PETS[m.petType].favorite_food_item_id;s.inventory.stacks[food]=3;return{s,m,food}}
test('new wild traits are created once and capture preserves them; old wild pets stay legacy',()=>{
 for(const legacy of[false,true]){const{s,m,food}=wild();assert(m.petV4);if(legacy)delete m.petV4;const traits=copy(m.petV4??null);s.rng=1;const result=e.command(s,{type:'feedWild',targetId:m.id,itemId:food});assert(result.captured,result.error);assert.deepEqual(s.pets[0].v4??null,traits);assert.equal(s.pets[0].sourceId,m.id);assert(e.validate(s).ok,e.validate(s).errors.join(','));const reopened=copy(s);assert.deepEqual(reopened.pets,s.pets);}
});
test('stored, dead and other-map pets advance their cursor without retroactive loyalty or recovery',()=>{
 for(const pause of['stored','dead','other-map']){const s=e.createGame('elf','Paused pet',undefined,282),p=pet(s);if(pause==='stored')p.active=false;if(pause==='dead'){p.dead=true;p.hp=0}if(pause==='other-map')p.map='MAP-REG-TALKING';e.advance(s,600,{offline:true});assert.equal(p.v4At,s.clockMs);assert.equal(p.v4.loyalty,0);assert.equal(p.v4.loyaltyMs,0);assert.equal(p.mp,0);Object.assign(p,{active:true,dead:false,hp:1,map:s.player.map});e.advance(s,1,{offline:true});assert.equal(p.v4.loyalty,0);assert.equal(p.v4.loyaltyMs,1000);}
});
test('pet natural HP waits eight combat seconds, MP still recovers, and split offline results match',()=>{
 const s=e.createGame('elf','Combat recovery',undefined,283),p=pet(s);p.lastCombatAt=0;p.v4.hpRegenRemainder=900000000;const whole=copy(s);e.advance(s,8,{offline:true});assert.equal(p.hp,1);assert(p.mp>=1);e.advance(s,4,{offline:true});assert.equal(p.hp,2);e.advance(whole,12,{offline:true});assert.deepEqual(copy(s),copy(whole));assert(e.validate(s).ok,e.validate(s).errors.join(','));
});
test('one real pet death loses six loyalty once even if a later stale damage event repeats',()=>{
 const s=e.createGame('elf','Pet death',undefined,284),p=pet(s);p.v4.loyalty=100;e.probeDamage(s,p,1000,[],'synthetic-enemy');assert(p.dead);assert.equal(p.v4.loyalty,94);e.probeDamage(s,p,1000,[],'synthetic-enemy');assert.equal(p.v4.loyalty,94);e.advance(s,600,{offline:true});assert.equal(p.v4.loyalty,94);assert.equal(p.hp,0);
});
test('orange aura affects only nearby owner pets and summons, keeps healed HP and clamps on removal',()=>{
 const s=e.createGame('elf','Aura party',undefined,285);addXP(s,xpAtLevel(45));const source=pet(s,'PET-WOLF',45),target=pet(s,'PET-CAT',45);for(const key of Object.keys(PET_RANGES[target.type]))target.v4.birth[key]=PET_RANGES[target.type][key][0]*10000;const ctx=e.probeSkillContext(s,[]);ctx.summon({op:'summon',monsterId:'MON-BUGBEAR'},{},{durationSeconds:600});const summon=s.summons[0];assert(summon);source.active=false;const actors=[s.player,target,summon],base=actors.map(actor=>ctx.actorStats(actor));source.active=true;
 for(const[at,actor]of actors.entries()){const buff=ctx.actorStats(actor);assert.equal(buff.maxHp,Math.floor(base[at].maxHp*1.01));assert.equal(buff.mr,Math.min(100,base[at].mr+1));assert(Math.abs(buff.attackInterval-base[at].attackInterval/1.01)<1e-8);ctx.heal(actor,100000);assert.equal(actor.hp,buff.maxHp)}
 const healed=actors.map(actor=>actor.hp);e.advance(s,.25,{offline:true});assert.deepEqual(actors.map(actor=>actor.hp),healed);assert(e.validate(s).ok,e.validate(s).errors.join(','));source.active=false;s.needsProcess=true;e.advance(s,0);for(const[at,actor]of actors.entries())assert.equal(actor.hp,base[at].maxHp);source.active=true;s.needsProcess=true;e.advance(s,0);for(const[at,actor]of actors.entries())assert.equal(actor.hp,base[at].maxHp,'entering aura does not heal');source.x=s.player.x+10;assert.equal(ctx.actorStats(s.player).maxHp,base[0].maxHp);
});
test('actual combat statistics retain v4 pet hit and dodge modifiers',()=>{
 const s=e.createGame('elf','Pet hit dodge',undefined,286),p=pet(s),st=petStatsV4(p),actual=e.probeSkillContext(s,[]).actorStats(p);assert.equal(actual.hit,st.hit);assert.equal(actual.evasion,st.dg);assert(st.hit>0);assert(st.dg>0);
});
test('dark elf ranged weapon attacks produce the real arrow presentation event',()=>{
 const s=e.createGame('knight','Dark elf arrow',undefined,287),d=MONSTERS['MON-DARK-ELF'],m={id:'qa-dark-elf',type:d.id,level:d.level,map:s.player.map,x:s.player.x,y:s.player.y,hp:d.hp,maxHp:d.hp,mp:d.mp,effects:[],path:[],attackAt:0,moveAt:0};s.worlds[s.player.map].monsters.push(m);const events=[];e.probeAttack(s,s.player,events,{attacker:m,presentationId:'qa-arrow'});assert(events.some(event=>event.type==='actorAttack'&&event.projectile));assert(events.some(event=>event.type==='visual'&&event.assetId==='ASSET-PROJECTILE-ARROW'&&event.sourceActorId===m.id));
});
test('actual town summon and NPC revival discard an unprocessed storage tail before loyalty restarts',()=>{
 for(const revive of[false,true]){const s=e.createGame('elf','Resume timer',undefined,288),p=pet(s);Object.assign(s.player,{x:73,y:44});p.active=revive;p.dead=revive;if(revive)p.hp=0;e.advance(s,7,{offline:true});const action=revive?{type:'petRecall',petId:p.id,npcId:'NPC-SILVER-HEALER'}:{type:'petActive',petId:p.id,active:true},result=e.command(s,action);assert(result.ok,result.error);assert.equal(p.v4At,s.clockMs);e.advance(s,1,{offline:true});assert.equal(p.v4.loyaltyMs,1000);assert.equal(p.v4.loyalty,0);}
});
