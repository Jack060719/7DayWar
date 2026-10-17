import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createGame,ensureWorld,validate,advance as soloAdvance} from '../../dist/full/engine.mjs';
import {addXP,xpAtLevel,stats,petStats,addCount} from '../../dist/full/rules.mjs';
import {rewardExperience} from '../../dist/full/trial-rewards.mjs';

// Inspect the real room authority without exposing mutable state in its public API.
const file=new URL('../../dist/full/coop-engine.mjs',import.meta.url);
let source=fs.readFileSync(file,'utf8').replace(/from\s*(['"])(\.\/[^'"]+)\1/g,(_,quote,path)=>'from '+JSON.stringify(new URL(path,file).href));
source=source.replace('get memberIds()', 'probe(){return {members:this.#members,worlds:this.#worlds,context:this.#context,xpCursor:this.#xpCursor,goldCursor:this.#goldCursor}} get memberIds()');
const {createRoom}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
function character(name='hero',classId='knight'){
  const state=createGame(classId,name,undefined,31);
  addXP(state,xpAtLevel(50));
  state.player.hp=stats(state).maxHp;
  state.player.mp=stats(state).maxMp;
  return state;
}
function fixture(count=2,{type='MON-ATUBA',mapId='MAP-REG-ELF',hp=12}={}){
  const room=createRoom(91);
  for(let i=0;i<count;i++)assert(room.addMember(String(i),character('P'+i)).ok);
  const states=[...room.probe().members.values()].map(member=>member.state);
  for(const state of states){state.player.map=mapId;ensureWorld(state,mapId)}
  const world=room.probe().worlds[mapId],monster=world.monsters.find(actor=>actor.type===type);
  assert(monster);
  // Controlled existing encounter; procedural camp activation has its own suite.
  delete world.fieldCamps;
  for(const state of states)delete state.worlds[mapId].fieldCamps;
  monster.elite=false;
  world.monsters=[monster];
  delete world.campRevision;
  delete world.campCycles;
  delete monster.campId;
  delete monster.campSlotId;
  Object.assign(monster,{hp,attackAt:100000,nextAI:100000,path:[]});
  for(const state of states){Object.assign(state.player,monster.origin);state.nextAI=100000}
  return {room,states,world,monster};
}
function killTogether(room,monster){
  for(const id of room.memberIds)assert(room.command(id,{type:'attack',targetId:monster.id}).ok);
  const events=[];
  for(let i=0;i<40&&monster.hp>0;i++)events.push(...room.advance(.25).events);
  assert.equal(monster.hp,0);
  return events;
}

test('one to ten members have unique actors and immutable views without changing names or inputs',()=>{
  const room=createRoom(5),original=character(),snapshot=structuredClone(original);
  for(let i=0;i<10;i++)assert(room.addMember(String(i),original).ok);
  assert(!room.addMember('10',original).ok);
  assert(!room.addMember('0',original).ok);
  assert.equal(room.memberIds.length,10);
  const view=room.view('0');
  assert.equal(view.state.player.name,'hero');
  assert.equal(view.state.player.id,'hero');
  assert.equal(new Set(view.players.map(peer=>peer.player.id)).size,9);
  view.state.player.gold=0;
  view.players[0].player.hp=0;
  assert.equal(room.view('0').state.player.gold,original.player.gold);
  assert(room.view('1').state.player.hp>0);
  assert.deepEqual(original,snapshot);
});

test('two players damage one monster; EXP is split and one randomly assigned loot pool is awarded exactly once',()=>{
  const {room,states,monster}=fixture(2,{type:'MON-DEATH-KNIGHT',mapId:'MAP-DUN-GLUDIN-F05'}),xp=states.map(state=>BigInt(state.player.totalXP));
  const events=killTogether(room,monster);
  const hits=events.filter(event=>event.type==='hit'&&event.targetId===monster.id);
  assert.equal(new Set(hits.map(hit=>hit.sourceId)).size,2);
  assert.equal(hits.reduce((sum,hit)=>sum+hit.damage,0),18);
  assert.equal(events.filter(event=>event.type==='kill').length,1);
  for(let i=0;i<2;i++){
    assert.equal(BigInt(states[i].player.totalXP)-xp[i],BigInt(rewardExperience(monster)*1.5)/2n);
    assert.equal(states[i].summary.kills,'1');
  }
  const a=states[0].worlds[states[0].player.map].ground,b=states[1].worlds[states[1].player.map].ground;
  assert(a.length+b.length>0);
  assert(a.every(drop=>!b.some(other=>other.id===drop.id)));
  const owner=a.length?'0':'1',other=owner==='0'?'1':'0',drop=(a.length?a:b)[0];
  const denied=room.command(other,{type:'pickup',id:drop.id});
  assert(!denied.ok);
  assert(room.command(owner,{type:'pickup',id:drop.id}).ok);
  assert(!room.command(owner,{type:'pickup',id:drop.id}).ok);
  room.advance(1);
  for(const id of room.memberIds){assert.equal(room.view(id).state.summary.kills,'1');assert(validate(room.exportMember(id)).ok)}
});

test('ten players do not multiply a monster AI or attack tick',()=>{
  const a=fixture(1),b=fixture(10);
  for(const f of [a,b]){f.monster.hp=f.monster.maxHp;f.monster.attackAt=0;f.monster.nextAI=0}
  const one=a.room.advance(0),ten=b.room.advance(0);
  assert.equal(a.monster.attackAt,b.monster.attackAt);
  assert.equal(a.monster.nextAI,b.monster.nextAI);
  assert(stats(b.states[0]).maxHp-b.states[0].player.hp>stats(a.states[0]).maxHp-a.states[0].player.hp);
  assert.equal(a.monster.roomCombat.factor,1);
  assert.equal(b.monster.roomCombat.factor,5);
  assert.equal(one.events.filter(e=>e.actorId===a.monster.id).length,ten.events.filter(e=>e.actorId===b.monster.id).length);
  for(const state of b.states.slice(1))assert.equal(state.player.hp,stats(state).maxHp);
});

test('monster targeting another member uses that member defenses and death ledger',()=>{
  const {room,states,monster}=fixture();
  states[1].player.hp=1;
  monster.hp=monster.maxHp;
  monster.nextAI=0;
  monster.targetId=states[1].player.id;
  const before=states[0].player.hp;
  room.advance(0);
  assert.equal(states[0].player.hp,before);
  assert(states[1].player.death);
  assert.equal(states[0].summary.deaths,'0');
  assert.equal(states[1].summary.deaths,'1');
  const saved=room.exportMember('1');
  assert.equal(saved.player.death.map,saved.player.map);
  assert(validate(saved).ok);
});

test('monster area damage reaches both members through their owning states',()=>{
  const {room,states,monster}=fixture(2,{type:'MON-DEATH-KNIGHT',mapId:'MAP-DUN-GLUDIN-F05',hp:1000});
  monster.nextAI=0;
  const hp=states.map(state=>state.player.hp),events=room.advance(0).events;
  assert(states.every((state,i)=>state.player.hp<hp[i]));
  assert.equal(new Set(events.filter(e=>e.type==='hit'&&e.sourceId===monster.id).map(e=>e.targetId)).size,2);
});

test('invalid commands restore shared world references, member data and room RNG atomically',()=>{
  const {room,monster}=fixture(),before=room.memberIds.map(id=>room.view(id));
  const denied=room.command('0',{type:'configureAuto',mapId:'MAP-REG-SILVER',settings:{hpThreshold:-1}});
  assert(!denied.ok);
  assert.deepEqual(room.memberIds.map(id=>room.view(id)),before);
  const current=room.probe().worlds['MAP-REG-ELF'].monsters[0];
  killTogether(room,current);
  assert.equal(room.view('0').state.summary.kills,'1');
  assert.equal(room.view('1').state.summary.kills,'1');
  assert.equal(monster.id,current.id);
});

test('room advance remains deterministic across fractional segments and additional snapshots',()=>{
  const a=fixture(),b=fixture();
  for(const f of [a,b])for(const id of f.room.memberIds)f.room.command(id,{type:'attack',targetId:f.monster.id});
  a.room.advance(5);
  for(let i=0;i<50;i++){b.room.advance(.1);b.room.view('0');b.room.exportMember('1')}
  for(const id of a.room.memberIds)assert.deepEqual(a.room.view(id),b.room.view(id));
});

test('ally healing resolves against peer maximum HP and hostile commands cannot attack peers',()=>{
  const room=createRoom(4),mage=character('Mage','mage'),knight=character('Knight');
  mage.player.skills.push('SKILL-G01-01');
  knight.player.hp=1;
  assert(room.addMember('mage',mage).ok);
  assert(room.addMember('knight',knight).ok);
  const peer=room.view('mage').players[0].player.id;
  assert(!room.command('mage',{type:'attack',targetId:peer}).ok);
  const before=room.view('mage').state.player.mp;
  assert(room.command('mage',{type:'skill',skillId:'SKILL-G01-01',targetId:peer}).ok);
  room.advance(.5);
  assert(room.view('knight').state.player.hp>1);
  assert.equal(room.view('mage').state.player.mp,before-4);
});

test('solo world and RNG freeze while buffs, cooldowns and regen preserve their remaining durations',()=>{
  const room=createRoom(8),original=character();
  soloAdvance(original,30);
  original.player.effects.push({id:'ITEM-GREEN-POTION',group:'haste',values:{haste:1.33},started:original.clockMs,until:original.clockMs+15000});
  original.player.cooldowns.item=original.clockMs+12000;
  original.player.regenAt=original.clockMs+8000;
  const before=structuredClone(original);
  assert(room.addMember('a',original).ok);
  room.advance(5);
  const saved=room.exportMember('a');
  assert.deepEqual(saved.worlds,before.worlds);
  for(const key of ['clockMs','elapsedMs','fractionMs','rng','id'])assert.equal(saved[key],before[key]);
  assert.equal(saved.player.effects[0].until,before.clockMs+10000);
  assert.equal(saved.player.cooldowns.item,before.clockMs+7000);
  assert.equal(saved.player.regenAt,before.clockMs+3000);
  assert.deepEqual(room.exportMember('a'),saved);
  assert.deepEqual(original,before);
  soloAdvance(saved,1);
  assert(validate(saved).ok);
});

test('same pet IDs from separate saves remain distinct in combat and restore their original collars',()=>{
  const original=character(),pet={id:'pet3',collarUid:'collar4',sourceId:'m5',collarInBag:true,type:'PET-WOLF',name:'Wolf',level:1,x:original.player.x,y:original.player.y,map:original.player.map,hp:1,mp:0,food:100,foodAt:60000,mpRegenAt:8000,magicAt:0,xp:'0',active:true,dead:false,aptitudes:{hp:100,attack:100,defense:100,speed:100},effects:[],attackAt:0,moveAt:0,path:[],mode:'attack'};
  pet.hp=petStats(pet).maxHp;
  original.pets.push(pet);
  original.nextId='6';
  assert(validate(original).ok,validate(original).errors.join());
  const room=createRoom(1);
  assert(room.addMember('a',original).ok);
  assert(room.addMember('b',original).ok);
  const states=[...room.probe().members.values()].map(member=>member.state);
  assert.notEqual(states[0].pets[0].id,states[1].pets[0].id);
  room.advance(1);
  for(const id of room.memberIds){
    const saved=room.exportMember(id);
    assert.equal(saved.pets[0].id,'pet3');
    assert.equal(saved.pets[0].collarUid,'collar4');
    assert.equal(saved.pets[0].sourceId,'m5');
    assert(validate(saved).ok);
  }
});

test('different maps have separate encounters and nonparticipants receive no rewards',()=>{
  const {room,states,monster}=fixture(3);
  states[2].player.map='MAP-TOWN-SILVER';
  const previous=states[2].player.totalXP;
  for(const id of ['0','1'])room.command(id,{type:'attack',targetId:monster.id});
  for(let i=0;i<40&&monster.hp>0;i++)room.advance(.25);
  assert.equal(monster.hp,0);
  assert.equal(states[0].summary.kills,'1');
  assert.equal(states[1].summary.kills,'1');
  assert.equal(states[2].summary.kills,'0');
  assert.equal(states[2].player.totalXP,previous);
  assert.equal(room.view('2').players.length,0);
});

test('removing a member exports once and removes actor from further simulation',()=>{
  const {room,states,monster}=fixture();
  monster.targetId=states[0].player.id;
  const saved=room.removeMember('0');
  assert(validate(saved).ok);
  assert.deepEqual(room.memberIds,['1']);
  assert(!room.command('0',{type:'stopAuto'}).ok);
  monster.nextAI=0;
  room.advance(0);
  assert.equal(monster.targetId,states[1].player.id);
});


test('fresh room worlds never copy the saved monster population',()=>{
  const original=character();
  const solo=ensureWorld(original,'MAP-REG-ELF');
  solo.monsters[0].hp=1;
  const before=structuredClone(original),room=createRoom(31);
  assert(room.addMember('a',original).ok);
  const state=room.probe().members.get('a').state;
  const fresh=ensureWorld(state,'MAP-REG-ELF');
  assert.notEqual(fresh.monsters[0].id,solo.monsters[0].id);
  assert.equal(fresh.monsters[0].hp,fresh.monsters[0].maxHp);
  assert.deepEqual(room.exportMember('a').worlds,before.worlds);
});

test('room events stay on their originating map and own actor aliases are normalized',()=>{
  const {room,states,monster}=fixture(3);
  states[2].player.map='MAP-TOWN-SILVER';
  room.command('0',{type:'attack',targetId:monster.id});
  const events=room.advance(0).events;
  assert(events.length);
  assert(events.every(event=>event.mapId==='MAP-REG-ELF'));
  assert.equal(room.eventsFor('2',events).length,0);
  assert(room.eventsFor('0',events).some(event=>event.type==='actorAttack'&&event.actorId==='hero'));
  assert(room.eventsFor('1',events).some(event=>event.type==='actorAttack'&&event.actorId===states[0].player.id));
});

test('Silver camps remain dead while any room player still sees their footprint',async()=>{
  const {silverCampLayout}=await import('../../dist/full/silver-camps.mjs');
  const {geometry,nearestWalkable}=await import('../../dist/full/world.mjs');
  const room=createRoom(44);
  room.addMember('a',character());room.addMember('b',character());
  const states=[...room.probe().members.values()].map(member=>member.state),map='MAP-REG-SILVER';
  for(const state of states){state.player.map=map;ensureWorld(state,map);state.nextAI=100000}
  const world=room.probe().worlds[map],camp=silverCampLayout().camps[0],rows=world.monsters.filter(monster=>monster.campId===camp.id);
  for(const monster of rows)Object.assign(monster,{hp:0,lootDone:true,respawnAt:0});
  const g=geometry(map),far=nearestWalkable(g,{x:g.width-2,y:g.height-2});
  Object.assign(states[0].player,far);
  Object.assign(states[1].player,rows[0].origin);
  room.advance(0);
  assert(world.monsters.filter(monster=>monster.campId===camp.id).every(monster=>monster.hp===0));
  Object.assign(states[1].player,far);
  states[1].needsProcess=true;
  room.advance(90);
  assert(world.monsters.filter(monster=>monster.campId===camp.id).every(monster=>monster.hp>0&&monster.generation===1));
});

test('leaving a room releases a charmed source rather than reserving its world slot forever',async()=>{
  const {privateEngine}=await import('../helpers/private-engine.mjs'),engine=await privateEngine();
  const {room,states,monster}=fixture();
  engine.probeSkillContext(states[0],[]).charm(monster,60);
  assert(monster.captured);
  assert.equal(states[0].summons.length,1);
  const saved=room.removeMember('0');
  assert.equal(saved.summons.length,0);
  assert.equal(monster.captured,false);
  assert(monster.hp>0);
  assert(validate(saved).ok);
});


test('missed attacks qualify, while a nearby spectator receives no EXP or loot',async()=>{
  const {random}=await import('../../dist/full/rules.mjs');
  const {room,states,monster}=fixture(3,{hp:1000});
  let seed=100000;
  while(random({rng:seed})<.99)seed+=100000;
  room.rng=seed;
  room.command('0',{type:'attack',targetId:monster.id});
  const first=room.advance(0).events;
  assert(first.some(event=>event.type==='miss'&&event.sourceId===states[0].player.id));
  assert(!first.some(event=>event.type==='hit'&&event.sourceId===states[0].player.id));
  room.command('0',{type:'stopAuto'});
  monster.hp=1;room.rng=1;
  room.command('1',{type:'attack',targetId:monster.id});
  room.advance(0);
  assert.equal(monster.hp,0);
  assert.equal(states[0].summary.kills,'1');
  assert.equal(states[1].summary.kills,'1');
  assert.equal(states[2].summary.kills,'0');
  assert.equal(states[2].worlds[states[2].player.map].ground.length,0);
});

test('actual healing of existing participants qualifies recursively; healing before their attack does not',()=>{
  const {room,states,monster}=fixture(4,{hp:1000});
  for(const state of states)state.player.skills.push('SKILL-G01-01');
  states[0].player.hp=1;
  room.command('3',{type:'skill',skillId:'SKILL-G01-01',targetId:states[0].player.id});
  room.advance(.5);
  room.command('0',{type:'attack',targetId:monster.id});room.advance(0);
  room.command('0',{type:'stopAuto'});
  states[0].player.hp=1;
  assert(room.command('1',{type:'skill',skillId:'SKILL-G01-01',targetId:states[0].player.id}).ok);
  room.advance(.5);
  states[1].player.hp=1;
  assert(room.command('2',{type:'skill',skillId:'SKILL-G01-01',targetId:states[1].player.id}).ok);
  room.advance(.5);
  monster.hp=1;room.rng=1;
  room.command('0',{type:'attack',targetId:monster.id});room.advance(1);
  assert.equal(monster.hp,0);
  for(const state of states.slice(0,3))assert.equal(state.summary.kills,'1');
  assert.equal(states[3].summary.kills,'0');
});

test('pet and summon attacks qualify their own owners without requiring a player hit',()=>{
  const {room,states,monster}=fixture(3,{hp:1000}),map=states[0].player.map;
  const pet={id:'pet9000',collarUid:'collar9001',sourceId:'synthetic-room-wolf',collarInBag:true,type:'PET-WOLF',name:'Wolf',level:1,x:monster.x,y:monster.y,map,hp:20,mp:0,food:100,foodAt:60000,mpRegenAt:8000,magicAt:0,xp:'0',active:true,dead:false,aptitudes:{hp:100,attack:100,defense:100,speed:100},effects:[],attackAt:0,moveAt:0,path:[],mode:'attack'};
  states[0].pets.push(pet);
  states[1].summons.push({...structuredClone(monster),id:'summon9002',map,active:true,until:60000,attackAt:0,nextAI:0,path:[]});
  room.nextId='9003';
  for(const id of ['0','1']){states[Number(id)].player.attackAt=100000;room.command(id,{type:'attack',targetId:monster.id})}
  const events=room.advance(0).events;
  assert(events.some(event=>event.type==='actorAttack'&&event.actorId==='pet9000'));
  assert(events.some(event=>event.type==='actorAttack'&&event.actorId==='summon9002'));
  assert(!events.some(event=>event.type==='actorAttack'&&event.actorId.startsWith('coop-player')));
  monster.hp=1;room.rng=1;pet.attackAt=0;states[0].needsProcess=true;
  room.advance(1);
  assert.equal(monster.hp,0);
  assert.equal(states[0].summary.kills,'1');
  assert.equal(states[1].summary.kills,'1');
  assert.equal(states[2].summary.kills,'0');
});

test('participation survives death and crossing maps; rewards stay at the monster death map',()=>{
  const {room,states,monster}=fixture(2,{type:'MON-DEATH-KNIGHT',mapId:'MAP-DUN-GLUDIN-F05',hp:1000});
  const xp=states[0].player.totalXP,killMap=states[0].player.map;
  room.command('0',{type:'attack',targetId:monster.id});room.advance(0);
  room.command('0',{type:'stopAuto'});
  Object.assign(states[0].player,{map:'MAP-TOWN-SILVER',hp:0,death:{reviveAt:100000,map:'MAP-TOWN-SILVER',x:64,y:56}});
  monster.hp=1;room.rng=1;
  room.command('1',{type:'attack',targetId:monster.id});room.advance(0);
  assert.equal(states[0].summary.kills,'1');
  assert.equal(BigInt(states[0].player.totalXP)-BigInt(xp),BigInt(rewardExperience(monster)*1.5)/2n);
  assert(states.reduce((n,state)=>n+state.worlds[killMap].ground.length,0)>0);
  assert.equal(states[0].worlds['MAP-TOWN-SILVER'].ground.length,0);
  assert(states[0].player.death);
  assert(validate(room.exportMember('0')).ok);
});

test('leaving removes contribution and combat targets, so rejoining cannot claim an old participation',()=>{
  const {room,states,monster}=fixture(2,{hp:1000});
  room.command('0',{type:'attack',targetId:monster.id});room.advance(0);
  assert.equal(monster.targetId,states[0].player.id);
  const saved=room.removeMember('0');
  assert.equal(monster.targetId,null);
  assert.deepEqual(monster.path,[]);
  assert(room.addMember('0',saved).ok);
  const returning=room.probe().members.get('0').state;
  returning.player.map=states[1].player.map;ensureWorld(returning,returning.player.map);Object.assign(returning.player,monster.origin);
  monster.hp=1;room.rng=1;
  room.command('1',{type:'attack',targetId:monster.id});room.advance(0);
  assert.equal(returning.summary.kills,'0');
  assert.equal(states[1].summary.kills,'1');
});


test('periodic healing credits its caster only when it restores a participant HP',()=>{
  const {room,states,monster}=fixture(3,{hp:1000});
  states[1].player.classId='mage';
  states[1].player.mp=stats(states[1]).maxMp;
  states[1].player.skills.push('SKILL-G08-08');
  addCount(states[1].inventory,'ITEM-MAGIC-GEM',1);
  assert(room.command('1',{type:'skill',skillId:'SKILL-G08-08',targetId:states[0].player.id}).ok);
  room.advance(1);
  assert(states[0].player.effects.some(effect=>effect.group==='healing_storm'));
  room.command('0',{type:'attack',targetId:monster.id});room.advance(0);
  room.command('0',{type:'stopAuto'});
  states[0].player.hp=1;
  room.advance(5);
  assert(states[0].player.hp>1);
  assert(room.exportMember('0').player.effects.every(effect=>!effect.sourceActorId));
  monster.hp=1;room.rng=1;
  room.command('0',{type:'attack',targetId:monster.id});room.advance(1);
  assert.equal(states[0].summary.kills,'1');
  assert.equal(states[1].summary.kills,'1');
  assert.equal(states[2].summary.kills,'0');
});

test('mage area damage and poison attempts qualify; failed commands preserve prior contribution atomically',()=>{
  for(const skillId of ['SKILL-G04-01','SKILL-G02-03']){
    const {room,states,monster}=fixture(3,{hp:1000});
    states[0].player.classId='mage';
    states[0].player.mp=stats(states[0]).maxMp;
    states[0].player.skills.push(skillId);
    addCount(states[0].inventory,'ITEM-MAGIC-GEM',1);
    assert(room.command('0',{type:'skill',skillId,targetId:monster.id}).ok);
    const events=room.advance(.5).events;
    assert(events.some(event=>event.type==='skill'&&event.actorId===states[0].player.id));
    assert(!events.some(event=>event.type==='actorAttack'&&event.actorId===states[0].player.id));
    assert(!room.command('2',{type:'configureAuto',settings:{hpThreshold:-1}}).ok);
    const current=room.probe().worlds[states[1].player.map].monsters[0];
    current.hp=1;room.rng=1;
    room.command('1',{type:'attack',targetId:current.id});room.advance(0);
    assert.equal(current.hp,0);
    assert.equal(room.view('0').state.summary.kills,'1');
    assert.equal(room.view('1').state.summary.kills,'1');
    assert.equal(room.view('2').state.summary.kills,'0');
  }
});


test('family monster scaling locks at its first valid attack, using only same-map members and never their later movement',()=>{
  const factors=[1,1.5,2.5,3.5,4.5,5,5,5,5,5];
  for(let count=1;count<=10;count++){
    const {room,states,monster}=fixture(count,{hp:1000}),base=monster.maxHp;
    assert.equal(monster.roomCombat,undefined);
    room.command('0',{type:'attack',targetId:monster.id});
    const events=room.advance(0).events;
    assert.deepEqual(monster.roomCombat,{count,factor:factors[count-1]});
    assert.equal(monster.maxHp,Math.floor(base*factors[count-1]));
    assert.equal(monster.hp+events.filter(e=>e.type==='hit'&&e.targetId===monster.id).reduce((n,e)=>n+e.damage,0),Math.floor(1000*factors[count-1]));
    states[0].player.map='MAP-TOWN-SILVER';
    room.probe().context.engage(monster);
    assert.equal(monster.roomCombat.count,count);
  }
  const {room,states,monster}=fixture(3,{hp:1000});
  states[2].player.map='MAP-TOWN-SILVER';
  room.command('0',{type:'attack',targetId:monster.id});room.advance(0);
  assert.equal(monster.roomCombat.factor,1.5);
  states[2].player.map=states[0].player.map;
  room.probe().context.engage(monster);
  assert.equal(monster.roomCombat.factor,1.5);
  const hp=monster.maxHp;
  room.removeMember('0');
  room.probe().context.engage(monster);
  assert.equal(monster.maxHp,hp);
  const fresh={...structuredClone(monster),id:'synthetic-new-generation',hp:100,maxHp:100};
  delete fresh.roomCombat;
  room.probe().worlds[states[1].player.map].monsters.push(fresh);
  room.probe().context.engage(fresh);
  assert.equal(fresh.roomCombat.count,2);
});

test('room reward uses exactly one base loot roll and rotates integer EXP remainders without resetting on joins or leaves',()=>{
  const {room,states,monster}=fixture(3,{hp:1000}),context=room.probe().context,grants=[];
  // The 36-level band has odd EXP, retaining fractional and remainder coverage.
  monster.type='MON-TROLL';delete monster.definitionProfile;
  const award=(state,target,events,map,options)=>{
    grants.push({id:state.player.id,exp:options.exp,roll:options.rollDrops});
    if(options.rollDrops)options.drop({itemId:'ITEM-RED-POTION',count:7,expiresAt:300000});
  };
  // Use the real shared actor for participation and each confirmed-kill reward callback.
  const run=()=>{for(const {state} of room.probe().members.values())context.participate(monster,state.player.id);context.reward(states[0],monster,[],award)};
  run();
  assert.deepEqual(grants.map(row=>row.exp),[303988,303987,303987]);
  assert.equal(grants.filter(row=>row.roll).length,1);
  assert.equal(states.flatMap(state=>state.worlds[state.player.map].ground).reduce((n,drop)=>n+drop.count,0),7);
  grants.length=0;run();
  assert.deepEqual(grants.map(row=>row.exp),[303987,303988,303988]);
  const cursor=room.probe().xpCursor;
  const saved=room.removeMember('1');
  assert(room.addMember('1',saved).ok);
  assert.equal(room.probe().xpCursor,cursor);
  grants.length=0;run();
  assert.deepEqual(grants.map(row=>row.exp),[303987,303987,303988]);
});

test('Boss gold is shared with a minimum one per participant, while all other drops are assigned once',()=>{
  for(const gold of [0,2,101]){
    const {room,states,monster}=fixture(3,{type:'MON-DEATH-KNIGHT',mapId:'MAP-DUN-GLUDIN-F05',hp:1000}),context=room.probe().context;
    for(const state of states)context.participate(monster,state.player.id);
    const calls=[];
    context.reward(states[0],monster,[],(state,target,events,map,options)=>{
      calls.push(options);
      if(!options.rollDrops)return;
      if(gold)options.drop({itemId:'ITEM-ADENA',count:gold,expiresAt:300000});
      options.drop({itemId:'ITEM-RED-POTION',count:4,expiresAt:300000});
      options.drop({itemId:'ITEM-FORM-CONTRACT-DEATH-KNIGHT',count:2,expiresAt:300000});
    });
    assert(calls.every(options=>options.multiplier===2.5));
    assert.equal(calls.filter(options=>options.rollDrops).length,1);
    const loot=states.map(state=>state.worlds[state.player.map].ground);
    assert(loot.every(drops=>drops.some(drop=>drop.itemId==='ITEM-ADENA'&&drop.count>=1)));
    assert.equal(loot.flat().filter(drop=>drop.itemId==='ITEM-ADENA').reduce((n,drop)=>n+drop.count,0),Math.max(gold,3));
    assert.equal(loot.flat().filter(drop=>drop.itemId==='ITEM-RED-POTION').length,1);
    assert.equal(loot.flat().filter(drop=>drop.itemId==='ITEM-FORM-CONTRACT-DEATH-KNIGHT').length,1);
    assert.equal(new Set(loot.flat().map(drop=>drop.id)).size,loot.flat().length);
  }
});

test('family combat timestamp rebases relative to the frozen solo clock, including negative values on immediate return',()=>{
  const original=character();
  original.player.lastCombatAt=-4000;
  const room=createRoom(19);room.addMember('a',original);
  room.advance(2);
  assert.equal(room.exportMember('a').player.lastCombatAt,-6000);
  const member=room.probe().members.get('a');
  member.state.player.lastCombatAt=room.clockMs;
  room.advance(3);
  const saved=room.exportMember('a');
  assert.equal(saved.player.lastCombatAt,-3000);
  assert(validate(saved).ok);
});


test('odd trial EXP retains the half-point multiplier across kills without adding RNG draws',()=>{
  const {room,states,monster}=fixture(2,{hp:1000}),context=room.probe().context,shares=[];
  monster.type='MON-TROLL';delete monster.definitionProfile;
  const run=()=>{for(const state of states)context.participate(monster,state.player.id);context.reward(states[0],monster,[],(state,target,events,map,options)=>shares.push(options.exp))};
  const rng=room.rng;run();assert.deepEqual(shares,[273589,273588]);shares.length=0;run();assert.deepEqual(shares,[273589,273589]);assert.equal(room.rng,rng);
});


test('network display snapshots cull distant worlds and ground without removing event actors or altering authority',()=>{
 const {room,states,world,monster}=fixture();
 const state=states[0],before=room.view('0');
 const far={...structuredClone(monster),id:'synthetic-distant',x:monster.x+300,y:monster.y+300};
 world.monsters.push(far);
 state.worlds[state.player.map].ground.push({id:'far-ground',itemId:'ITEM-ADENA',count:1,x:far.x,y:far.y});
 const full=room.view('0'),net=room.networkView('0');
 assert.deepEqual(Object.keys(net.state.worlds),[state.player.map]);
 assert(!net.state.worlds[state.player.map].monsters.some(m=>m.id===far.id));
 assert(!net.state.worlds[state.player.map].ground.some(m=>m.id==='far-ground'));
 assert(room.networkView('0',[{mapId:state.player.map,targetId:far.id}]).state.worlds[state.player.map].monsters.some(m=>m.id===far.id));
 assert.equal(net.players.length,1);
 assert.deepEqual(room.view('0'),full);
 assert.deepEqual(room.exportMember('0').worlds,room.probe().members.get('0').baseline.worlds);
});

test('submillisecond advances keep every member fractional clock synchronized without an integer tick',()=>{
 const {room}=fixture();room.advance(.00025);
 for(const id of room.memberIds)assert.equal(room.view(id).state.fractionMs,.25);
 room.advance(.00025);for(const id of room.memberIds)assert.equal(room.view(id).state.fractionMs,.5);
});
