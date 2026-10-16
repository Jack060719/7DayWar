import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,validate} from '../../dist/full/engine.mjs';
import {GameSession} from '../../dist/full/session.mjs';
import {RoomController} from '../../dist/full/room-controller.mjs';
import {emptyTradeOffer} from '../../dist/full/trade.mjs';
import {createWildTraits} from '../../dist/full/pets-v4.mjs';
import {uid} from '../../dist/full/rules.mjs';

const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(predicate){for(let i=0;i<300;i++){if(predicate())return;await delay(10);}throw Error('condition timed out');}
function network(){
 const nodes=new Map,packets=[];let next=0;
 return{nodes,packets,factory:options=>({
  hostId:'host',peers:[],closed:false,
  async host(){Object.assign(this,{id:'host',isHost:true,code:'FAMILY'});this.options=options;nodes.set(this.id,this);return this;},
  async join(){Object.assign(this,{id:'guest'+(++next),isHost:false,code:'FAMILY'});this.options=options;nodes.set(this.id,this);const host=nodes.get('host');host.peers.push(this.id);this.peers.push('host');queueMicrotask(()=>{host.options.onPeer({id:this.id,state:'open'});options.onPeer({id:'host',state:'open'});});return this;},
  to(id,message){if(this.closed)return false;const copy=structuredClone(message);packets.push({from:this.id,to:id,message:copy});queueMicrotask(()=>nodes.get(id)?.options.onMessage(copy,this.id));return nodes.has(id);},
  async disconnect(id,reason){const peer=nodes.get(id);if(peer)await peer.close(reason);},
  async close(reason){if(this.closed)return;this.closed=true;nodes.delete(this.id);for(const id of this.peers){const peer=nodes.get(id);if(!peer)continue;peer.peers=peer.peers.filter(value=>value!==this.id);peer.options.onPeer({id:this.id,state:'close'});if(this.isHost)peer.options.onClose(reason);}options.onClose(reason);}
 })};
}
async function player(net,name,prepare=()=>{}){
 let envelope={state:createGame('knight',name,undefined,23),revision:1,resolvedAt:1000},failure=null,blockedWrite=null;
 envelope.state.player.hp=1;prepare(envelope.state);const writes=[];
 const storage={acquireSession:async()=>({owned:true}),preserveLegacy:async()=>[],readSave:async()=>structuredClone(envelope),
  async writeSave(state,revision,resolvedAt,options){if(blockedWrite?.operation===options.operation){const hold=blockedWrite;blockedWrite=null;await hold.promise;}if(failure&&options.operation==='room-checkpoint')throw failure;assert.equal(revision,envelope.revision);assert(validate(state).ok,validate(state).errors.join());writes.push(options.operation);envelope={state:structuredClone(state),revision:revision+1,resolvedAt,...(options.room?{room:options.room}:{})};return structuredClone(envelope);}};
 const session=new GameSession({storage,now:()=>1000,workerFactory:()=>{throw Error('no offline replay')}});await session.start();
 const errors=[],controller=new RoomController(session,{transportFactory:net.factory,onError:error=>errors.push(error.message)});
 return{session,controller,errors,writes,get envelope(){return envelope},fail(error){failure=error},hold(operation,promise){blockedWrite={operation,promise}}};
}
async function pair(t,prepare){
 const net=network(),host=await player(net,'Host',prepare),guest=await player(net,'Guest',prepare);
 t.after(async()=>{await guest.controller.finishLocal('test cleanup');await host.controller.finishLocal('test cleanup');});
 await host.controller.start();await guest.controller.start({code:'FAMILY'});await until(()=>guest.controller.phase==='active');
 clearInterval(host.controller.timer);clearInterval(guest.controller.timer);
 return{net,host,guest};
}

