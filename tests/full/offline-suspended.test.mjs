import test from 'node:test';
import assert from 'node:assert/strict';
import {GameSession} from '../../dist/full/session.mjs';
import {createGame,validate} from '../../dist/full/engine.mjs';
import * as R from '../../dist/full/roster.mjs';
function fixture({roster=true,owned=true,delay=0}={}){
 let now=1000,failed=false,workerStarts=0;
 const state=createGame('knight','Synthetic',undefined,603),ledger=roster?R.fromSolo(state):null;
 if(ledger)for(const [i,classId]of ['elf','mage','darkelf'].entries())assert(R.createMember(ledger,{classId,name:'Member '+i,seed:604+i}).ok);
 let env={state:ledger?R.selectedView(ledger):state,...(ledger?{roster:ledger}:{}),revision:1,resolvedAt:now};const writes=[];
 const storage={acquireSession:async()=>({owned}),preserveLegacy:async()=>[],readSave:async()=>structuredClone(env),
  writeSave:async(state,rev,at,options)=>write(state,false,rev,at,options),
  ...(roster?{writeRoster:async(value,rev,at,options)=>write(value,true,rev,at,options)}:{})};
 async function write(value,isRoster,rev,at,options){assert.equal(rev,env.revision);if(failed)throw Error('synthetic storage failure');assert((isRoster?R.validateRoster(value):validate(value)).ok);now+=delay;writes.push(options.operation);env=structuredClone({state:isRoster?R.selectedView(value):value,...(isRoster?{roster:value}:{}),revision:rev+1,resolvedAt:at});return structuredClone(env)}
 const make=()=>new GameSession({storage,catchUpEnabled:false,now:()=>now,workerFactory:()=>{workerStarts++;throw Error('suspended site must not launch a Worker')}});
 return{make,storage,writes,get env(){return structuredClone(env)},get starts(){return workerStarts},get now(){return now},set now(v){now=v},set failed(v){failed=v}};
}
test('opening an old four-character save preserves every earned field without offline simulation',async()=>{
 const f=fixture({delay:400}),before=f.env;f.now+=30*86400000;const s=f.make();await s.start();
 assert.equal(s.phase,'ready');assert.equal(s.busy,false);assert.equal(f.starts,0);assert.equal(s.report,null);assert.deepEqual(s.roster,before.roster);assert.deepEqual(f.env.roster,before.roster);assert.equal(s.stateWallAt,f.now);assert.deepEqual(f.writes,['offline-suspended']);
 const revision=f.env.revision;await s.catchUp();assert.equal(f.env.revision,revision);assert.equal(f.starts,0);
});
test('single-character saves retain RNG, inventory, position and progress on return',async()=>{
 const f=fixture({roster:false}),before=f.env.state;f.now+=86400000;const s=f.make();await s.start();assert.equal(s.phase,'ready');assert.deepEqual(s.state,before);assert.deepEqual(f.env.state,before);assert.equal(f.starts,0);
});
test('foreground four-character simulation still advances and survives repeated reopen',async()=>{
 const f=fixture(),s=f.make();await s.start();const expected=structuredClone(s.roster);R.advance(expected,3);f.now+=3000;s.tick(3);assert.deepEqual(s.roster,expected);await s.checkpoint();
 for(let i=0;i<2;i++){f.now+=86400000;const reopened=f.make();await reopened.start();assert.equal(reopened.phase,'ready');assert.deepEqual(reopened.roster,expected);assert.equal(reopened.stateWallAt,f.now)}assert.equal(f.starts,0);
});
test('background return retains live unsaved progress; a foreground gap cannot start the old loop',async()=>{
 const f=fixture({delay:400}),s=f.make();await s.start();f.now+=1000;s.tick(1);const before=structuredClone(s.roster);s.report={seconds:999};s.catchupOrigin={};f.now+=86400000;
 await s.catchUp({offline:true});assert.equal(s.phase,'ready');assert.deepEqual(f.env.roster,before);assert.equal(s.report,null);assert.equal(s.catchupOrigin,null);assert.equal(s.stateWallAt,f.now);
 const writes=f.writes.length;f.now+=800;await s.catchUp({offline:false});assert.equal(f.writes.length,writes);assert.deepEqual(s.roster,before);assert.equal(s.stateWallAt,f.now);assert.equal(f.starts,0);
});
test('confirmed old import retains its exact four-character contents without backpay',async()=>{
 const f=fixture(),s=f.make();await s.start();const incoming=R.fromSolo(createGame('mage','Imported',undefined,719));s.pendingImport={state:R.selectedView(incoming),roster:incoming,resolvedAt:1000};f.now+=86400000;
 assert(await s.confirmImport());assert.equal(s.phase,'ready');assert.deepEqual(f.env.roster,incoming);assert.deepEqual(s.roster,incoming);assert.equal(s.report,null);assert.equal(f.starts,0);
});
test('failed write preserves durable state and cannot be bypassed by retrying catchUp',async()=>{
 const f=fixture(),before=f.env;f.failed=true;f.now+=86400000;const s=f.make();await s.start();assert.equal(s.phase,'blocked');assert.deepEqual(f.env,before);assert.equal(s.busy,false);assert.match(s.error.message,/storage failure/);
 f.failed=false;await s.catchUp();assert.equal(s.phase,'blocked');assert.deepEqual(f.env,before);assert.equal(f.starts,0);
});
test('readonly, rollback and recovery confirmation gates remain stopped',async()=>{
 const f=fixture({owned:false}),before=f.env;f.now+=86400000;const s=f.make();await s.start();assert.equal(s.phase,'readonly');await s.catchUp();assert.deepEqual(f.env,before);
 s.session={owned:true};for(const phase of ['recovery-ready','room','room-recovered','rollback-ready']){s.phase=phase;await s.catchUp();assert.equal(s.phase,phase);assert.deepEqual(f.env,before)}assert.equal(f.starts,0);
});
test('clock rollback remains blocked rather than rewriting a future save',async()=>{
 const f=fixture(),before=f.env;f.now=-1000;const s=f.make();await s.start();assert.equal(s.phase,'blocked');assert.match(s.error.message,/本機時間/);assert.deepEqual(f.env,before);assert.equal(f.starts,0);
});
