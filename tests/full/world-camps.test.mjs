import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {MAPS,MONSTERS,CONNECTIONS} from '../../dist/full/data.mjs';
import {habitatSpacing,fieldCampAt,refreshFieldCamps,validateFieldCamps,dormantFieldActors} from '../../dist/full/world-camps.mjs';
import {visibleCell} from '../../dist/full/silver-camps.mjs';
import {geometry,walkable,canStep,crossing} from '../../dist/full/world.mjs';
const file=new URL('../../dist/full/engine.mjs',import.meta.url);
let source=fs.readFileSync(file,'utf8').replace(/from\s*(['"])(\.\/[^'"]+)\1/g,(_,q,p)=>'from '+JSON.stringify(new URL(p,file).href));
source+='\nexport{changeMap,spawnMonster};';
const engine=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
function fixture(){const state=engine.createGame('knight','Camp fixture',undefined,42);state.player.map='MAP-REG-GLUDIN';const world=engine.ensureWorld(state,state.player.map);world.monsters=[];let camp;for(let y=10;y<15&&!camp;y++)for(let x=10;x<15&&!camp;x++)camp=fieldCampAt(state.player.map,x,y);assert(camp);return{state,world,camp}}
function refresh(state,viewers,centers=viewers){refreshFieldCamps(state,viewers,(map,binding,index,views)=>engine.spawnMonster(state,map,binding,index,views),{centers})}

test('grid density covers reachable habitat beyond the old spawn zones with only native species and legal three-actor patrols',()=>{
 assert.equal(habitatSpacing('MAP-REG-TALKING'),11);assert.equal(habitatSpacing('MAP-DUN-GLUDIN-F01'),11);assert.equal(habitatSpacing('MAP-REG-ELF'),8);assert.equal(habitatSpacing('MAP-REG-DRAGON'),6);assert.equal(habitatSpacing('MAP-TOWN-SILVER'),null);
 const {state,world,camp}=fixture();refresh(state,[],[camp.point]);
 assert(Object.keys(world.fieldCamps.cycles).length>30);
 for(const monster of world.monsters){assert(walkable(geometry(world.mapId),monster.x,monster.y));assert(MAPS[world.mapId].inhabitant_assignment.spawn_bindings.some(binding=>binding.monster_id===monster.type));assert(!MONSTERS[monster.type].boss)}
 const own=world.monsters.filter(monster=>monster.fieldCampId===camp.id);assert.equal(own.length,3);assert.deepEqual(own.map(m=>m.fieldRole),['guard','guard','patrol']);assert(own[2].patrol.slice(1).every((p,i)=>canStep(geometry(world.mapId),own[2].patrol[i],p)));
 assert.deepEqual(validateFieldCamps(world),[]);
});

test('first camp generation never appears in any same-map viewer footprint and blocking it consumes no camp identity or random roll',()=>{
 const {state,world,camp}=fixture(),watcher={...camp.point};refresh(state,[watcher],[camp.point]);
 assert(!world.fieldCamps.cycles[camp.id]);assert(world.monsters.every(m=>!visibleCell(watcher,m)));
 const before=JSON.stringify(state);refresh(state,[watcher],[camp.point]);assert.equal(JSON.stringify(state),before);
 refresh(state,[],[camp.point]);assert(world.fieldCamps.cycles[camp.id]);
});

test('a camp waits for all three deaths and ninety seconds, then atomically replaces the generation only outside every view',()=>{
 const {state,world,camp}=fixture();refresh(state,[],[camp.point]);
 const cycle=world.fieldCamps.cycles[camp.id],rows=cycle.monsterIds.map(id=>world.monsters.find(m=>m.id===id));
 Object.assign(rows[0],{hp:0,deadAt:0,respawnAt:1,lootDone:true});state.clockMs=100000;refresh(state,[],[camp.point]);assert.equal(cycle.nextSpawnAt,null);assert.equal(rows[0].hp,0);
 for(const m of rows)Object.assign(m,{hp:0,deadAt:100000,respawnAt:100001,lootDone:true});refresh(state,[],[camp.point]);assert.equal(cycle.nextSpawnAt,190000);
 state.clockMs=189999;refresh(state,[],[camp.point]);assert.equal(world.fieldCamps.cycles[camp.id].generation,0);
 state.clockMs=190000;refresh(state,[camp.point],[camp.point]);assert.equal(world.fieldCamps.cycles[camp.id].generation,0);
 const saved=JSON.parse(JSON.stringify(state));refresh(state,[],[camp.point]);refresh(saved,[],[camp.point]);
 assert.deepEqual(JSON.parse(JSON.stringify(state)),JSON.parse(JSON.stringify(saved)));assert.equal(world.fieldCamps.cycles[camp.id].generation,1);assert(world.monsters.filter(m=>m.fieldCampId===camp.id).every(m=>m.hp>0&&!rows.some(old=>old.id===m.id)));assert.deepEqual(validateFieldCamps(world),[]);
});

test('entering a legacy world enables the new ledger while preserving every live actor and its original values',()=>{
 const state=engine.createGame('knight','Legacy camps',undefined,42),map='MAP-REG-GLUDIN',world=engine.ensureWorld(state,map);delete world.fieldCamps;
 const before=structuredClone(world.monsters);engine.changeMap(state,map,{x:200,y:200},[]);
 assert(world.fieldCamps);for(const old of before)assert.deepEqual(world.monsters.find(m=>m.id===old.id),old);
 assert(engine.validate(state).ok,engine.validate(state).errors.join());
 const tampered=structuredClone(world);Object.values(tampered.fieldCamps.cycles)[0].generation++;
 assert(validateFieldCamps(tampered).length>0);
});


test('inactive camp compression round-trips wounded actors, identity and timers without advancing RNG, and rejects malformed tuples',()=>{
 const {state,world,camp}=fixture();refresh(state,[],[camp.point]);const cycle=world.fieldCamps.cycles[camp.id];const rows=cycle.monsterIds.map(id=>world.monsters.find(m=>m.id===id));rows[0].hp=1;rows[0].lastHitAt=29;rows[1].attackAt=12345;rows[2].patrolIndex=2;rows[2].path=[{...camp.slots[0]}];const before=JSON.parse(JSON.stringify(rows)),rng=state.rng,nextId=state.nextId;
 refresh(state,[],[]);assert.equal(world.monsters.length,0);assert(world.fieldCamps.dormant[camp.id]);assert.equal(state.rng,rng);assert.equal(state.nextId,nextId);assert.deepEqual(validateFieldCamps(world),[]);
 const saved=JSON.parse(JSON.stringify(state));refresh(saved,[],[camp.point]);assert.deepEqual(JSON.parse(JSON.stringify(cycle.monsterIds.map(id=>saved.worlds[world.mapId].monsters.find(m=>m.id===id)))),before);assert.equal(saved.rng,rng);assert.equal(saved.nextId,nextId);assert.equal(dormantFieldActors(saved.worlds[world.mapId]).length,0);
 const corrupt=structuredClone(world),packed=JSON.parse(corrupt.fieldCamps.dormant[camp.id]);packed.actors[0][1].id='wrong';corrupt.fieldCamps.dormant[camp.id]=JSON.stringify(packed);assert(validateFieldCamps(corrupt).length>0);
});


test('a failed authority command rolls back a woken sparse camp, new worlds, personal state, RNG and identities together',async()=>{
 const url=new URL('../../dist/full/coop-engine.mjs',import.meta.url);let roomSource=fs.readFileSync(url,'utf8').replace(/from\s*(['"])(\.\/[^'"]+)\1/g,(_,q,p)=>'from '+JSON.stringify(new URL(p,url).href));roomSource=roomSource.replace('get memberIds()','probe(){return this.#members} get memberIds()').replace('if(result.tradeCommitted)',"if(action.failAfterAction)throw Error('Synthetic post-action fault');if(result.tradeCommitted)");const{createRoom}=await import('data:text/javascript;base64,'+Buffer.from(roomSource).toString('base64')),shared=await import('../../dist/full/engine.mjs');const room=createRoom(451);assert(room.addMember('a',shared.createGame()).ok);const state=room.probe().get('a').state,map='MAP-REG-GLUDIN';shared.ensureWorld(state,map);state.player.map=map;refresh(state,[],[{x:200,y:200}]);refresh(state,[],[]);assert(Object.keys(state.worlds[map].fieldCamps.dormant).length);const town='MAP-TOWN-GLUDIN';shared.ensureWorld(state,town);state.player.map=town;const connectionId=Object.keys(CONNECTIONS).find(id=>crossing(id,town)?.mapId===map);assert(connectionId);Object.assign(state.player,crossing(connectionId,town).entrance);const before=JSON.parse(JSON.stringify(room.view('a')));const result=room.command('a',{type:'travel',connectionId,failAfterAction:true});assert(!result.ok);assert.match(result.error,/post-action/);assert.deepEqual(JSON.parse(JSON.stringify(room.view('a'))),before);assert(shared.validate(room.exportMember('a')).ok);
});