test('real room engine commands travel through the controller and only durable solo snapshots are acknowledged',async t=>{
 const {net,host,guest}=await pair(t),baseline=structuredClone(guest.session.state);
 assert.equal(guest.controller.players.length,1);assert.equal(guest.session.phase,'room');
 const result=await guest.controller.command({type:'useItem',itemId:'ITEM-RED-POTION'});assert(result.ok);
 assert.equal(guest.session.state.inventory.stacks['ITEM-RED-POTION'],100);
 assert.equal(guest.controller.state.inventory.stacks['ITEM-RED-POTION'],99);
 assert(!guest.writes.includes('room-checkpoint'));
 await host.controller.checkpoint();await until(()=>guest.controller.save.sequence===1&&host.controller.acks.get(guest.controller.transport.id)===1);
 assert.equal(guest.envelope.state.inventory.stacks['ITEM-RED-POTION'],99);
 assert.deepEqual(guest.envelope.state.worlds,baseline.worlds);assert.equal(guest.envelope.state.clockMs,baseline.clockMs);
 assert(net.packets.some(packet=>packet.message.type==='ack'));
});
test('duplicate commands, stale snapshots and old-room messages cannot repeat an item use',async t=>{
 const {net,host,guest}=await pair(t);
 await guest.controller.command({type:'useItem',itemId:'ITEM-RED-POTION'});
 const packet=net.packets.find(packet=>packet.message.type==='command');
 await host.controller.receive(packet.message,packet.from);
 assert.equal(host.controller.engine.view(packet.from).state.inventory.stacks['ITEM-RED-POTION'],99);
 host.controller.publish();await until(()=>guest.controller.state.inventory.stacks['ITEM-RED-POTION']===99);
 const snapshot=net.packets.find(packet=>packet.message.type==='snapshot');await guest.controller.receive(snapshot.message,'host');
 assert.equal(guest.controller.state.inventory.stacks['ITEM-RED-POTION'],99);
 await host.controller.receive({...packet.message,roomId:'old-room',sequence:999},packet.from);
 assert.equal(host.controller.engine.view(packet.from).state.inventory.stacks['ITEM-RED-POTION'],99);
});
test('host normal departure persists the final command for both players and clears room markers',async t=>{
 const {host,guest}=await pair(t);
 await guest.controller.command({type:'useItem',itemId:'ITEM-RED-POTION'});
 await host.controller.leave();await until(()=>guest.controller.phase==='idle');
 for(const member of [host,guest]){assert.equal(member.session.phase,'ready');assert.equal(member.envelope.room,undefined);assert.deepEqual(member.errors,[]);}
 assert.equal(guest.envelope.state.inventory.stacks['ITEM-RED-POTION'],99);
});
test('abrupt host loss preserves the last acknowledged checkpoint and does not replay room time',async t=>{
 const {host,guest}=await pair(t);
 await host.controller.checkpoint();await until(()=>guest.controller.save.sequence===1);
 await guest.controller.command({type:'useItem',itemId:'ITEM-RED-POTION'});
 await host.controller.transport.close('connection lost');await until(()=>guest.controller.phase==='idle');
 assert.equal(guest.envelope.state.inventory.stacks['ITEM-RED-POTION'],100);
 assert.equal(guest.envelope.state.elapsedMs,'0');assert.equal(guest.session.phase,'ready');
});
test('guest departure commits its last progress while the host can continue',async t=>{
 const {host,guest}=await pair(t);
 await guest.controller.command({type:'useItem',itemId:'ITEM-RED-POTION'});await guest.controller.leave();
 assert.equal(guest.envelope.state.inventory.stacks['ITEM-RED-POTION'],99);assert.equal(guest.session.phase,'ready');
 assert.equal(host.controller.phase,'active');assert.equal(host.controller.engine.memberIds.length,1);
});
test('storage failure is never acknowledged as saved and blocks the affected player',async t=>{
 const {net,host,guest}=await pair(t);guest.fail(Error('synthetic storage failure'));
 await host.controller.checkpoint();await until(()=>guest.controller.phase==='idle');
 assert.equal(guest.session.phase,'blocked');assert.equal(guest.envelope.room.sequence,0);
 assert(!net.packets.some(packet=>packet.from===guest.controller.transport.id&&packet.message.type==='ack'));
 assert(guest.errors.some(error=>error.includes('storage failure')));
});
test('invalid command packet is rejected without ending the host room',async t=>{
 const {host,guest}=await pair(t);
 await host.controller.receive({protocol:1,roomId:host.controller.roomId,type:'command',sequence:1},guest.controller.transport.id);
 assert.equal(host.controller.phase,'active');assert.deepEqual(host.errors,[]);
});

