import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,validate,command,advance} from '../../dist/full/engine.mjs';
import {grantGear,weight} from '../../dist/full/rules.mjs';
import {emptyTradeOffer,prepareTrade,decideTrade,settleTrade,acknowledgeTrade,validateTradeState} from '../../dist/full/trade.mjs';
import {createRoom} from '../../dist/full/coop-engine.mjs';
import {compactRoomState,restoreRoomState} from '../../dist/full/room-transfer.mjs';
const clone=value=>JSON.parse(JSON.stringify(value));
function pair(){const a=createGame('knight','房主',undefined,1),b=createGame('mage','家人',undefined,2);a.player.gold=1000;b.player.gold=500;Object.assign(b.player,{map:a.player.map,x:a.player.x+1,y:a.player.y});return[a,b];}
function offers(){return[{...emptyTradeOffer(),gold:100,stacks:{'ITEM-RED-POTION':2}},{...emptyTradeOffer(),gold:25,stacks:{'ITEM-BLUE-POTION':1}}];}
function checked(...states){for(const s of states)assert(validate(s).ok,validate(s).errors.join(','));}
test('preparing locks the offers without RNG, reserves capacity, and persists both sides of the exchange',()=>{
 const [a,b]=pair(),[x,y]=offers(),rng=a.rng,aw=weight(a).total;const r=prepareTrade(a,a,b,x,y);assert(r.ok,r.error);assert.equal(a.rng,rng);
 assert.equal(a.player.gold,900);assert.equal(b.player.gold,475);assert.equal(a.inventory.stacks['ITEM-RED-POTION'],98);assert.equal(a.tradeEscrow.outgoing.gold,100);assert.equal(weight(a).total,aw);checked(a,b);
 const before=clone(a);assert(!command(a,{type:'drop',itemId:'ITEM-RED-POTION',count:99}).ok);assert.deepEqual(clone(a),before);
});
test('commit survives a device interruption between participants and each transfer occurs once',()=>{
 let [a,b]=pair();const [x,y]=offers(),r=prepareTrade(a,a,b,x,y);assert(r.ok);a=clone(a);b=clone(b);
 assert(decideTrade(a,r.transactionId,'commit').ok);assert(settleTrade(a,a,r.transactionId).ok);assert.equal(a.player.gold,925);assert.equal(b.player.gold,475);checked(a,b);
 const hostDisk=clone(a),guestDisk=clone(b);assert(settleTrade(guestDisk,hostDisk,r.transactionId).ok);assert.equal(guestDisk.player.gold,575);assert.equal(guestDisk.inventory.stacks['ITEM-RED-POTION'],102);checked(hostDisk,guestDisk);
 const result=clone(guestDisk);assert(settleTrade(guestDisk,hostDisk,r.transactionId).duplicate);assert.deepEqual(guestDisk,result);
 assert(acknowledgeTrade(hostDisk,r.transactionId,hostDisk.id));assert(acknowledgeTrade(hostDisk,r.transactionId,guestDisk.id));assert(hostDisk.tradeCoordinator.transactions[0].parties.every(p=>p.done&&!p.escrow));checked(hostDisk);
});
test('abort after an incomplete prepare returns the exact reserved quantities and cannot overwrite a commit decision',()=>{
 const [a,b]=pair(),[x,y]=offers(),r=prepareTrade(a,a,b,x,y);assert(decideTrade(a,r.transactionId,'abort').ok);
 assert(settleTrade(a,a,r.transactionId).ok);assert(settleTrade(b,a,r.transactionId).ok);assert.equal(a.player.gold,1000);assert.equal(b.player.gold,500);assert.equal(a.inventory.stacks['ITEM-RED-POTION'],100);assert.equal(b.inventory.stacks['ITEM-BLUE-POTION'],10);
 assert(!decideTrade(a,r.transactionId,'commit').ok);checked(a,b);
});
test('unconfirmed invalid offers, distance, equipped/locked gear and a full recipient never remove anything',()=>{
 for(const alter of [(a,b,x)=>{b.player.x+=5},(a,b,x)=>{x.gold=1001},(a,b,x)=>{x.stacks['ITEM-RED-POTION']=101},(a,b,x)=>{x.equipment=[a.equipped.weapon]},(a,b,x)=>{x.stacks['ITEM-PET-COLLAR']=1},(a,b,x)=>{x.gold=-1},(a,b,x)=>{const e=grantGear(a,'EQ-DAGGER');x.equipment=[e.uid];a.fusion.pending={uids:[e.uid]};},(a,b,x)=>{b.inventory.stacks['ITEM-RED-POTION']=10000}]){
  const [a,b]=pair(),[x,y]=offers();alter(a,b,x);const before=clone([a,b]);assert(!prepareTrade(a,a,b,x,y).ok);assert.deepEqual(clone([a,b]),before);
 }
});
test('independent local UID collisions preserve item provenance and all enchantment values',()=>{
 const [a,b]=pair(),e=grantGear(a,'EQ-DAGGER'),other=grantGear(b,'EQ-DAGGER');assert.equal(e.uid,other.uid);e.enchantment={version:1,element:{kind:'fire',count:'10'}};
 const r=prepareTrade(a,a,b,{...emptyTradeOffer(),equipment:[e.uid]},emptyTradeOffer());assert(r.ok);decideTrade(a,r.transactionId,'commit');settleTrade(a,a,r.transactionId);settleTrade(b,a,r.transactionId);
 const received=b.inventory.equipment.find(item=>item.tradeOrigin);assert(received);assert.notEqual(received.uid,e.uid);assert.equal(received.tradeOrigin.identities.uid,e.uid);assert.equal(received.tradeOrigin.characterId,a.id);assert.deepEqual(received.enchantment,e.enchantment);checked(a,b);
});
test('a traded item never collides with ground gear retained only in the receiving phone solo world',()=>{
 const [a,b]=pair(),gift=grantGear(a,'EQ-DAGGER'),dropped=grantGear(b,'EQ-DAGGER');assert.equal(gift.uid,dropped.uid);assert(command(b,{type:'drop',uid:dropped.uid}).ok);const original=clone(b);
 const room=createRoom(909);assert(room.addMember('host',a).ok);assert(room.addMember('guest',restoreRoomState(compactRoomState(b))).ok);
 assert(room.command('host',{type:'inviteTrade',targetMemberId:'guest'}).ok);let offer=room.view('host').pendingTrade.open;
 assert(room.command('host',{type:'offerTrade',tradeId:offer.id,revision:offer.revision,offer:{...emptyTradeOffer(),equipment:[gift.uid]}}).ok);offer=room.view('host').pendingTrade.open;
 assert(room.command('host',{type:'confirmTrade',tradeId:offer.id,revision:offer.revision}).ok);const prepared=room.command('guest',{type:'confirmTrade',tradeId:offer.id,revision:offer.revision});assert(prepared.tradePrepared);
 assert(room.tradeDecision(prepared.transactionId,'commit').ok);assert(room.tradeSettle(prepared.transactionId,'host').ok);assert(room.tradeSettle(prepared.transactionId,'guest').ok);
 const restored=restoreRoomState(compactRoomState(room.exportMember('guest')),original),received=restored.inventory.equipment.find(e=>e.tradeOrigin?.identities.uid===gift.uid);
 assert(received);assert.notEqual(received.uid,dropped.uid);assert.deepEqual(restored.worlds,original.worlds);checked(restored);const nextGear=grantGear(restored,'EQ-DAGGER');assert.notEqual(nextGear.uid,received.uid);checked(restored);
});
test('locked offers survive offline/split advancement and cannot be settled by a different coordinator',()=>{
 const [a,b]=pair(),[x,y]=offers(),r=prepareTrade(a,a,b,x,y),single=clone(b),split=clone(b);advance(single,8,{offline:true});advance(split,3,{offline:true});advance(split,5,{offline:true});assert.deepEqual(clone(single),clone(split));assert.deepEqual(single.tradeEscrow,b.tradeEscrow);
 const other=createGame('knight','另一房主',undefined,3);assert(!settleTrade(single,other,r.transactionId).ok);checked(single);
});
test('tampered escrow, receipts and coordinator decisions are rejected',()=>{
 const [a,b]=pair(),[x,y]=offers();prepareTrade(a,a,b,x,y);
 for(const change of [s=>{s.tradeEscrow.characterId='foreign'},s=>{s.tradeEscrow.incoming.gold=-1},s=>{s.tradeEscrow.outgoing.stacks['ITEM-RED-POTION']=0},s=>{s.tradeCoordinator.transactions[0].decision='maybe'},s=>{s.tradeCoordinator.next='99'}]){const bad=clone(a);change(bad);assert(!validateTradeState(bad).ok);assert(!validate(bad).ok);}
 const bad=clone(b);bad.tradeEscrow.incoming.gold++;decideTrade(a,a.tradeEscrow.id,'commit');const before=clone(bad);assert(!settleTrade(bad,a,a.tradeEscrow.id).ok);assert.deepEqual(bad,before);
});
