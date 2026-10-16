import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,advance,validate} from '../../dist/full/engine.mjs';
import {GameSession} from '../../dist/full/session.mjs';
import {RoomSaveSession} from '../../dist/full/room-session.mjs';
import {createRoom} from '../../dist/full/coop-engine.mjs';
import {exportEnvelope,parseImport,decodeEnvelope,checksum,validRoomMarker} from '../../dist/full/storage.mjs';

function fixture(){
 let now=1000,env={state:createGame('knight','Synthetic',undefined,91),revision:4,resolvedAt:now};
 const archives=[],writes=[];let failure=null,gate=null;
 const storage={acquireSession:async()=>({owned:true}),preserveLegacy:async()=>[],readSave:async()=>structuredClone(env),exportEnvelope,parseImport,
  async writeSave(state,revision,resolvedAt,options){if(gate&&options.operation==='room-checkpoint'){const hold=gate;gate=null;await hold;}if(failure){const error=failure;failure=null;throw error;}assert.equal(revision,env.revision,'compare-and-swap');assert(validate(state).ok,validate(state).errors.join());if(options.room!==undefined)assert(validRoomMarker(options.room));if(options.archive)archives.push(structuredClone(env));writes.push({state:structuredClone(state),resolvedAt,options:structuredClone(options)});env={state:structuredClone(state),revision:revision+1,resolvedAt,...(options.room?{room:{...options.room}}:{})};return structuredClone(env);}
 };
 const session=new GameSession({storage,now:()=>now,workerFactory:()=>{throw Error('unexpected offline simulation');}}),room=new RoomSaveSession(session);
 return{session,room,storage,archives,writes,get env(){return env;},set env(value){env=value;},set now(value){now=value;},fail(error){failure=error;},hold(promise){gate=promise;}};
}
const message=(room,state,sequence=1)=>({roomId:room.roomId,memberId:room.memberId,sequence,state:structuredClone(state)});