test('invalid transport configuration returns to idle without freezing the solo session',async()=>{
 const net=network(),p=await player(net,'Host'),controller=new RoomController(p.session,{transportFactory:()=>{throw Error('invalid URL')}});await assert.rejects(controller.start(),/invalid URL/);assert.equal(controller.phase,'idle');assert.equal(p.session.phase,'ready');assert.equal(p.writes.length,0);
});
test('controller can host again and late callbacks from its previous transport cannot close the new room',async t=>{
 const net=network(),p=await player(net,'Host');t.after(()=>p.controller.finishLocal('cleanup'));await p.controller.start();const old=p.controller.transport,roomId=p.controller.roomId;await p.controller.leave();await p.controller.start();assert.notEqual(p.controller.roomId,roomId);assert.equal(p.controller.sequence,0);old.options.onClose('late old disconnect');assert.equal(p.controller.phase,'active');await p.controller.leave();assert.equal(p.controller.phase,'idle');assert.equal(p.session.phase,'ready');
});
test('cancel while the entry checkpoint is pending waits for it and clears the room marker without joining',async()=>{
 const net=network(),p=await player(net,'Host');let release;p.hold('room-enter',new Promise(resolve=>release=resolve));const starting=p.controller.start();const rejected=assert.rejects(starting,/取消/);await until(()=>p.writes.includes('room-preflight'));const leaving=p.controller.leave();release();await rejected;await leaving;assert.equal(p.controller.phase,'idle');assert.equal(p.session.phase,'ready');assert.equal(p.envelope.room,undefined);assert.equal(net.nodes.size,0);
});
test('cancel pending network join cannot start a timer or room after its response arrives',async()=>{
 const net=network(),p=await player(net,'Guest');let release;const waiting=new Promise(resolve=>release=resolve);const controller=new RoomController(p.session,{transportFactory:options=>({async join(){await waiting;this.id='late';this.hostId='host';this.isHost=false;},async close(){options.onClose('cancelled')}})});const starting=controller.start({code:'FAMILY'}),rejected=assert.rejects(starting,/取消/);await controller.leave();release();await rejected;assert.equal(controller.phase,'idle');assert.equal(controller.timer,undefined);assert.equal(p.session.phase,'ready');assert.equal(p.writes.length,0);
});
test('already delivered checkpoints are processed before a queued transport close',async t=>{
 const {host,guest}=await pair(t);await guest.controller.command({type:'useItem',itemId:'ITEM-RED-POTION'});let release;guest.controller.incoming=new Promise(resolve=>release=resolve);await host.controller.checkpoint();await host.controller.transport.close('after checkpoint delivery');release();await until(()=>guest.controller.phase==='idle');assert.equal(guest.envelope.state.inventory.stacks['ITEM-RED-POTION'],99);assert.equal(guest.session.phase,'ready');assert.equal(guest.envelope.room,undefined);
});
test('malformed display snapshots are rejected before renderer state changes',async t=>{
 const {net,host,guest}=await pair(t),previous=guest.controller.state,packet=structuredClone(net.packets.find(packet=>packet.message.type==='snapshot').message);packet.sequence=guest.controller.lastView+1;delete packet.view.state.player.path;await assert.rejects(guest.controller.receive(packet,'host'),/畫面資料/);assert.equal(guest.controller.state,previous);assert.equal(guest.session.state.inventory.stacks['ITEM-RED-POTION'],100);const peer=structuredClone(net.packets.find(packet=>packet.message.type==='snapshot').message);peer.sequence=packet.sequence;peer.view.players[0].inventory={};await assert.rejects(guest.controller.receive(peer,'host'),/畫面資料/);assert.equal(guest.controller.state,previous);
 for(const mutate of [v=>v.pendingTrade={open:{selfId:'forged'},targets:[]},v=>v.pendingTrade={open:null,targets:[{memberId:'stranger',name:'X'}]},v=>v.pendingPolymorph={incoming:{},outgoing:[],targets:[]},v=>v.pendingPolymorph={incoming:[],outgoing:[],targets:[{memberId:'stranger',forms:[]}]}]){const forged=structuredClone(net.packets.find(p=>p.message.type==='snapshot').message);forged.sequence=packet.sequence;mutate(forged.view);await assert.rejects(guest.controller.receive(forged,'host'),/畫面資料/);assert.equal(guest.controller.state,previous);}
});
test('a checkpoint that cannot enter the channel disconnects that peer without claiming its latest progress saved',async t=>{
 const {host,guest}=await pair(t),send=host.controller.transport.to.bind(host.controller.transport);await guest.controller.command({type:'useItem',itemId:'ITEM-RED-POTION'});host.controller.transport.to=(id,message)=>message.type==='checkpoint'&&id===guest.controller.transport.id?false:send(id,message);await host.controller.checkpoint();await until(()=>guest.controller.phase==='idle');assert.equal(guest.envelope.state.inventory.stacks['ITEM-RED-POTION'],100);assert.equal(host.controller.phase,'active');assert.equal(host.controller.members.size,1);assert.match(guest.controller.reason,/未送達/);
});
test('peer acknowledgements cannot claim a checkpoint never sent to that member',async t=>{
 const {host,guest}=await pair(t);const sequence=await host.controller.checkpoint(['host']);await host.controller.receive({protocol:1,roomId:host.controller.roomId,type:'ack',sequence},guest.controller.transport.id);assert.equal(host.controller.members.get(guest.controller.transport.id).saved,0);assert.equal(host.controller.acks.has(guest.controller.transport.id),false);
});

