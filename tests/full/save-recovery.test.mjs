import test,{beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {createGame,validate} from '../../dist/full/engine.mjs';
import {GameSession} from '../../dist/full/session.mjs';
import * as storage from '../../dist/full/storage.mjs';
const old=await import('../fixtures/stage2/full/engine.mjs');

// Controlled IndexedDB transaction model: writes are isolated until completion,
// and abort discards the entire transaction. Native browser coverage is separate.
const stores=new Map(['save','archives','journal','legacy','leases'].map(name=>[name,new Map()]));
const db={beforeWrite:null,transaction(names,mode){
 if(mode==='readwrite'&&this.beforeWrite){const hook=this.beforeWrite;this.beforeWrite=null;hook();}
 const selected=Array.isArray(names)?names:[names],working=new Map(selected.map(name=>[name,new Map([...stores.get(name)].map(([key,value])=>[key,structuredClone(value)]))]));
 let pending=0,ended=false,scheduled=false;
 const tx={error:null,abort(){if(ended)return;ended=true;queueMicrotask(()=>tx.onabort?.());},objectStore(name){const data=working.get(name);return{
  get(key){return request(()=>structuredClone(data.get(key)));},
  getAll(){return request(()=>structuredClone([...data.values()]));},
  put(value,key){return request(()=>{if(db.failPut===name){db.failPut=null;throw Error('synthetic transaction interruption');}data.set(key,structuredClone(value));return key;});},
  delete(key){return request(()=>data.delete(key));},
  openCursor(){const entries=[...data];let index=0;const result={};function next(){pending++;queueMicrotask(()=>{if(ended)return;const entry=entries[index++];result.result=entry?{key:entry[0],value:structuredClone(entry[1]),continue:next}:null;result.onsuccess?.();pending--;finish();});}next();return result;}
 };}};
 function finish(){if(pending||ended||scheduled)return;scheduled=true;queueMicrotask(()=>{scheduled=false;if(pending||ended)return;ended=true;if(mode==='readwrite')for(const[name,data]of working)stores.set(name,data);tx.oncomplete?.();});}
 function request(fn){pending++;const result={};queueMicrotask(()=>{if(ended)return;try{result.result=fn();result.onsuccess?.();}catch(error){tx.error=error;result.error=error;result.onerror?.();tx.abort();}pending--;finish();});return result;}
 finish();return tx;
}};
globalThis.indexedDB={open(){const request={};queueMicrotask(()=>{request.result=db;request.onsuccess?.();});return request;}};
Object.defineProperty(globalThis,'navigator',{value:{},configurable:true});
beforeEach(()=>{for(const map of stores.values())map.clear();db.beforeWrite=null;db.failPut=null;});
async function envelope(state=createGame(),revision=3,resolvedAt=1000){const stateJSON=JSON.stringify(state);return{schema:3,revision,resolvedAt,stateJSON,checksum:await storage.checksum(stateJSON),contentVersion:state.contentVersion};}
async function seed(){const backup=await envelope(),broken={...backup,revision:4,stateJSON:'{"broken":'};stores.get('save').set('current',broken);stores.get('save').set('last-known-good',backup);return{backup,broken};}
const persisted=()=>JSON.stringify([...stores].map(([name,map])=>[name,[...map]]));

test('corrupt startup remains stopped and exposes exact original plus validated candidates',async()=>{
 const {broken}=await seed();stores.get('archives').set('bad-archive',{...broken,revision:2});const adapter={...storage,preserveLegacy:async()=>[]},session=new GameSession({storage:adapter,now:()=>1000,workerFactory:()=>{throw Error('must not simulate');}});
 try{await session.start();assert.equal(session.phase,'blocked');assert.equal(session.state,null);assert.equal(session.recovery.candidates.length,2);assert(session.recovery.candidates.some(row=>row.valid&&row.name));assert(session.recovery.candidates.some(row=>!row.valid&&row.error));const before=persisted(),raw=await session.exportRawSave();assert.deepEqual(raw.envelope,broken);assert.equal(await session.export(),null);session.selectRecovery('last-known-good');assert.equal(session.pendingRecovery.name,'旅人');assert.equal(persisted(),before);assert.equal(session.phase,'blocked');}
 finally{await session.session?.release();}
});
test('confirmed recovery archives exact damaged original, preserves valid backup and advances revision once',async()=>{
 const {backup,broken}=await seed(),lease=await storage.acquireSession();try{const preview=await storage.inspectRecovery(),env=await storage.restoreRecovery('last-known-good',preview.currentFingerprint,preview.candidates.find(row=>row.key==='last-known-good').fingerprint);assert.equal(env.revision,5);assert.equal(env.resolvedAt,backup.resolvedAt);assert.equal(env.stateJSON,backup.stateJSON);assert.deepEqual(stores.get('archives').get('before-4'),broken);assert.deepEqual(stores.get('save').get('last-known-good'),backup);assert.equal(stores.get('journal').get(5).operation,'confirmed-recovery');const reopened=await storage.readSave();assert.deepEqual(reopened,env);const before=persisted();await assert.rejects(storage.restoreRecovery('last-known-good',preview.currentFingerprint,preview.candidates.find(row=>row.key==='last-known-good').fingerprint),/已變更/);assert.equal(persisted(),before);}
 finally{await lease.release();}
});
test('stale preview and same-revision concurrent replacement cannot overwrite the newer original',async()=>{
 await seed();const lease=await storage.acquireSession();try{const preview=await storage.inspectRecovery();db.beforeWrite=()=>{const current=stores.get('save').get('current');stores.get('save').set('current',{...current,stateJSON:'a different damaged original'});};await assert.rejects(storage.restoreRecovery('last-known-good',preview.currentFingerprint,preview.candidates.find(row=>row.key==='last-known-good').fingerprint),/已變更/);assert.equal(stores.get('save').get('current').stateJSON,'a different damaged original');assert.equal(stores.get('archives').size,0);}
 finally{await lease.release();}
});
test('lost writer lease and invalid candidate abort recovery without any save or archive mutation',async()=>{
 await seed();const lease=await storage.acquireSession();try{const preview=await storage.inspectRecovery();stores.get('leases').set('writer',{owner:'another-session',expiresAt:Date.now()+30000});const before=persisted();await assert.rejects(storage.restoreRecovery('last-known-good',preview.currentFingerprint,preview.candidates.find(row=>row.key==='last-known-good').fingerprint),/租約/);assert.equal(persisted(),before);stores.get('save').set('last-known-good',{...stores.get('save').get('last-known-good'),checksum:'invalid'});await assert.rejects(storage.restoreRecovery('last-known-good',preview.currentFingerprint,preview.candidates.find(row=>row.key==='last-known-good').fingerprint),/候選已變更/);const changed=await storage.inspectRecovery();await assert.rejects(storage.restoreRecovery('last-known-good',changed.currentFingerprint,changed.candidates.find(row=>row.key==='last-known-good').fingerprint),/校驗/);assert.equal(stores.get('archives').size,0);}
 finally{await lease.release();}
});
test('damaged revision remains exportable but cannot reset the revision sequence',async()=>{
 await seed();stores.get('save').get('current').revision='unknown';const preview=await storage.inspectRecovery();assert.equal((await storage.exportRawSave()).envelope.revision,'unknown');await assert.rejects(storage.restoreRecovery('last-known-good',preview.currentFingerprint,preview.candidates.find(row=>row.key==='last-known-good').fingerprint),/修訂損毀/);assert.equal(stores.get('archives').size,0);
});
test('recovery requires selection and confirmation, remains stopped, and migrates only on explicit resume',async()=>{
 const state=old.createGame('elf','Synthetic old',undefined,19),backup=await envelope(state);await seed();stores.get('save').set('last-known-good',backup);const session=new GameSession({storage:{...storage,preserveLegacy:async()=>[]},now:()=>1000,workerFactory:()=>{throw Error('must not run worker at equal time');}});
 try{await session.start();assert.equal(await session.confirmRecovery(),false);assert.equal(session.selectRecovery('missing'),null);session.selectRecovery('last-known-good');assert(await session.confirmRecovery());assert.equal(session.phase,'recovery-ready');assert.deepEqual(session.state,state);const before=persisted();await session.catchUp();await session.create('knight','should not replace');assert.equal(await session.confirmRecovery(),false);assert.equal(persisted(),before);assert(await session.resumeRecovery());assert.equal(session.phase,'ready');assert.equal(session.state.monsterRevision,1);assert(validate(session.state).ok);assert.equal(await session.resumeRecovery(),false);assert.equal((await storage.readSave()).state.rng,state.rng);}
 finally{await session.session?.release();}
});
test('candidate read failure preserves initial error and raw export still works',async()=>{
 const {broken}=await seed(),session=new GameSession({storage:{...storage,preserveLegacy:async()=>[],inspectRecovery:async()=>{throw Error('candidate read failed');}},now:()=>1000});try{await session.start();assert.match(session.error.message,/校驗/);assert.equal(session.recoveryError,'candidate read failed');assert.deepEqual((await session.exportRawSave()).envelope,broken);}finally{await session.session?.release();}
});
test('no original produces no misleading raw export',async()=>{assert.equal(await storage.exportRawSave(),null);const preview=await storage.inspectRecovery();assert.equal(preview.currentAvailable,false);assert.deepEqual(preview.candidates,[]);});

test('interruption while archiving aborts all recovery writes and preserves original and backup',async()=>{
 await seed();const lease=await storage.acquireSession();try{const preview=await storage.inspectRecovery(),before=persisted();db.failPut='archives';await assert.rejects(storage.restoreRecovery('last-known-good',preview.currentFingerprint,preview.candidates[0].fingerprint),/interruption/);assert.equal(persisted(),before);assert.equal(stores.get('archives').size,0);assert.equal(stores.get('journal').size,0);}finally{await lease.release();}
});

test('malformed archive records do not hide other valid candidates or overwrite a falsy original',async()=>{
 await seed();stores.get('archives').set('null-archive',null);stores.get('save').set('current',false);const preview=await storage.inspectRecovery();assert.equal(preview.currentAvailable,true);assert(preview.candidates.some(row=>row.key==='last-known-good'&&row.valid));assert(preview.candidates.some(row=>row.key==='archive:null-archive'&&!row.valid));assert.equal((await storage.exportRawSave()).envelope,false);await assert.rejects(storage.readSave(),/修訂或時間/);
});

test('recovery of a room checkpoint preserves its interruption marker until explicit solo continuation',async()=>{
 await seed();const marker={roomId:'family',memberId:'member-a',sequence:7};stores.get('save').get('last-known-good').room=marker;const session=new GameSession({storage:{...storage,preserveLegacy:async()=>[]},now:()=>40000,workerFactory:()=>{throw Error('room time must not simulate');}});try{await session.start();session.selectRecovery('last-known-good');assert(await session.confirmRecovery());assert.equal(session.phase,'room-recovered');assert.deepEqual((await storage.readSave()).room,marker);assert.equal((await session.export()).room.sequence,7);await session.catchUp();assert.equal(session.state.elapsedMs,'0');assert(await session.resumeRoomRecovery());assert.equal(session.phase,'ready');assert.equal((await storage.readSave()).room,undefined);assert.equal(session.resolvedAt,40000);assert.equal(session.state.elapsedMs,'0');}finally{await session.session?.release();}
});