test('enter checkpoints and archives the exact live baseline, then stops all solo simulation',async()=>{
 const f=fixture();await f.session.start();advance(f.session.state,1);f.session.stateWallAt+=1000;f.now=2000;const baseline=structuredClone(f.session.state),entry=await f.room.enter('family','member-a');assert.deepEqual(entry.state,baseline);assert.deepEqual(f.archives.at(-1).state,baseline);assert.equal(f.env.room.sequence,0);assert.equal(f.session.phase,'room');const before=JSON.stringify(f.env),rng=baseline.rng;assert.deepEqual(f.session.tick(60),[]);assert.equal((await f.session.act({type:'autoToggle'})).ok,false);await f.session.catchUp();await f.session.create('elf','Replacement');assert.equal(JSON.stringify(f.env),before);assert.equal(f.session.state.rng,rng);await assert.rejects(f.room.enter('family','member-a'),/無法加入/);
});
test('checkpoint validation rejects wrong identity, malformed fields and room-view world state before writing',async()=>{
 const f=fixture();await f.session.start();await f.room.enter('family','member-a');const baseline=structuredClone(f.session.state),count=f.writes.length;
 for(const mutate of [m=>m.roomId='other',m=>m.memberId='other',m=>m.sequence=-1,m=>m.sequence=1.5,m=>m.state.id='other-character',m=>delete m.state.player.path,m=>m.state.rng++,m=>m.state.clockMs++,m=>m.state.worlds[m.state.player.map].ground.push({id:'g999',x:m.state.player.x,y:m.state.player.y,itemId:'ITEM-MEAT',count:1}),m=>{m.state.player.x++;}]){const incoming=message(f.room,baseline);mutate(incoming);await assert.rejects(f.room.applyCheckpoint(incoming));assert.equal(f.writes.length,count);assert.equal(f.session.phase,'room');}
});
test('checkpoints serialize, acknowledge only durable writes, use local receive time and reject replay',async()=>{
 const f=fixture();await f.session.start();await f.room.enter('family','member-a');let release;f.hold(new Promise(resolve=>release=resolve));const first=message(f.room,f.session.state,1);first.state.player.gold+=10;first.resolvedAt=999999999;f.now=4000;let acknowledged=false;const a=f.room.applyCheckpoint(first).then(result=>{acknowledged=true;return result;});first.state.player.gold=0;await new Promise(resolve=>setImmediate(resolve));assert.equal(acknowledged,false);assert.equal(f.env.state.player.gold,300);const second=message(f.room,f.session.state,3);second.state.player.gold=330;f.now=5000;const b=f.room.applyCheckpoint(second);release();assert.deepEqual(await a,{accepted:true,sequence:1});assert.deepEqual(await b,{accepted:true,sequence:3});assert.equal(f.env.state.player.gold,330);assert.equal(f.env.resolvedAt,5000);assert.equal(f.writes.at(-2).resolvedAt,4000);assert.equal(f.writes.at(-2).state.player.gold,310);const count=f.writes.length;assert.deepEqual(await f.room.applyCheckpoint(second),{accepted:false,reason:'stale',sequence:3});assert.deepEqual(await f.room.applyCheckpoint(message(f.room,f.session.state,2)),{accepted:false,reason:'stale',sequence:3});assert.equal(f.writes.length,count);
});
test('save failure gives no acknowledgement, preserves last durable progress and blocks normal finish',async()=>{
 const f=fixture();await f.session.start();await f.room.enter('family','member-a');const baseline=structuredClone(f.env),incoming=message(f.room,f.session.state);incoming.state.player.gold+=10;f.fail(Error('synthetic quota failure'));await assert.rejects(f.room.applyCheckpoint(incoming),/quota/);assert.equal(f.session.phase,'blocked');assert.deepEqual(f.env,baseline);assert.deepEqual(f.session.state,baseline.state);assert.deepEqual(await f.room.finish(),{finished:false,reason:'blocked'});
});
test('finish waits for pending checkpoints, saves only durable solo state and never adds room elapsed time',async()=>{
 const f=fixture();await f.session.start();await f.room.enter('family','member-a');const incoming=message(f.room,f.session.state);incoming.state.player.gold+=20;f.now=30000;const saved=f.room.applyCheckpoint(incoming),finished=f.room.finish();await saved;assert.deepEqual(await finished,{finished:true,sequence:1});assert.equal(f.session.phase,'ready');assert.equal(f.env.room,undefined);assert.equal(f.env.resolvedAt,30000);assert.equal(f.env.state.clockMs,0);assert.equal(f.env.state.elapsedMs,'0');assert.equal(f.env.state.player.gold,320);const count=f.writes.length;await f.room.finish();assert.equal(f.writes.length,count);await assert.rejects(f.room.applyCheckpoint(incoming),/已結束/);
});
test('reopen with a room marker waits for explicit continuation and clears marker without offline calculation',async()=>{
 const f=fixture();await f.session.start();await f.room.enter('family','member-a');const incoming=message(f.room,f.session.state);incoming.state.player.gold=350;await f.room.applyCheckpoint(incoming);f.now=900000;const reopened=new GameSession({storage:f.storage,now:()=>900000,workerFactory:()=>{throw Error('room time must not be replayed');}}),count=f.writes.length;await reopened.start();assert.equal(reopened.phase,'room-recovered');assert.equal(f.writes.length,count);await reopened.catchUp();assert.deepEqual(reopened.tick(100),[]);assert.equal(f.writes.length,count);assert(await reopened.resumeRoomRecovery());assert.equal(reopened.phase,'ready');assert.equal(f.env.room,undefined);assert.equal(f.env.resolvedAt,900000);assert.equal(reopened.state.elapsedMs,'0');assert.equal(reopened.state.player.gold,350);assert.equal(await reopened.resumeRoomRecovery(),false);
});
test('export and explicitly confirmed import preserve room interruption guard',async()=>{
 const source=fixture();await source.session.start();await source.room.enter('family','member-a');const exported=await source.session.export();assert.deepEqual(exported.room,{roomId:'family',memberId:'member-a',sequence:0});const target=fixture();await target.session.start();target.session.pendingImport=await parseImport(JSON.stringify(exported));target.now=40000;assert(await target.session.confirmImport());assert.equal(target.session.phase,'room-recovered');assert.equal(target.env.state.elapsedMs,'0');assert.deepEqual(target.env.room,exported.room);assert(await target.session.resumeRoomRecovery());assert.equal(target.env.resolvedAt,40000);assert.equal(target.env.room,undefined);
});
test('malformed room metadata is rejected by both import and persisted envelope decoding',async()=>{
 const state=createGame(),stateJSON=JSON.stringify(state),base={stateJSON,checksum:await checksum(stateJSON),revision:1,resolvedAt:1000};for(const room of [{roomId:'family',memberId:'m',sequence:-1},{roomId:'family',memberId:'m',sequence:0,extra:true},{roomId:'',memberId:'m',sequence:0},null]){await assert.rejects(decodeEnvelope({...base,room}),/連線保存標記/);await assert.rejects(parseImport(JSON.stringify({...base,room,format:'ashen-covenant-v3'})),/連線保存標記/);}
});
test('readonly sessions cannot enter, resume or clear a persisted room marker',async()=>{
 const f=fixture();f.env={...f.env,room:{roomId:'family',memberId:'member-a',sequence:2}};f.storage.acquireSession=async()=>({owned:false});await f.session.start();assert.equal(f.session.phase,'readonly');assert.equal(await f.session.resumeRoomRecovery(),false);await assert.rejects(f.room.enter('family','member-a'),/無法加入/);assert.equal(f.writes.length,0);
});