test('overlapping periodic and departing-member checkpoints retain a single increasing send order',async t=>{
 const {net,host,guest}=await pair(t);let release;host.hold('room-checkpoint',new Promise(resolve=>release=resolve));const first=host.controller.checkpoint(),second=host.controller.checkpoint([guest.controller.transport.id]);await delay(10);try{assert.equal(net.packets.filter(packet=>packet.message.type==='checkpoint').length,0);}finally{release();}await first;await second;await until(()=>guest.controller.save.sequence===2&&host.controller.acks.get(guest.controller.transport.id)===2);const sent=net.packets.filter(packet=>packet.message.type==='checkpoint'&&packet.to===guest.controller.transport.id).map(packet=>packet.message.checkpoint.sequence);assert.deepEqual(sent,[1,2]);
});

test('an unsent hello clears the room marker and returns to the saved solo state',async t=>{
 const net=network(),host=await player(net,'Host'),guest=await player(net,'Guest'),factory=net.factory;
 guest.controller.transportFactory=options=>{const transport=factory(options),send=transport.to;transport.to=function(id,message){return message.type==='hello'?false:send.call(this,id,message)};return transport;};
 t.after(async()=>{await guest.controller.finishLocal('cleanup');await host.controller.finishLocal('cleanup');});
 await host.controller.start();await guest.controller.start({code:'FAMILY'});await until(()=>guest.controller.phase==='idle');
 assert.equal(guest.session.phase,'ready');assert.equal(guest.envelope.room,undefined);
 assert(guest.writes.includes('room-enter'));assert(guest.writes.includes('room-leave'));
 assert(guest.errors.some(error=>error.includes('角色資料未送出')));assert.equal(host.controller.members.size,1);
});
test('an oversized hello reports the transport limit and restores solo state',async t=>{
 const net=network(),host=await player(net,'Host'),guest=await player(net,'Guest'),factory=net.factory;
 guest.controller.transportFactory=options=>{const transport=factory(options),send=transport.to;transport.to=function(id,message){if(message.type==='hello')throw Error('連線資料不能超過 4 MiB');return send.call(this,id,message)};return transport;};
 t.after(async()=>{await guest.controller.finishLocal('cleanup');await host.controller.finishLocal('cleanup');});
 await host.controller.start();await guest.controller.start({code:'FAMILY'});await until(()=>guest.controller.phase==='idle');
 assert.equal(guest.session.phase,'ready');assert.equal(guest.envelope.room,undefined);assert(guest.errors.some(error=>error.includes('4 MiB')));
});
test('a connected channel without a welcome cannot leave joining open forever',async t=>{
 const net={factory:options=>({hostId:'host',async join(){this.id='guest';this.isHost=false;},async close(reason){options.onClose(reason)},to(){return true}})};
 const guest=await player(net,'Guest');t.after(()=>guest.controller.finishLocal('cleanup'));
 t.mock.timers.enable({apis:['setTimeout']});await guest.controller.start({code:'FAMILY'});
 assert.equal(guest.controller.phase,'connecting');t.mock.timers.tick(20000);await guest.controller.finishing;
 assert.equal(guest.controller.phase,'idle');assert.equal(guest.session.phase,'ready');assert.deepEqual(guest.writes,[]);assert(guest.errors.some(error=>error.includes('逾時')));
});
test('a received welcome without the first snapshot times out and clears the room marker',async t=>{
 const net=network(),host=await player(net,'Host'),guest=await player(net,'Guest');
 t.after(async()=>{await guest.controller.finishLocal('cleanup');await host.controller.finishLocal('cleanup');});
 await host.controller.start();clearInterval(host.controller.timer);
 const send=host.controller.transport.to;host.controller.transport.to=function(id,message){return message.type==='snapshot'?true:send.call(this,id,message)};
 t.mock.timers.enable({apis:['setTimeout']});await guest.controller.start({code:'FAMILY'});
 await guest.controller.incoming;await host.controller.incoming;
 assert.equal(guest.controller.phase,'connecting');assert.equal(guest.session.phase,'room');
 t.mock.timers.tick(20000);await guest.controller.finishing;
 assert.equal(guest.session.phase,'ready');assert.equal(guest.envelope.room,undefined);assert(guest.errors.some(error=>error.includes('逾時')));
});
test('a host removes an unresponsive joining peer after the hello deadline',async t=>{
 const host=await player(network(),'Host'),disconnected=[];
 t.after(()=>host.controller.finishLocal('cleanup'));await host.controller.start();clearInterval(host.controller.timer);
 host.controller.transport.to=()=>true;host.controller.transport.disconnect=async(id,reason)=>disconnected.push({id,reason});
 t.mock.timers.enable({apis:['setTimeout']});host.controller.peer({id:'silent',state:'open'});
 t.mock.timers.tick(20000);
 assert.equal(disconnected.length,1);assert.equal(disconnected[0].id,'silent');assert.match(disconnected[0].reason,/角色資料/);assert.equal(host.controller.phase,'active');
});

