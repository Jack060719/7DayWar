import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,ensureWorld,advance as soloAdvance,validate} from '../../dist/full/engine.mjs';
import {addXP,xpAtLevel,stats} from '../../dist/full/rules.mjs';
import {monsterDefinition} from '../../dist/full/silver-monsters.mjs';
import {createRoom} from '../../dist/full/coop-engine.mjs';
import {fromSolo,validateRoster,selectedView,memberViews,members,select,createMember,command,advance,replaceSelected,configureParty,roomView} from '../../dist/full/roster.mjs';
function character(classId='knight'){
  const state=createGame(classId,'Local',undefined,74);addXP(state,xpAtLevel(50));state.player.hp=stats(state).maxHp;state.player.mp=stats(state).maxMp;return state;
}
function fixture(count=2){
  const original=character(),map='MAP-REG-ELF';original.player.map=map;ensureWorld(original,map);
  const monster=original.worlds[map].monsters.find(m=>m.type==='MON-ATUBA');
  delete original.worlds[map].fieldCamps;monster.elite=false;original.worlds[map].monsters=[monster];Object.assign(monster,{hp:10000,maxHp:10000,attackAt:100000,nextAI:100000});Object.assign(original.player,monster.origin);
  const roster=fromSolo(original);
  for(let i=1;i<count;i++)assert(createMember(roster,{name:'P'+i,classId:'mage',seed:90+i}).ok);
  for(const member of roster.simulation.members){Object.assign(member.state.player,{map,...monster.origin});member.state.worlds[map]={ground:[]};member.state.nextAI=100000;member.state.player.attackAt=0}
  assert(validateRoster(roster).ok,validateRoster(roster).errors.join());return {roster,map,monsterId:monster.id};
}
const monsterOf=(roster,map)=>roster.simulation.worlds[map].monsters[0];

test('single-character adoption is lossless and ordinary online simulation preserves solo state and RNG',()=>{
  const original=character(),copy=structuredClone(original),roster=fromSolo(original);
  assert.deepEqual(selectedView(roster),original);assert.deepEqual(original,copy);
  advance(roster,17.3);soloAdvance(copy,17.3);
  assert.deepEqual(selectedView(roster),copy);
  assert(validateRoster(roster).ok);
});

test('four permanent characters have distinct identities, a single world copy, and bounded creation',()=>{
  const roster=fromSolo(character());
  for(const classId of ['elf','mage','darkelf'])assert(createMember(roster,{classId,name:classId}).ok);
  const before=JSON.stringify(roster);assert(!createMember(roster,{name:'fifth'}).ok);assert.equal(JSON.stringify(roster),before);
  assert.equal(members(roster).length,4);assert.equal(new Set(memberViews(roster).map(row=>row.state.id)).size,4);
  for(const member of roster.simulation.members)for(const world of Object.values(member.state.worlds))assert.deepEqual(Object.keys(world),['ground']);
  assert(validateRoster(JSON.parse(JSON.stringify(roster))).ok);
  for(const row of members(roster)){assert(select(roster,row.id).ok);assert.equal(selectedView(roster).player.name,row.name);assert(validate(selectedView(roster)).ok)}
});

test('all characters share the same monster without applying family difficulty to local play',()=>{
  const {roster,map,monsterId}=fixture(4);
  for(const member of members(roster)){select(roster,member.id);assert(command(roster,{type:'attack',targetId:monsterId}).ok)}
  const before=monsterOf(roster,map).hp;
  advance(roster,1);
  assert(monsterOf(roster,map).hp<before);assert.equal(monsterOf(roster,map).maxHp,10000);assert.equal(monsterOf(roster,map).roomCombat,undefined);
  assert(memberViews(roster).every(({state})=>state.player.lastCombatAt!==undefined));
  assert(validateRoster(roster).ok,validateRoster(roster).errors.join());
});

test('JSON reopening and offline chunks preserve every member, shared RNG, contribution and reward cursors',()=>{
  const {roster,monsterId}=fixture(3);
  configureParty(roster,{enabled:true,leaderId:'member-1'});
  for(const member of roster.simulation.members){member.state.auto.enabled=true;member.state.auto.phase='HUNT';member.state.auto.targetMap=member.state.player.map;member.state.nextAI=100000}
  for(const id of ['member-1','member-2','member-3']){select(roster,id);command(roster,{type:'attack',targetId:monsterId})}
  const reopened=JSON.parse(JSON.stringify(roster));advance(roster,12,{offline:true});
  for(let i=0;i<24;i++)advance(reopened,.5,{offline:true});
  assert.deepEqual(reopened,JSON.parse(JSON.stringify(roster)));assert(validateRoster(roster).ok);
});

test('an invalid command is atomic across all four actors and shared world',()=>{
  const {roster}=fixture(4),before=structuredClone(roster);
  assert(!command(roster,{type:'configureAuto',settings:{hpThreshold:-1}}).ok);assert.deepEqual(roster,before);
  assert(!select(roster,'missing').ok);assert.deepEqual(roster,before);
});