test('a concurrent save revision change blocks checkpoint instead of overwriting the other writer',async()=>{
 const f=fixture();await f.session.start();await f.room.enter('family','member-a');const incoming=message(f.room,f.session.state);incoming.state.player.gold+=40;f.env={...f.env,revision:f.env.revision+1,state:{...f.env.state,player:{...f.env.state.player,gold:777}}};await assert.rejects(f.room.applyCheckpoint(incoming),/compare-and-swap/);assert.equal(f.env.state.player.gold,777);assert.equal(f.session.phase,'blocked');
});
test('a future wall clock in a room checkpoint retains the existing safety stop',async()=>{
 const f=fixture();f.env={...f.env,resolvedAt:900000,room:{roomId:'family',memberId:'member-a',sequence:2}};await f.session.start();assert.equal(f.session.phase,'blocked');assert.match(f.session.error.message,/時間/);assert.equal(f.writes.length,0);assert.equal(await f.session.resumeRoomRecovery(),false);
});

test('actual cooperative export preserves consumable changes while room view and RNG never replace solo world',async()=>{
 const f=fixture();await f.session.start();advance(f.session.state,8);f.session.state.player.hp-=5;f.session.stateWallAt=9000;f.now=9000;const entry=await f.room.enter('real-engine-room','member-a'),baseline=structuredClone(entry.state),engine=createRoom(555);assert(engine.addMember('member-a',entry.state).ok);assert(engine.addMember('member-b',createGame('elf','Synthetic second',undefined,32)).ok);assert(engine.command('member-a',{type:'useItem',itemId:'ITEM-RED-POTION'}).ok);engine.advance(3);const exported=engine.exportMember('member-a');assert(validate(exported).ok);assert.equal(exported.inventory.stacks['ITEM-RED-POTION'],baseline.inventory.stacks['ITEM-RED-POTION']-1);assert.deepEqual(exported.worlds,baseline.worlds);assert.equal(exported.rng,baseline.rng);await assert.rejects(f.room.applyCheckpoint(message(f.room,engine.view('member-a').state)),/個人世界|個人位置|連線進度/);f.now=12000;assert((await f.room.applyCheckpoint(message(f.room,exported))).accepted);f.now=13000;await f.room.finish();assert.deepEqual(f.env.state.worlds,baseline.worlds);assert.equal(f.env.state.clockMs,baseline.clockMs);assert.equal(f.env.state.elapsedMs,baseline.elapsedMs);assert.equal(f.env.state.inventory.stacks['ITEM-RED-POTION'],99);assert.equal(f.env.resolvedAt,13000);
});

test('compact checkpoints restore only the local solo history and still reject foreign identity, clock and position',async()=>{
 const f=fixture();await f.session.start();await f.room.enter('compact-room','member-a');const baseline=structuredClone(f.room.baseline),packet={...message(f.room,baseline),personalWorlds:'local-baseline'};packet.state.worlds={};packet.state.player.gold+=12;
 assert((await f.room.applyCheckpoint(packet)).accepted);assert.deepEqual(f.env.state.worlds,baseline.worlds);assert.equal(f.env.state.player.gold,312);
 const writes=f.writes.length;for(const mutate of [m=>m.personalWorlds='remote',m=>m.state.worlds=baseline.worlds,m=>m.state.id='different',m=>m.state.rng++,m=>m.state.player.x++]){const forged=structuredClone(packet);forged.sequence=2;mutate(forged);await assert.rejects(f.room.applyCheckpoint(forged));assert.equal(f.writes.length,writes);}
});