function fusionState(state){
 state.equipped={};state.inventory.equipment=['e1','e2'].map(uid=>({uid,itemId:'EQ-DAGGER',plus:0,durability:100,identified:true,cursed:false,quality:'normal'}));
 state.inventory.scrolls=[{uid:'scroll'+state.nextId,itemId:'ITEM-FUSION-WEAPON-BASIC-NORMAL',identified:true}];state.nextId=String(BigInt(state.nextId)+1n);
}
for(const side of ['host','guest'])test(side+' fusion returns its transaction ID only after the staged and committed states are durable',async t=>{
 const pairData=await pair(t,fusionState),member=pairData[side],controller=member.controller;
 const stage=await controller.command({type:'fusionStage',uids:['e1','e2'],scrollUid:member.session.state.inventory.scrolls[0].uid});
 assert.equal(stage.ok,true);assert.equal(typeof stage.transactionId,'string');assert.deepEqual(stage.events,[]);
 assert.equal(member.envelope.state.fusion.pending.id,stage.transactionId);
 assert.equal(controller.state.fusion.pending.id,stage.transactionId);
 const committed=await controller.command({type:'fusionCommit',transactionId:stage.transactionId});
 assert.equal(committed.ok,true);assert.deepEqual(committed.events,[]);
 const receipt=member.envelope.state.fusion.receipts.at(-1);
 assert(receipt);assert.deepEqual(controller.state.fusion.receipts.at(-1),receipt);assert.equal(controller.state.fusion.pending,null);
 const durable=structuredClone(member.envelope.state),duplicate=await controller.command({type:'fusionCommit',transactionId:stage.transactionId});
 assert.equal(duplicate.ok,true);assert.equal(duplicate.duplicate,true);assert.deepEqual(member.envelope.state,durable);
 if(side==='guest'){
  const messages=pairData.net.packets.filter(packet=>packet.to===controller.transport.id).map(packet=>packet.message.type);
  const firstResult=messages.indexOf('result');assert.equal(messages[firstResult-1],'snapshot');assert.equal(messages[firstResult-2],'checkpoint');
 }
});

