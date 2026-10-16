import test,{beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {createGame,validate} from '../../dist/full/engine.mjs';
import * as storage from '../../dist/full/storage.mjs';
import {fromSolo,validateRoster,selectedView} from '../../dist/full/roster.mjs';

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

function syntheticRoster(seed=17){return fromSolo(createGame('knight','Synthetic roster',undefined,seed));}
test('v4 export preserves one complete validated roster and v3 remains readable',async()=>{
 const roster=syntheticRoster(),before=JSON.stringify(roster),out=await storage.exportRoster(roster,1000);
 assert.equal(out.format,'ashen-covenant-v4');assert.equal(Object.hasOwn(out,'stateJSON'),false);assert.equal(out.rosterJSON,before);assert.equal(JSON.stringify(roster),before);
 const imported=await storage.parseImport(JSON.stringify(out));assert.deepEqual(imported.roster,roster);assert.deepEqual(imported.state,selectedView(roster));
 const state=createGame(),old=await storage.exportEnvelope(state,1000);assert.equal(old.format,'ashen-covenant-v3');assert.deepEqual((await storage.parseImport(JSON.stringify(old))).state,JSON.parse(JSON.stringify(state)));
});
test('v4 validation rejects corrupted checksum, future schema, mixed payloads and malformed roster',async()=>{
 const roster=syntheticRoster(),out=await storage.exportRoster(roster,1000),env={...out,schema:4,revision:1};delete env.format;
 assert(validateRoster((await storage.decodeEnvelope(env)).roster).ok);
 await assert.rejects(storage.decodeEnvelope({...env,rosterJSON:env.rosterJSON+' '}),/校驗/);
 await assert.rejects(storage.decodeEnvelope({...env,schema:5}),/版本/);
 await assert.rejects(storage.decodeEnvelope({...env,stateJSON:JSON.stringify(createGame())}),/衝突/);
 for(const mutate of [r=>r.version=999,r=>r.selectedId='missing',r=>delete r.simulation.worlds,r=>r.simulation.rng=NaN]){
  const bad=structuredClone(roster);mutate(bad);const raw=JSON.stringify(bad);await assert.rejects(storage.decodeEnvelope({...env,rosterJSON:raw,checksum:await storage.checksum(raw)}));
 }
 await assert.rejects(storage.parseImport(JSON.stringify({...out,format:'ashen-covenant-v3'})),/版本/);
});
test('v3 to v4 writes use the same lease, compare-and-swap revision and atomic archive',async()=>{
 const lease=await storage.acquireSession();try{
  const solo=createGame('elf','First character',undefined,30),initial=await storage.writeSave(solo,0,1000),roster=fromSolo(initial.state),next=await storage.writeRoster(roster,1,1000,{archive:true,operation:'roster-upgrade'});
  assert.equal(next.revision,2);assert.equal(next.schema,4);assert.deepEqual(next.roster,roster);assert.deepEqual(next.state,selectedView(roster));
  assert.deepEqual(stores.get('archives').get('before-1'),stores.get('save').get('last-known-good'));assert.equal(stores.get('archives').get('before-1').stateJSON,initial.stateJSON);
  assert.equal(stores.get('save').size,2);assert.equal(stores.get('leases').size,1);assert.equal(stores.get('journal').get(2).operation,'roster-upgrade');
  assert.deepEqual((await storage.readSave()).roster,roster);const before=JSON.stringify([...stores].map(([name,map])=>[name,[...map]]));
  await assert.rejects(storage.writeRoster(roster,1,1000),/另一分頁/);assert.equal(JSON.stringify([...stores].map(([name,map])=>[name,[...map]])),before);
  db.failPut='archives';await assert.rejects(storage.writeRoster(roster,2,1000,{archive:true}),/interruption/);assert.equal(JSON.stringify([...stores].map(([name,map])=>[name,[...map]])),before);
  stores.get('leases').set('writer',{owner:'other-writer',expiresAt:Date.now()+30000});await assert.rejects(storage.writeRoster(roster,2,1000),/租約/);assert.equal((await storage.readSave()).revision,2);
 }finally{await lease.release();}
});
test('roster recovery keeps the whole candidate and exact damaged original until explicit confirmation',async()=>{
 const lease=await storage.acquireSession();try{
  const roster=syntheticRoster(32),saved=await storage.writeRoster(roster,0,1000,{room:{roomId:'family',memberId:'owner',sequence:3}});
  await storage.writeRoster(roster,1,2000);const broken={...stores.get('save').get('current'),rosterJSON:'invalid-json'};stores.get('save').set('current',broken);
  const preview=await storage.inspectRecovery(),candidate=preview.candidates.find(row=>row.key==='last-known-good');assert(candidate.valid);assert.deepEqual((await storage.exportRawSave()).envelope,broken);
  const restored=await storage.restoreRecovery(candidate.key,preview.currentFingerprint,candidate.fingerprint);
  assert.equal(restored.revision,3);assert.deepEqual(restored.roster,roster);assert.equal(restored.room.sequence,3);assert.deepEqual(stores.get('archives').get('before-2'),broken);assert.equal(stores.get('save').get('last-known-good').rosterJSON,saved.rosterJSON);
 }finally{await lease.release();}
});
