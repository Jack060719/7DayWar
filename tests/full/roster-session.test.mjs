import test,{beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {createGame,validate} from '../../dist/full/engine.mjs';
import * as storage from '../../dist/full/storage.mjs';
import {fromSolo,validateRoster,selectedView,memberViews,advance as advanceRoster} from '../../dist/full/roster.mjs';

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

import {GameSession} from '../../dist/full/session.mjs';
import {RoomSaveSession} from '../../dist/full/room-session.mjs';

const sessionAdapter={...storage,preserveLegacy:async()=>[]};
const noWorker=()=>{throw Error('unexpected offline calculation');};
async function createSession(now=()=>1000,workerFactory=noWorker){const session=new GameSession({storage:sessionAdapter,now,workerFactory});await session.start();return session;}
test('old solo becomes archived first member; four characters share one save and selection is durable',async()=>{
 const lease=await storage.acquireSession(),solo=createGame('knight','Original',undefined,74);await storage.writeSave(solo,0,1000);await lease.release();
 const session=await createSession();try{
  assert.equal(session.phase,'ready');assert.equal(session.roster.version,1);assert.deepEqual(session.state,JSON.parse(JSON.stringify(solo)));assert.equal(session.listCharacters().length,1);assert.equal(stores.get('archives').get('before-1').stateJSON,JSON.stringify(solo));
  for(const [index,classId] of ['elf','mage','darkelf'].entries()){const result=await session.create(classId,'Member '+index,undefined,75+index);assert(result.ok,result.error);}
  const four=structuredClone(session.roster),raw=JSON.stringify(stores.get('save').get('current'));assert.equal(session.listCharacters().length,4);assert.equal((await session.create('knight','Fifth')).ok,false);assert.deepEqual(session.roster,four);assert.equal(JSON.stringify(stores.get('save').get('current')),raw);
  assert((await session.selectCharacter('member-1')).ok);assert.equal(session.state.id,solo.id);assert.equal((await storage.readSave()).roster.selectedId,'member-1');assert.equal(session.localView.players.length,3);
  assert((await session.configureParty({enabled:true,leaderId:'member-1',follow:true})).ok);assert.equal((await storage.readSave()).roster.party.follow,true);
 }finally{await session.session?.release();}
});
test('one offline worker advances and persists the whole roster exactly once',async()=>{
 let now=1000,starts=0;
 const workerFactory=()=>({terminate(){},postMessage(message){if(message.type!=='simulate')return;starts++;assert(message.roster);assert.equal(message.state,undefined);const roster=structuredClone(message.roster);advanceRoster(roster,message.seconds,{offline:message.offline});queueMicrotask(()=>this.onmessage({data:{type:'done',roster,processed:message.seconds,total:message.seconds}}));}});
 const session=await createSession(()=>now,workerFactory);try{
  assert((await session.create('knight','One',undefined,84)).ok);assert((await session.create('elf','Two',undefined,85)).ok);const expected=structuredClone(session.roster);advanceRoster(expected,20,{offline:true});now=21000;
  await session.catchUp();assert.equal(session.phase,'ready');assert.equal(starts,1);assert.deepEqual(session.roster,expected);assert.deepEqual((await storage.readSave()).roster,expected);assert.equal(session.resolvedAt,now);
  await session.catchUp();assert.equal(starts,1);assert.deepEqual(session.roster,expected);
 }finally{await session.session?.release();}
});
test('failed roster action save rolls back the complete live ledger and preserves durable progress',async()=>{
 const session=await createSession();try{
  await session.create('knight','One',undefined,94);await session.create('mage','Two',undefined,95);const before=structuredClone(session.roster),raw=structuredClone(stores.get('save').get('current'));db.failPut='save';const result=await session.act({type:'toggleAuto',enabled:true});assert.equal(result.ok,false);assert.equal(session.phase,'blocked');assert.deepEqual(session.roster,before);assert.deepEqual(stores.get('save').get('current'),raw);
 }finally{await session.session?.release();}
});
test('family checkpoint only changes selected personal progress; other characters pause through interrupted recovery',async()=>{
 let now=1000;const session=await createSession(()=>now);await session.create('knight','One',undefined,104);await session.create('mage','Two',undefined,105);const room=new RoomSaveSession(session);
 try{
  const before=structuredClone(session.roster),others=memberViews(before).filter(row=>row.id!==before.selectedId),entry=await room.enter('family','remote-member');now=31000;
  assert.equal((await session.selectCharacter('member-1')).ok,false);assert.equal((await session.create('elf','Rejected')).ok,false);assert.equal((await session.configureParty({enabled:true,leaderId:'member-1',follow:true})).ok,false);
  assert.deepEqual(session.tick(30),[]);const checkpoint=structuredClone(entry.state);checkpoint.player.gold+=15;assert.equal((await room.applyCheckpoint({roomId:'family',memberId:'remote-member',sequence:1,state:checkpoint})).accepted,true);
  const saved=await storage.readSave();assert.equal(saved.state.player.gold,entry.state.player.gold+15);assert.equal(saved.roster.simulation.clockMs,before.simulation.clockMs);assert.deepEqual(memberViews(saved.roster).filter(row=>row.id!==before.selectedId),others);
  await session.session.release();const reopened=await createSession(()=>now);try{assert.equal(reopened.phase,'room-recovered');const retained=structuredClone(reopened.roster);assert(await reopened.resumeRoomRecovery());assert.equal(reopened.phase,'ready');assert.deepEqual(reopened.roster,retained);assert.equal((await storage.readSave()).room,undefined);assert.equal(reopened.resolvedAt,now);}finally{await reopened.session.release();}
 }finally{if(session.phase!=='room')await session.session?.release();}
});
test('v4 import preview is read-only and confirmation atomically replaces and archives the entire roster',async()=>{
 const session=await createSession();try{
  await session.create('knight','First',undefined,114);await session.create('elf','Second',undefined,115);const original=structuredClone(session.roster),backup=await session.export();assert.equal(backup.format,'ashen-covenant-v4');assert.equal((await storage.parseImport(JSON.stringify(backup))).roster.simulation.members.length,2);
  const incoming=fromSolo(createGame('mage','Imported',undefined,116)),encoded=JSON.stringify(await storage.exportRoster(incoming,1000)),before=JSON.stringify(stores.get('save').get('current'));
  await session.selectImport({size:encoded.length,text:async()=>encoded});assert.deepEqual(session.roster,original);assert.equal(JSON.stringify(stores.get('save').get('current')),before);session.cancelImport();assert.equal(await session.confirmImport(),false);
  await session.selectImport({size:encoded.length,text:async()=>encoded});const revision=session.revision;assert(await session.confirmImport());assert.deepEqual(session.roster,incoming);assert.equal(stores.get('archives').get('before-'+revision).rosterJSON,JSON.stringify(original));assert.equal(session.listCharacters().length,1);
 }finally{await session.session?.release();}
});

import {mapNPCs} from '../../dist/full/data.mjs';
import {command as soloCommand} from '../../dist/full/engine.mjs';
import {createWildTraits,petStatsV4} from '../../dist/full/pets-v4.mjs';
import {uid} from '../../dist/full/rules.mjs';
import {createMember as addRosterMember} from '../../dist/full/roster.mjs';
function breedingState(seed=144){
 const state=createGame('knight','Reserved breeding',undefined,seed),npc=mapNPCs(state.player.map).find(n=>n.service==='paid_player_recovery_and_pet_collar_recall');[state.player.x,state.player.y]=npc.position_tiles;
 for(const sex of ['male','female']){const id=uid(state,'pet'),pet={id,sourceId:'synthetic-wild:'+id,collarUid:uid(state,'collar'),collarInBag:true,type:'PET-WOLF',name:'Synthetic parent',level:45,x:state.player.x,y:state.player.y,map:state.player.map,hp:1,mp:0,food:100,foodAt:60000,mpRegenAt:8000,magicAt:0,v4At:0,xp:'0',active:false,dead:false,aptitudes:{hp:100,attack:100,defense:100,speed:100},effects:[],attackAt:0,moveAt:0,path:[],mode:'defend',v4:createWildTraits(state,'PET-WOLF',state.id+':'+id)};pet.v4.sex=sex;pet.hp=petStatsV4(pet).maxHp;state.pets.push(pet);}
 assert(validate(state).ok,validate(state).errors.join());return state;
}
test('saved breeding reservation in a nonselected character resumes once across the entire roster',async()=>{
 const state=breedingState(),result=soloCommand(state,{type:'petBreedStage',firstId:state.pets[0].id,secondId:state.pets[1].id});assert(result.ok,result.error);const child=structuredClone(state.petBreeding.pending.child),roster=fromSolo(state);assert(addRosterMember(roster,{classId:'elf',name:'Selected other',seed:145}).ok);roster.selectedId='member-2';
 const lease=await storage.acquireSession();await storage.writeRoster(roster,0,1000);await lease.release();const session=await createSession();
 try{assert.equal(session.phase,'ready',session.error?.message);assert.equal(session.roster.selectedId,'member-2');const first=memberViews(session.roster).find(row=>row.id==='member-1').state;assert.equal(first.petBreeding.pending,null);assert.equal(first.petBreeding.receipts.length,1);assert.deepEqual(first.pets.at(-1),child);assert.equal(first.pets[0].v4.breedingUsed,1);const before=structuredClone(session.roster);await session.recoverPetBreeding();assert.deepEqual(session.roster,before);}finally{await session.session.release();}
});
test('failed reserved breeding recovery leaves durable outcome locked for the next successful reopen',async()=>{
 const state=breedingState(154),result=soloCommand(state,{type:'petBreedStage',firstId:state.pets[0].id,secondId:state.pets[1].id});assert(result.ok,result.error);const roster=fromSolo(state),lease=await storage.acquireSession();await storage.writeRoster(roster,0,1000);await lease.release();const raw=structuredClone(stores.get('save').get('current'));db.failPut='save';const failed=await createSession();try{assert.equal(failed.phase,'blocked');assert.deepEqual(stores.get('save').get('current'),raw);}finally{await failed.session.release();}
 const recovered=await createSession();try{assert.equal(recovered.phase,'ready',recovered.error?.message);assert.equal(recovered.state.petBreeding.pending,null);assert.equal(recovered.state.petBreeding.receipts.length,1);assert.equal(recovered.state.rng,state.rng);assert.deepEqual(recovered.state.pets.at(-1).v4,state.petBreeding.pending.child.v4);}finally{await recovered.session.release();}
});

import {emptyTradeOffer,prepareTrade,decideTrade,settleTrade} from '../../dist/full/trade.mjs';
import {createRoom} from '../../dist/full/coop-engine.mjs';
test('unresolved trades remain locked through selection, family return and export and block old imports',async()=>{
 const session=await createSession();try{
  await session.create('knight','Locked member',undefined,161);const before=structuredClone(session.state),host=createGame('mage','Original coordinator',undefined,162),locked=structuredClone(session.state);Object.assign(host.player,{map:locked.player.map,x:locked.player.x+1,y:locked.player.y});const prepared=prepareTrade(host,host,locked,emptyTradeOffer(),{...emptyTradeOffer(),stacks:{'ITEM-RED-POTION':2}});assert(prepared.ok,prepared.error);await session.save(locked);const escrow=structuredClone(session.state.tradeEscrow);
  await session.create('elf','Free member',undefined,163);assert.equal(session.state.tradeEscrow,undefined);assert.equal(session.listCharacters().length,2);
  session.pendingImport={state:before,resolvedAt:1000};const raw=JSON.stringify(stores.get('save').get('current'));await assert.rejects(()=>session.confirmImport(),/交易/);await assert.rejects(()=>session.restoreBeforeSilver(),/交易/);await assert.rejects(()=>session.restoreBeforeUpgrade(),/交易/);assert.equal(JSON.stringify(stores.get('save').get('current')),raw);assert.equal(session.phase,'ready');
  const parsed=await storage.parseImport(JSON.stringify(await session.export()));assert.deepEqual(memberViews(parsed.roster).find(row=>row.state.id===before.id).state.tradeEscrow,escrow);
  await session.selectCharacter('member-1');const saver=new RoomSaveSession(session),entry=await saver.enter('lock-check','family-member'),room=createRoom(164);assert(room.addMember('family-member',entry.state).ok);assert.deepEqual(room.exportMember('family-member').tradeEscrow,escrow);await saver.applyCheckpoint({roomId:'lock-check',memberId:'family-member',sequence:1,state:room.exportMember('family-member')});await saver.finish();assert.deepEqual(session.state.tradeEscrow,escrow);assert.equal(session.state.inventory.stacks['ITEM-RED-POTION'],98);
  const settled=structuredClone(session.state);assert(decideTrade(host,prepared.transactionId,'abort').ok);assert(settleTrade(settled,host,prepared.transactionId).ok);await session.save(settled);assert.equal(session.state.inventory.stacks['ITEM-RED-POTION'],100);assert.equal(session.state.tradeEscrow,undefined);
 }finally{await session.session?.release()}
});
test('corrupt-save recovery cannot roll back the newest validated unresolved escrow',async()=>{
 const session=await createSession();try{
  await session.create('knight','Recover locked',undefined,171);const old=structuredClone(stores.get('save').get('current')),host=createGame('mage','Original host',undefined,172),locked=structuredClone(session.state);Object.assign(host.player,{map:locked.player.map,x:locked.player.x+1,y:locked.player.y});assert(prepareTrade(host,host,locked,emptyTradeOffer(),{...emptyTradeOffer(),stacks:{'ITEM-RED-POTION':2}}).ok);await session.save(locked);const safe=structuredClone(stores.get('save').get('current'));await session.save();stores.get('save').get('current').checksum='damaged';stores.get('archives').set('synthetic-old',old);const raw=JSON.stringify(stores.get('save').get('current')),inspection=await storage.inspectRecovery(),older=inspection.candidates.find(row=>row.revision===old.revision&&row.valid),newest=inspection.candidates.find(row=>row.revision===safe.revision&&row.valid);assert(older);assert(newest);
  await assert.rejects(()=>storage.restoreRecovery(older.key,inspection.currentFingerprint,older.fingerprint),/交易/);assert.equal(JSON.stringify(stores.get('save').get('current')),raw);const result=await storage.restoreRecovery(newest.key,inspection.currentFingerprint,newest.fingerprint);assert.deepEqual(result.state.tradeEscrow,locked.tradeEscrow);assert.equal(result.state.inventory.stacks['ITEM-RED-POTION'],98);
 }finally{await session.session?.release()}
});