for(const side of ['host','guest'])test(side+' fusion persistence failure cannot return success or keep the room active',async t=>{
 const pairData=await pair(t,fusionState),member=pairData[side];member.fail(Error('synthetic transaction write failure'));
 const result=await member.controller.command({type:'fusionStage',uids:['e1','e2'],scrollUid:member.session.state.inventory.scrolls[0].uid});
 assert.equal(result.ok,false);await until(()=>member.controller.phase==='idle');
 assert.equal(member.session.phase,'blocked');assert.equal(member.envelope.state.fusion.pending,null);assert.equal(member.controller.state,null);
});
test('host departure write failure closes the room and leaves the failed session blocked',async t=>{
 const {host,guest}=await pair(t);host.fail(Error('synthetic departure write failure'));
 await host.controller.leave();await until(()=>guest.controller.phase==='idle');
 assert.equal(host.controller.phase,'idle');assert.equal(host.session.phase,'blocked');assert(host.errors.some(error=>error.includes('departure write failure')));
});

test('a cancelled join response and queued close cannot terminate a new room on the same controller',async t=>{
 const net=network(),p=await player(net,'Guest');let release,releaseIncoming,first=true,old;
 const waiting=new Promise(resolve=>release=resolve);
 p.controller.transportFactory=options=>{if(!first)return net.factory(options);first=false;return old={options,async join(){await waiting;this.id='old';this.hostId='host';this.isHost=false;},async close(){options.onClose('old cancelled')}}};
 t.after(()=>p.controller.finishLocal('cleanup'));
 const starting=p.controller.start({code:'FAMILY'}),rejected=assert.rejects(starting,/取消/);
 p.controller.incoming=new Promise(resolve=>releaseIncoming=resolve);old.options.onClose('queued old close');const queued=p.controller.incoming;
 await p.controller.leave();await p.controller.start();const roomId=p.controller.roomId;
 release();releaseIncoming();await rejected;await queued;
 assert.equal(p.controller.phase,'active');assert.equal(p.controller.roomId,roomId);assert.equal(p.envelope.room.roomId,roomId);assert.equal(p.session.phase,'room');
});
for(const mode of ['false','oversized'])test('a '+mode+' snapshot send cannot be followed by a successful result against an old view',async t=>{
 const {net,host,guest}=await pair(t),send=host.controller.transport.to.bind(host.controller.transport);
 host.controller.transport.to=(id,message)=>{if(message.type==='snapshot'&&id===guest.controller.transport.id){if(mode==='oversized')throw Error('連線資料不能超過 4 MiB');return false;}return send(id,message);};
 const result=await guest.controller.command({type:'useItem',itemId:'ITEM-RED-POTION'});
 assert.equal(result.ok,false);await until(()=>guest.controller.phase==='idle');
 assert(!net.packets.some(packet=>packet.to===guest.controller.transport.id&&packet.message.type==='result'&&packet.message.result.ok));
 assert.equal(guest.envelope.state.inventory.stacks['ITEM-RED-POTION'],100);assert.equal(host.controller.phase,'active');assert.equal(host.controller.members.size,1);
});