test('family export replaces only the selected character while the other three and local world remain paused',()=>{
  const {roster}=fixture(4);select(roster,'member-2');
  const before=structuredClone(roster),state=selectedView(roster),room=createRoom(7);assert(room.addMember('phone',state).ok);
  assert(room.command('phone',{type:'useItem',itemId:'ITEM-RED-POTION'}).ok);room.advance(3);
  const result=room.exportMember('phone');assert(replaceSelected(roster,result).ok);
  assert.deepEqual(roster.simulation.worlds,before.simulation.worlds);
  for(const key of ['clockMs','fractionMs','rng'])assert.equal(roster.simulation[key],before.simulation[key]);
  for(let i=0;i<4;i++)if(i!==1)assert.deepEqual(roster.simulation.members[i],before.simulation.members[i]);
  assert.equal(selectedView(roster).inventory.stacks['ITEM-RED-POTION'],state.inventory.stacks['ITEM-RED-POTION']-1);
  assert(validateRoster(roster).ok,validateRoster(roster).errors.join());
  const denied=structuredClone(result);denied.clockMs++;assert(!replaceSelected(roster,denied).ok);
});

test('party off rewards the final attacker; party on splits EXP only among actual participants',()=>{
  for(const enabled of [false,true]){
    const {roster,map,monsterId}=fixture(3);if(enabled)configureParty(roster,{enabled:true,leaderId:'member-1'});
    select(roster,'member-1');command(roster,{type:'attack',targetId:monsterId});advance(roster,0);command(roster,{type:'stopAuto'});
    select(roster,'member-2');command(roster,{type:'attack',targetId:monsterId});advance(roster,0);command(roster,{type:'stopAuto'});
    monsterOf(roster,map).hp=1;roster.simulation.rng=1;for(const member of roster.simulation.members)member.state.rng=1;
    const member=roster.simulation.members[1];member.state.player.attackAt=0;member.state.needsProcess=true;
    command(roster,{type:'attack',targetId:monsterId});advance(roster,0);
    const views=memberViews(roster),exp=monsterDefinition(monsterOf(roster,map)).exp;
    assert.equal(views[0].state.summary.xpEarned,String(enabled?exp/2:0));assert.equal(views[1].state.summary.xpEarned,String(enabled?exp/2:exp));assert.equal(views[2].state.summary.xpEarned,'0');
  }
});

test('party-only ally healing chooses a wounded participant before attacking, and follow uses walkable paths',()=>{
  const {roster,map,monsterId}=fixture(2);configureParty(roster,{enabled:true,leaderId:'member-1',follow:true});
  select(roster,'member-1');command(roster,{type:'attack',targetId:monsterId});advance(roster,0);command(roster,{type:'stopAuto'});
  const leader=roster.simulation.members[0].state,healer=roster.simulation.members[1].state;
  leader.player.hp=1;addXP(healer,xpAtLevel(50));healer.player.skills.push('SKILL-G01-01');healer.player.mp=stats(selectedView({...roster,selectedId:'member-2'})).maxMp;
  healer.auto.enabled=true;healer.auto.phase='HUNT';healer.auto.targetMap=map;healer.nextAI=0;healer.needsProcess=true;
  advance(roster,0);assert.equal(roster.simulation.members[1].state.player.cast?.targetId,leader.player.id);
  advance(roster,.5);assert(roster.simulation.members[0].state.player.hp>1);
  const view=roomView(roster);assert.equal(view.players.length,1);
});

test('roster validation is pure and rejects corrupt clocks, identities, private ground and contribution references',()=>{
  const {roster}=fixture(2),before=structuredClone(roster);assert(validateRoster(roster).ok);assert.deepEqual(roster,before);
  const corruptions=[r=>r.selectedId='missing',r=>r.simulation.members[1].id=r.simulation.members[0].id,r=>r.simulation.clockMs++,r=>r.simulation.members[0].state.player.hp=1e9,r=>r.simulation.members[0].state.worlds['MAP-TOWN-SILVER'].monsters=[],r=>r.simulation.contributions.push(['missing',['member-1']]),r=>r.simulation.xpCursor=1000];
  for(const corrupt of corruptions){const value=structuredClone(roster);corrupt(value);assert(!validateRoster(value).ok)}
});


test('read-only snapshot views do not mutate or alias the roster and always observe external edits',()=>{
 const {roster,map}=fixture(2),before=structuredClone(roster);
 const freeze=value=>{if(value&&typeof value==='object'){Object.freeze(value);for(const child of Object.values(value))freeze(child)}return value};
 freeze(roster);const view=roomView(roster);assert.deepEqual(roster,before);assert.equal(view.state.player.id,'hero');
 view.state.player.name='Changed view';view.state.worlds[map].monsters[0].hp=7;view.players[0].player.name='Changed peer';assert.deepEqual(roster,before);
 const changed=structuredClone(before);changed.simulation.members[0].state.player.name='External edit';changed.simulation.worlds[map].monsters[0].hp=77;
 assert.equal(selectedView(changed).player.name,'External edit');assert.equal(roomView(changed).state.worlds[map].monsters[0].hp,77);
 const old=structuredClone(changed),priorSimulation=changed.simulation;advance(changed,.25);assert.deepEqual(priorSimulation,old.simulation);
});
