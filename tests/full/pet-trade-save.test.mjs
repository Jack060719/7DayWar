import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,validate} from '../../dist/full/engine.mjs';
import {uid,grantGear} from '../../dist/full/rules.mjs';
import {createWildTraits,petStatsV4,stagePetBreed} from '../../dist/full/pets-v4.mjs';
import {emptyTradeOffer,prepareTrade,decideTrade,settleTrade} from '../../dist/full/trade.mjs';
import {fromSolo,selectedView} from '../../dist/full/roster.mjs';
import {exportRoster,parseImport} from '../../dist/full/storage.mjs';
import {hasUnresolvedTrades,preservesUnresolvedTrades} from '../../dist/full/trade-save-guard.mjs';
function pet(s){const id=uid(s,'pet'),p={id,sourceId:'wild:'+id,collarUid:uid(s,'collar'),collarInBag:true,type:'PET-WOLF',name:'Synthetic',level:45,x:s.player.x,y:s.player.y,map:s.player.map,hp:1,mp:0,food:88,foodAt:60000,mpRegenAt:8000,magicAt:0,v4At:0,xp:'21',active:false,dead:false,aptitudes:{hp:100,attack:100,defense:100,speed:100},effects:[],attackAt:0,moveAt:0,path:[],mode:'defend',v4:createWildTraits(s,'PET-WOLF',s.id+':'+id)};const st=petStatsV4(p);p.hp=st.maxHp;p.mp=st.maxMp;s.pets.push(p);return p}
function pair(){const a=createGame('knight','Sender',undefined,301),b=createGame('mage','Recipient',undefined,302);Object.assign(b.player,{map:a.player.map,x:a.player.x+1,y:a.player.y});return[a,b]}
const checked=s=>assert(validate(s).ok,validate(s).errors.join(','));
test('traded v4 pets keep genes, ancestry and bag effects through collision rebasing and full-ledger export',async()=>{
 const[a,b]=pair(),p=pet(a),other=pet(b);other.id=p.id;other.collarUid=p.collarUid;p.v4.shiny=true;p.v4.loyalty=400;p.v4.breedingUsed=1;p.v4.lineage.parents=[{id:'parent-a',natures:[structuredClone(p.v4.nature)]},{id:'parent-b',natures:[structuredClone(p.v4.nature)]}];p.v4.ancestorNature=structuredClone(p.v4.nature);
 const gear=grantGear(a,'EQ-DAGGER');gear.enchantment={version:1,element:{kind:'water',count:'4'}};a.inventory.equipment=a.inventory.equipment.filter(row=>row!==gear);p.v4.bag.equipment.push(gear);const collision=grantGear(b,'EQ-DAGGER');collision.uid=gear.uid;const original=structuredClone(p.v4),r=prepareTrade(a,a,b,{...emptyTradeOffer(),petIds:[p.id]},emptyTradeOffer());assert(r.ok,r.error);assert.equal(a.pets.length,0);checked(a);checked(b);const locked=selectedView(fromSolo(b));assert.deepEqual(locked.tradeEscrow.incoming.pets[0].v4.lineage,original.lineage);assert(decideTrade(a,r.transactionId,'commit').ok);assert(settleTrade(a,a,r.transactionId).ok);assert(settleTrade(b,a,r.transactionId).ok);const received=b.pets.find(row=>row.v4.lineage.id===original.lineage.id);assert(received);assert.notEqual(received.id,p.id);assert.notEqual(received.collarUid,p.collarUid);assert.notEqual(received.v4.bag.equipment[0].uid,gear.uid);assert.deepEqual(received.v4.bag.equipment[0].enchantment,gear.enchantment);
 for(const key of['birth','sex','shiny','nature','ancestorNature','lineage','breedingUsed','loyalty'])assert.deepEqual(received.v4[key],original[key],key);checked(b);const exported=await exportRoster(fromSolo(b),1000),parsed=await parseImport(JSON.stringify(exported));assert.deepEqual(parsed.state.pets,b.pets);assert(settleTrade(b,a,r.transactionId).duplicate);
});
test('a pending child reserves identities before another pet is received',()=>{
 const[a,b]=pair(),parentA=pet(b),parentB=pet(b);parentA.v4.sex='male';parentB.v4.sex='female';assert(stagePetBreed(b,{firstId:parentA.id,secondId:parentB.id}).ok);const pending=b.petBreeding.pending.child,p=pet(a);p.id=pending.id;p.collarUid=pending.collarUid;const r=prepareTrade(a,a,b,{...emptyTradeOffer(),petIds:[p.id]},emptyTradeOffer());assert(r.ok,r.error);const incoming=b.tradeEscrow.incoming.pets[0];assert.notEqual(incoming.id,pending.id);assert.notEqual(incoming.collarUid,pending.collarUid);checked(b);
});
test('a coordinator with unsettled participants remains protected after its own escrow is settled',()=>{
 const[a,b]=pair(),r=prepareTrade(a,a,b,{...emptyTradeOffer(),gold:1},emptyTradeOffer());assert(r.ok);decideTrade(a,r.transactionId,'commit');settleTrade(a,a,r.transactionId);assert.equal(a.tradeEscrow,undefined);assert(hasUnresolvedTrades({state:a}));assert(!preservesUnresolvedTrades({state:createGame('knight','Old',undefined,301)},{state:a}));const roster=fromSolo(a);assert(hasUnresolvedTrades({roster}));assert(preservesUnresolvedTrades({roster}, {state:a}));
});