async function offerExchange(host,guest){
 const guestId=guest.controller.transport.id;
 assert((await host.controller.command({type:'inviteTrade',targetMemberId:guestId})).ok);
 let open=host.controller.pendingTrade.open;
 assert((await host.controller.command({type:'offerTrade',tradeId:open.id,revision:open.revision,offer:{...emptyTradeOffer(),gold:100,stacks:{'ITEM-RED-POTION':2}}})).ok);
 open=host.controller.pendingTrade.open;
 assert((await guest.controller.command({type:'offerTrade',tradeId:open.id,revision:open.revision,offer:{...emptyTradeOffer(),gold:25,stacks:{'ITEM-BLUE-POTION':1}}})).ok);
 open=host.controller.pendingTrade.open;
 assert((await host.controller.command({type:'confirmTrade',tradeId:open.id,revision:open.revision})).ok);
 return {type:'confirmTrade',tradeId:open.id,revision:open.revision};
}
test('bilateral trade returns success only after both device checkpoints and the coordinator decision are durable',async t=>{
 const {host,guest,net}=await pair(t,s=>{s.id+='-'+s.player.name;s.player.gold=1000;});
 const confirm=await offerExchange(host,guest),result=await guest.controller.command(confirm);assert(result.ok,result.error);
 assert.equal(host.envelope.state.player.gold,925);assert.equal(guest.envelope.state.player.gold,1075);
 assert.equal(host.envelope.state.tradeEscrow,undefined);assert.equal(guest.envelope.state.tradeEscrow,undefined);
 const tx=host.envelope.state.tradeCoordinator.transactions[0];assert.equal(tx.decision,'commit');assert(tx.parties.every(p=>p.done));
 const finalPacket=net.packets.findLast(p=>p.message.type==='command'&&p.message.action.type==='confirmTrade');
 await host.controller.receive(finalPacket.message,finalPacket.from);assert.equal(host.envelope.state.player.gold,925);assert.equal(guest.envelope.state.player.gold,1075);
});
test('loss after the host commit leaves remote assets locked and reconnection to the same host resolves them once',async t=>{
 const {host,guest}=await pair(t,s=>{s.id+='-'+s.player.name;s.player.gold=1000;});
 const confirm=await offerExchange(host,guest),send=host.controller.transport.to.bind(host.controller.transport);let dropped=false;
 host.controller.transport.to=(id,message)=>{if(!dropped&&id===guest.controller.transport.id&&message.type==='checkpoint'&&message.checkpoint.state.tradeReceipts?.some(r=>r.decision==='commit')){dropped=true;return false;}return send(id,message);};
 const result=await guest.controller.command(confirm);assert(!result.ok);await until(()=>guest.controller.phase==='idle');await host.controller.incoming;
 assert(dropped);assert(guest.envelope.state.tradeEscrow);assert.equal(guest.envelope.state.player.gold,975);assert.equal(host.envelope.state.tradeCoordinator.transactions[0].decision,'commit');
 await guest.controller.start({code:'FAMILY'});await until(()=>guest.controller.phase==='active');clearInterval(guest.controller.timer);
 assert.equal(guest.envelope.state.tradeEscrow,undefined);assert.equal(guest.envelope.state.player.gold,1075);assert.equal(host.envelope.state.player.gold,925);
 const tx=host.envelope.state.tradeCoordinator.transactions[0];assert(tx.parties.every(p=>p.done));
});

test('solo exploration history is never sent in hello or checkpoints and remains exact after leaving',async t=>{
 const {host,guest,net}=await pair(t),baseline=structuredClone(guest.session.state.worlds);
 const hello=net.packets.find(p=>p.message.type==='hello').message;assert.equal(hello.personalWorlds,'local-baseline');assert.deepEqual(hello.state.worlds,{});
 await guest.controller.command({type:'useItem',itemId:'ITEM-RED-POTION'});await host.controller.checkpointConfirmed([guest.controller.transport.id]);
 const packet=net.packets.findLast(p=>p.message.type==='checkpoint').message.checkpoint;assert.equal(packet.personalWorlds,'local-baseline');assert.deepEqual(packet.state.worlds,{});assert.deepEqual(guest.envelope.state.worlds,baseline);
 await guest.controller.leave();assert.deepEqual(guest.envelope.state.worlds,baseline);assert.equal(guest.envelope.state.inventory.stacks['ITEM-RED-POTION'],99);
});

test('leaving during final trade saving waits for both phones instead of closing against pending escrow',async t=>{
 const {host,guest}=await pair(t,s=>{s.id+='-'+s.player.name;s.player.gold=1000;});const confirm=await offerExchange(host,guest);let release;const gate=new Promise(resolve=>release=resolve);guest.hold('room-checkpoint',gate);
 const trading=guest.controller.command(confirm);await until(()=>host.controller.tradeSaving);const leaving=host.controller.leave();await delay(20);assert.notEqual(host.controller.phase,'idle');release();
 assert((await trading).ok);await leaving;await until(()=>guest.controller.phase==='idle');assert.equal(host.envelope.state.tradeEscrow,undefined);assert.equal(guest.envelope.state.tradeEscrow,undefined);assert.equal(host.envelope.state.player.gold,925);assert.equal(guest.envelope.state.player.gold,1075);
});

test('third-party host durably coordinates a trade between two guests',async t=>{
 const {host,guest,net}=await pair(t,s=>{s.id+='-'+s.player.name;s.player.gold=1000;}),other=await player(net,'Other',s=>{s.id+='-Other';s.player.gold=1000;});t.after(()=>other.controller.finishLocal('cleanup'));await other.controller.start({code:'FAMILY'});await until(()=>other.controller.phase==='active');clearInterval(other.controller.timer);
 const confirm=await offerExchange(guest,other);const result=await other.controller.command(confirm);assert(result.ok,result.error);assert.equal(guest.envelope.state.player.gold,925);assert.equal(other.envelope.state.player.gold,1075);assert.equal(host.envelope.state.player.gold,1000);assert.equal(host.envelope.state.tradeCoordinator.transactions[0].decision,'commit');assert(host.envelope.state.tradeCoordinator.transactions[0].parties.every(p=>p.done));
});

