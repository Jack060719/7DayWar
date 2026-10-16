import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {stats,weight,random,addXP,xpAtLevel} from '../../dist/full/rules.mjs';
import {geometry,nearestWalkable,walkable} from '../../dist/full/world.mjs';
import {visibleCell} from '../../dist/full/silver-camps.mjs';

const file=new URL('../../dist/full/engine.mjs',import.meta.url);
let source=fs.readFileSync(file,'utf8').replace(/from\s*(['"])(\.\/[^'"]+)\1/g,(_,quote,path)=>'from '+JSON.stringify(new URL(path,file).href));
source+='\nexport {playerPassive as passive,autoDecision as decide,tickWorld as tickWorldProbe,resolveWeaponAttack as attack,takeDamage as damage};';
const engine=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const {createGame,ensureWorld,command,advance,validate}=engine;
function encounter(type='MON-ORC',map='MAP-REG-GLUDIN'){
  const state=createGame('mage','Synthetic safety',undefined,73);
  addXP(state,xpAtLevel(50));
  state.player.hp=stats(state).maxHp;
  state.player.mp=0;
  state.player.map=map;
  const world=ensureWorld(state,map),monster=world.monsters.find(m=>m.type===type);
  assert(monster);
  // A legacy encounter isolates the existing respawn/combat policy from new camp activation.
  delete world.fieldCamps;
  world.monsters=[monster];
  Object.assign(state.player,monster.origin);
  Object.assign(monster,{hp:10000,maxHp:10000,nextAI:1000000,attackAt:1000000,path:[]});
  state.nextAI=1000000;
  return {state,world,monster};
}
function regenAt(state,time){
  state.clockMs=time;
  state.player.regenAt=time;
  engine.passive(state,[]);
}
function missSeed(){
  for(let seed=100000;seed<100000000;seed+=100000)if(random({rng:seed})>.99)return seed;
  throw Error('Missing deterministic miss seed');
}

test('outgoing attacks stop natural HP for eight seconds after stopping, without changing idle MP',()=>{
  const {state,monster}=encounter();
  state.player.hp=1;
  const before=state.rng;
  assert(engine.attack(state,monster,[]).attempted);
  assert.notEqual(state.rng,before);
  assert.equal(state.player.lastCombatAt,0);
  state.player.targetId=null;
  regenAt(state,7999);
  assert.equal(state.player.hp,1);
  assert.equal(state.player.mp,stats(state).regenMp);
  regenAt(state,8000);
  assert.equal(state.player.hp,1+stats(state).regenHp);
  state.player.targetId=monster.id;
  regenAt(state,16000);
  assert.equal(state.player.hp,1+stats(state).regenHp);
});

test('incoming misses still stop HP regeneration; invalid or out-of-range attacks do not enter combat',()=>{
  const {state,monster}=encounter();
  state.player.hp=1;
  state.rng=missSeed();
  const events=[];
  const result=engine.attack(state,state.player,events,{attacker:monster});
  assert(result.attempted&&!result.hit);
  assert(events.some(event=>event.type==='miss'));
  assert.equal(state.player.lastCombatAt,0);
  regenAt(state,7999);
  assert.equal(state.player.hp,1);
  delete state.player.lastCombatAt;
  const rng=state.rng;
  monster.x+=100;
  assert.equal(engine.attack(state,monster,[]),false);
  assert.equal(state.player.lastCombatAt,undefined);
  assert.equal(state.rng,rng);
});

test('actual damage and poison retain the existing combat MP fraction while natural HP is zero',()=>{
  const {state}=encounter();
  state.player.hp=10;
  engine.damage(state,state.player,1,[],'synthetic-dot');
  regenAt(state,4000);
  assert.equal(state.player.hp,9);
  assert.equal(state.player.mp,Math.floor(stats(state).regenMp*.25));
  assert.equal(state.player.mpFraction,stats(state).regenMp*.25%1);
  state.player.effects=[{id:'poison',group:'poison',values:{},started:4000,until:9000,tickAt:5000,tickEvery:3000,tickDamage:1}];
  regenAt(state,5000);
  assert.equal(state.player.hp,8);
  assert.equal(state.player.lastHitAt,5000);
});

test('offensive spell startup blocks HP recovery, but healing items and failed casts retain their behavior',()=>{
  const {state,monster}=encounter();
  state.player.skills.push('SKILL-G01-04');
  state.player.hp=1;
  const rng=state.rng;
  assert(!command(state,{type:'skill',skillId:'SKILL-G01-04',targetId:monster.id}).ok);
  assert.equal(state.player.lastCombatAt,undefined);
  assert.equal(state.rng,rng);
  state.player.mp=stats(state).maxMp;
  assert(command(state,{type:'skill',skillId:'SKILL-G01-04',targetId:monster.id}).ok);
  assert.equal(state.player.lastCombatAt,0);
  regenAt(state,250);
  assert.equal(state.player.hp,1);
  state.player.cast=null;
  assert(command(state,{type:'useItem',itemId:'ITEM-RED-POTION'}).ok);
  assert(state.player.hp>1);
});

test('combat timer survives JSON reopening and segmented offline recovery with identical RNG and HP/MP',()=>{
  const {state,monster}=encounter();
  state.player.hp=1;
  engine.attack(state,monster,[]);
  state.player.targetId=null;
  state.player.regenAt=4000;
  const online=structuredClone(state),saved=JSON.parse(JSON.stringify(state));
  advance(online,14);
  advance(saved,7,{offline:true});
  const reopened=JSON.parse(JSON.stringify(saved));
  advance(reopened,7,{offline:true});
  assert.deepEqual(reopened,JSON.parse(JSON.stringify(online)));
  assert.equal(online.player.hp,1+stats(online).regenHp);
  assert(validate(reopened).ok,validate(reopened).errors.join());
});

for(const [type,map] of [['MON-ORC','MAP-REG-GLUDIN'],['MON-KURTZ','MAP-REG-TALKING']]){
  test(type+' existing respawn waits outside the actual spawn area without consuming RNG or an ID',()=>{
    const {state,world,monster}=encounter(type,map);
    Object.assign(monster,{hp:0,lootDone:true,respawnAt:0,deadAt:0});
    const id=monster.id,rng=state.rng,nextId=state.nextId;
    engine.tickWorldProbe(state,[],false);
    assert.equal(world.monsters[0].id,id);
    assert.equal(world.monsters[0].hp,0);
    assert.equal(state.rng,rng);
    assert.equal(state.nextId,nextId);
    Object.assign(state.player,nearestWalkable(geometry(map),{x:4,y:4}));
    assert(!visibleCell(state.player,monster.origin));
    engine.tickWorldProbe(state,[],false);
    const born=world.monsters[0];
    assert.notEqual(born.id,id);
    assert(born.hp>0);
    assert(!visibleCell(state.player,born));
    assert(walkable(geometry(map),born.x,born.y));
    assert.equal(world.monsters.length,1);
    assert(validate(state).ok,validate(state).errors.join());
  });
}

test('respawn uses every same-map room viewer, not just the first player',()=>{
  const {state,world,monster}=encounter('MON-KURTZ','MAP-REG-TALKING');
  const watcher={...state.player,id:'peer'};
  Object.assign(state.player,nearestWalkable(geometry(state.player.map),{x:4,y:4}));
  Object.assign(monster,{hp:0,lootDone:true,respawnAt:0,deadAt:0});
  engine.cooperativeEngine.attach(state,{players:()=>[state.player,watcher],actors:()=>[state.player,watcher],combatState:()=>state});
  engine.tickWorldProbe(state,[],false);
  assert.equal(world.monsters[0],monster);
  Object.assign(watcher,state.player,{id:'peer'});
  engine.tickWorldProbe(state,[],false);
  assert.notEqual(world.monsters[0].id,monster.id);
});

test('ordinary respawn cannot pass an old-origin check then randomly appear inside the current view',()=>{
  const {state,world,monster}=encounter();
  Object.assign(monster,{hp:0,lootDone:true,respawnAt:0,deadAt:0,origin:nearestWalkable(geometry(state.player.map),{x:4,y:4})});
  assert(!visibleCell(state.player,monster.origin));
  const rng=state.rng;
  engine.tickWorldProbe(state,[],false);
  assert.equal(world.monsters[0],monster);
  assert.equal(state.rng,rng);
});

for(const phase of ['TRAVEL','RETURN_MAP','HUNT','LOOT']){
  test(phase+' returns safely when HP potions run out even if restock and minimum stock are zero',()=>{
    const {state}=encounter();
    state.auto.enabled=true;
    state.auto.phase=phase;
    state.auto.targetMap=state.player.map;
    state.auto.settings.stock={'ITEM-RED-POTION':0};
    state.auto.settings.minimumStock={'ITEM-RED-POTION':0};
    delete state.inventory.stacks['ITEM-RED-POTION'];
    state.player.targetId='obsolete-target';
    state.player.path=[{x:state.player.x+1,y:state.player.y}];
    engine.decide(state,[]);
    assert.equal(state.auto.phase,'RETURN');
    assert.equal(state.player.targetId,null);
    assert.deepEqual(state.player.path,[]);
    assert.match(state.auto.reason,/藥水/);
    const before=state.inventory.stacks['ITEM-RETURN-SCROLL'];
    engine.decide(state,[]);
    assert.equal(state.player.cast?.kind,'return');
    assert.equal(state.inventory.stacks['ITEM-RETURN-SCROLL'],before-1);
  });
}

test('80 percent is a travel safety ceiling while a lower configured return threshold still works',()=>{
  for(const [threshold,ratio] of [[.95,.8],[.6,.65]]){
    const {state}=encounter();
    state.auto.enabled=true;
    state.auto.phase='TRAVEL';
    state.auto.settings.returnWeight=threshold;
    state.player.mp=stats(state).maxMp;
    const item=engine.ITEMS['ITEM-IRON'];
    state.inventory.stacks['ITEM-IRON']=Math.ceil((stats(state).carry*ratio-weight(state).total)/item.weight);
    assert(weight(state).ratio>=ratio);
    engine.decide(state,[]);
    assert.equal(state.auto.phase,'RETURN');
    assert.match(state.auto.reason,/負重/);
  }
});

test('resupply with a zero potion target stops instead of repeatedly leaving town and burning return scrolls',()=>{
  const state=createGame();
  state.auto.enabled=true;
  state.auto.phase='RESUPPLY';
  state.auto.settings.stock={'ITEM-RED-POTION':0};
  state.auto.settings.minimumStock={'ITEM-RED-POTION':0};
  delete state.inventory.stacks['ITEM-RED-POTION'];
  const scrolls=state.inventory.stacks['ITEM-RETURN-SCROLL'];
  engine.decide(state,[]);
  assert.equal(state.auto.phase,'BLOCKED');
  assert.equal(state.auto.enabled,false);
  assert.match(state.auto.reason,/補給/);
  assert.equal(state.inventory.stacks['ITEM-RETURN-SCROLL'],scrolls);
});

test('travel shortage return remains identical online, offline and after reopening',()=>{
  const {state,world}=encounter();
  world.monsters=[];
  state.auto.enabled=true;state.auto.phase='TRAVEL';state.nextAI=0;
  state.auto.settings.stock={'ITEM-RED-POTION':0};state.auto.settings.minimumStock={'ITEM-RED-POTION':0};
  delete state.inventory.stacks['ITEM-RED-POTION'];
  const online=structuredClone(state),offline=structuredClone(state),saved=JSON.parse(JSON.stringify(state));
  advance(online,4);advance(offline,4,{offline:true});
  advance(saved,1,{offline:true});
  const reopened=JSON.parse(JSON.stringify(saved));
  advance(reopened,3,{offline:true});
  assert.deepEqual(reopened,JSON.parse(JSON.stringify(offline)));
  // An inactive offline scheduler stops waking for nextAI; all game outcomes remain equal.
  const {nextAI:onlineWake,...onlineOutcome}=JSON.parse(JSON.stringify(online));
  const {nextAI:offlineWake,...offlineOutcome}=reopened;
  assert.deepEqual(offlineOutcome,onlineOutcome);
  assert.equal(online.player.map,online.player.home==='MAP-TOWN-SILVER'?'MAP-TOWN-GLUDIN':online.player.home);
  assert(validate(reopened).ok,validate(reopened).errors.join());
});


test('friendly healing is not a hostile attack and does not suppress ordinary natural recovery',()=>{
  const {state}=encounter();
  state.player.skills.push('SKILL-G01-01');state.player.mp=stats(state).maxMp;state.player.hp=1;
  assert(command(state,{type:'skill',skillId:'SKILL-G01-01',targetId:'hero'}).ok);
  assert.equal(state.player.lastCombatAt,undefined);
  regenAt(state,250);
  assert.equal(state.player.hp,1+stats(state).regenHp);
});