test('disconnect before both confirmations cancels the offer without moving assets',async t=>{
 const {host,guest}=await pair(t,s=>{s.id+='-'+s.player.name;s.player.gold=1000;});await offerExchange(host,guest);await guest.controller.leave();assert.equal(host.envelope.state.player.gold,1000);assert.equal(guest.envelope.state.player.gold,1000);assert.equal(host.envelope.state.tradeEscrow,undefined);assert.equal(guest.envelope.state.tradeEscrow,undefined);assert.equal(host.controller.engine.view('host').pendingTrade.open,null);
});

test('host restart aborts a durably prepared trade with no saved commit and refunds both sides exactly once',async t=>{
 const {host,guest}=await pair(t,s=>{s.id+='-'+s.player.name;s.player.gold=1000;}),confirm=await offerExchange(host,guest),prepared=host.controller.engine.command(guest.controller.transport.id,confirm);assert(prepared.tradePrepared);
 await host.controller.checkpointConfirmed(host.controller.engine.memberIds);assert(host.envelope.state.tradeEscrow);assert(guest.envelope.state.tradeEscrow);await host.controller.transport.close('simulated host loss before decision');await until(()=>host.controller.phase==='idle'&&guest.controller.phase==='idle');
 await host.controller.start();clearInterval(host.controller.timer);assert.equal(host.envelope.state.player.gold,1000);assert.equal(host.envelope.state.tradeEscrow,undefined);assert.equal(host.envelope.state.tradeCoordinator.transactions[0].decision,'abort');
 await guest.controller.start({code:'FAMILY'});await until(()=>guest.controller.phase==='active');clearInterval(guest.controller.timer);assert.equal(guest.envelope.state.player.gold,1000);assert.equal(guest.envelope.state.tradeEscrow,undefined);assert(host.envelope.state.tradeCoordinator.transactions[0].parties.every(p=>p.done));
 await host.controller.recoverTrades(guest.controller.transport.id);assert.equal(guest.envelope.state.player.gold,1000);assert.equal(host.envelope.state.player.gold,1000);
});

test('malformed compact joining data rejects only the joining phone and does not terminate the host room',async t=>{
 const net=network(),host=await player(net,'Host'),guest=await player(net,'Guest'),factory=net.factory;guest.controller.transportFactory=options=>{const tr=factory(options),send=tr.to;tr.to=function(id,m){return send.call(this,id,m.type==='hello'?{...m,personalWorlds:'untrusted'}:m)};return tr;};t.after(async()=>{await guest.controller.finishLocal('cleanup');await host.controller.finishLocal('cleanup')});
 await host.controller.start();clearInterval(host.controller.timer);await guest.controller.start({code:'FAMILY'});await until(()=>guest.controller.phase==='idle');assert.equal(host.controller.phase,'active');assert.equal(host.controller.engine.memberIds.length,1);assert.equal(guest.session.phase,'ready');assert.equal(guest.envelope.room,undefined);
});

test('v4 companions without obsolete aptitude fields join, render and checkpoint across phones',async t=>{
 const {host,guest}=await pair(t,s=>{const id=uid(s,'pet');s.pets.push({id,sourceId:'wild:'+s.id+':'+id,collarUid:uid(s,'collar'),collarInBag:true,type:'PET-WOLF',name:'V4',level:1,x:s.player.x,y:s.player.y,map:s.player.map,hp:1,mp:0,food:88,foodAt:60000,mpRegenAt:8000,magicAt:0,v4At:0,xp:'0',active:true,dead:false,effects:[],attackAt:0,moveAt:0,path:[],mode:'follow',v4:createWildTraits(s,'PET-WOLF',s.id+':'+id)});});
 assert.equal(guest.controller.players[0].pets.length,1);assert.equal(guest.controller.players[0].pets[0].aptitudes,undefined);await host.controller.checkpointConfirmed(host.controller.engine.memberIds);assert(guest.envelope.state.pets[0].v4);assert.equal(guest.envelope.state.pets[0].aptitudes,undefined);assert.deepEqual(guest.errors,[]);
});
