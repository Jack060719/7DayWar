import {validate} from './engine.mjs';
import {CLASSES,ITEMS,MAPS,PETS,MONSTERS,CONTENT} from './data.mjs';
import {createRoom} from './coop-engine.mjs';
import {RoomSaveSession} from './room-session.mjs';
import {RoomTransport} from './room-transport.mjs';
import {compactRoomState,restoreRoomState} from './room-transfer.mjs';
import {validTradeView} from './trade.mjs';
import {validPolymorphView} from './polymorph-interaction.mjs';
import {validatePetV4} from './pets-v4.mjs';

const protocol=1;
const durableActions=new Set(['fusionStage','fusionCommit','learn','enchant','petBreedStage','petBreedCommit','petUpgrade','petBag','answerPolymorph']);
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));


function validView(view,members,events,characterId,memberId){
 if(!view?.state||view.state.id!==characterId||!validate(view.state).ok||!Array.isArray(view.players)||view.players.length>9||!Array.isArray(members)||members.length>10||!Array.isArray(events))return false;
 const actor=a=>a&&typeof a.id==='string'&&!!MAPS[a.map]&&['x','y','hp','mp'].every(key=>Number.isSafeInteger(a[key])&&a[key]>=0)&&a.x<MAPS[a.map].geometry.width_tiles&&a.y<MAPS[a.map].geometry.height_tiles&&Array.isArray(a.effects)&&a.effects.every(effect=>effect&&Number.isFinite(effect.until));
 const ids=new Set;
 for(const member of members){if(!member||typeof member.id!=='string'||!member.id||ids.has(member.id)||typeof member.name!=='string'||member.name.length>20||!Number.isSafeInteger(member.saved)||member.saved<0)return false;ids.add(member.id);}
 if(!validTradeView(view.pendingTrade,ids,memberId)||!validPolymorphView(view.pendingPolymorph,ids,memberId))return false;
 const visible=new Set;
 for(const peer of view.players){
  if(!peer||!ids.has(peer.memberId)||visible.has(peer.memberId)||!actor(peer.player)||!CLASSES[peer.player.classId]||typeof peer.player.name!=='string'||peer.player.name.length>20||!peer.equipped||typeof peer.equipped!=='object'||!Array.isArray(peer.inventory?.equipment)||!Array.isArray(peer.pets)||!Array.isArray(peer.summons))return false;
  visible.add(peer.memberId);
  if(peer.inventory.equipment.some(item=>!item||!ITEMS[item.itemId]))return false;
  if(peer.pets.some(pet=>!actor(pet)||!PETS[pet.type]||!Number.isSafeInteger(pet.level)||pet.level<1||pet.v4&&!validatePetV4(pet).ok||(pet.aptitudes===undefined&&pet.v4?false:!pet.aptitudes||!['hp','attack','defense','speed'].every(key=>Number.isFinite(pet.aptitudes[key])))))return false;
  if(peer.summons.some(summon=>!actor(summon)||!MONSTERS[summon.type]&&!CONTENT.visual_forms.some(form=>form.id===summon.type)))return false;
 }
 return events.every(event=>event&&typeof event.type==='string'&&['from','to'].every(key=>event[key]===undefined||event[key]&&Number.isFinite(event[key].x)&&Number.isFinite(event[key].y)));
}

// Render snapshots never replace the durable, solo-compatible GameSession state.
export class RoomController{
 constructor(session,{onChange=()=>{},onEvents=()=>{},onError=()=>{},transportFactory=options=>new RoomTransport(options),roomFactory=createRoom}={}){
  Object.assign(this,{session,onChange,onEvents,onError,transportFactory,roomFactory});
  this.phase='idle';this.players=[];this.state=null;this.pending=new Map;this.acks=new Map;
  this.members=new Map;this.joiningPeers=new Map;this.incoming=Promise.resolve();this.sequence=0;this.commandSequence=0;this.viewSequence=0;this.lastView=0;this.events=[];
 }
 get active(){return this.phase!=='idle'}
 get isHost(){return !!this.transport?.isHost}
 get code(){return this.transport?.code||''}
 get status(){return{phase:this.phase,code:this.code,isHost:this.isHost,members:[...this.members.values()].map(member=>({id:member.id,name:member.name,saved:member.saved||0})),saved:this.save?.sequence||0}}
 changed(){this.onChange(this.status)}
 async start({code='',serverURL='/signal',iceServers=[]}={}){
  if(this.active)throw Error('目前已在房間或正在連線');
  this.phase='connecting';this.tradeSaving=false;this.pendingTrade=null;this.pendingPolymorph=null;this.checkpointQueue=Promise.resolve();this.transport=null;this.checkpointAt=0;this.publishedAt=0;this.reason='';this.finishing=null;this.leaving=null;this.entry=null;this.saving=null;this.engine=null;this.state=null;this.players=[];this.members.clear();this.acks.clear();this.sequence=0;this.commandSequence=0;this.viewSequence=0;this.lastView=0;this.events=[];this.incoming=Promise.resolve();const generation=this.generation=(this.generation||0)+1;this.save=new RoomSaveSession(this.session);this.changed();
  try{
  const transport=this.transport=this.transportFactory({serverURL,iceServers,
   onMessage:(message,from)=>{if(generation!==this.generation)return;if(this.isHost&&message?.type==='ack'&&message.protocol===protocol&&message.roomId===this.roomId){this.receiveAck(message,from);return;}this.incoming=this.incoming.then(()=>generation===this.generation?this.receive(message,from):undefined).catch(error=>{if(generation===this.generation)return this.fail(error)});},
   onPeer:peer=>{if(generation===this.generation)try{this.peer(peer)}catch(error){this.fail(error)}},onClose:reason=>{if(generation!==this.generation||this.phase==='idle'||this.finishing)return;this.phase='ending';clearInterval(this.timer);this.incoming=this.incoming.then(()=>generation===this.generation?this.finishLocal('連線結束：'+reason):undefined).catch(error=>{if(generation===this.generation)return this.fail(error)});},
   onError:error=>{if(generation===this.generation)this.onError(error)}
  });
   if(code){await transport.join(code);if(generation!==this.generation)throw Error('已取消連線');if(this.phase==='connecting')this.joinTimer=setTimeout(()=>{if(generation===this.generation&&this.phase==='connecting')this.fail(Error('加入房間逾時，尚未收到房主確認'));},20000);}
   else{
    this.roomId=crypto.randomUUID();
    const baseline=await (this.entry=this.save.enter(this.roomId,'host'));
    if(generation!==this.generation||this.phase!=='connecting')throw Error('已取消連線');
    this.engine=this.roomFactory(crypto.getRandomValues(new Uint32Array(1))[0]);
    const added=this.engine.addMember('host',baseline.state);if(!added.ok)throw Error(added.error);
    this.members.set('host',{id:'host',name:baseline.state.player.name,lastCommand:0,saved:0});
    await transport.host();if(generation!==this.generation||this.phase!=='connecting')throw Error('已取消連線');await this.recoverTrades('host');this.phase='active';this.publish();
   }
   if(this.phase==='idle'||this.phase==='ending')throw Error('已取消連線');
   this.timer=setInterval(()=>this.tick(),100);this.lastTick=performance.now();this.changed();
   return this.status;
  }catch(error){if(generation===this.generation)await this.finishLocal(error.message);throw error;}
 }
 peer({id,state}){
  if(this.phase==='idle')return;
  if(state==='open'&&this.isHost){
   if(!this.send(id,{type:'welcome',roomId:this.roomId})){this.transport.disconnect(id,'無法送出房間邀請');return;}
   clearTimeout(this.joiningPeers.get(id));this.joiningPeers.set(id,setTimeout(()=>{this.joiningPeers.delete(id);if(!this.members.has(id))this.transport.disconnect(id,'加入房間逾時，尚未收到角色資料');},20000));
  }
  if(state==='close'){clearTimeout(this.joiningPeers.get(id));this.joiningPeers.delete(id);}
  if(state==='close'&&this.isHost&&this.members.has(id)){
   this.engine.removeMember(id);this.members.delete(id);this.acks.delete(id);this.changed();
  }
 }
 send(id,message){return this.transport?.to(id,{...message,protocol,roomId:this.roomId})}
 async receive(message,from){
  if(this.phase==='idle'||!message||message.protocol!==protocol)return;
  if(!this.isHost&&from!==this.transport.hostId)return;
  if(message.type==='welcome'&&!this.isHost&&this.phase==='connecting'&&!this.save.active){
   this.roomId=message.roomId;
   const baseline=await (this.entry=this.save.enter(this.roomId,this.transport.id));
   if(this.phase!=='connecting')return;
   if(!this.send(from,{type:'hello',...compactRoomState(baseline.state)}))throw Error('角色資料未送出，已取消加入並保留個人進度');return;
  }
  if(message.roomId!==this.roomId)return;
  if(this.isHost)return this.receiveHost(message,from);
  if(message.type==='snapshot'){
   if(!this.save.active||!['connecting','active'].includes(this.phase)||!Number.isSafeInteger(message.sequence)||message.sequence<=this.lastView)return;
   if(!validView(message.view,message.members,message.events||[],this.session.state.id,this.transport.id))throw Error('房間畫面資料不完整，已保留最後保存成果');
   this.lastView=message.sequence;this.state=message.view.state;this.players=message.view.players||[];this.pendingTrade=message.view.pendingTrade||null;this.pendingPolymorph=message.view.pendingPolymorph||null;
   this.members=new Map((message.members||[]).map(member=>[member.id,member]));
   if(this.phase==='connecting'){clearTimeout(this.joinTimer);this.phase='active';}
   this.onEvents(message.events||[],this.state);this.changed();
  }else if(message.type==='result'){
   const pending=this.pending.get(message.sequence);if(pending){clearTimeout(pending.timer);this.pending.delete(message.sequence);pending.resolve(message.result);}
  }else if(message.type==='checkpoint'){
   const result=await this.save.applyCheckpoint(message.checkpoint);
   this.send(from,{type:'ack',sequence:result.sequence});this.changed();
  }else if(message.type==='end'){
   await this.finishLocal(message.reason||'房間已結束',true);
  }else if(message.type==='rejected')await this.finishLocal(message.reason||'無法加入房間');
 }
 async receiveHost(message,from){
  if(message.type==='hello'&&this.phase==='active'&&!this.members.has(from)){
   clearTimeout(this.joiningPeers.get(from));this.joiningPeers.delete(from);
   let result;try{result=this.engine.addMember(from,restoreRoomState(message));}catch(error){result={ok:false,error:error.message};}
   if(!result.ok){this.send(from,{type:'rejected',reason:result.error});await this.transport.disconnect(from,'rejected');return;}
   this.members.set(from,{id:from,name:message.state.player.name,lastCommand:0,saved:0});
   await this.recoverTrades(from);this.publish();this.changed();return;
  }
  const member=this.members.get(from);if(!member)return;
  if(message.type==='command'&&this.phase==='active'){
   const sequence=message.sequence;
   if(!Number.isSafeInteger(sequence)||sequence<1)return;
   if(sequence===member.lastCommand){this.send(from,{type:'result',sequence,result:member.lastResult});return;}
   if(sequence<member.lastCommand)return;
   const now=performance.now();
   if(!member.windowAt||now-member.windowAt>=1000){member.windowAt=now;member.commands=0;}
   const limited=++member.commands>20||!message.action||typeof message.action!=='object'||JSON.stringify(message.action).length>8192;
   let result=this.tradeSaving?{ok:false,error:'交易正在保存，請稍候'}:limited?{ok:false,error:'操作太頻繁，請稍候'}:this.engine.command(from,message.action);
   if(result.tradePrepared)result=await this.completeTrade(result);
   member.lastCommand=sequence;member.lastResult={...result,events:[]};
   if(result.ok&&durableActions.has(message.action.type))await this.checkpointConfirmed(message.action.type==='answerPolymorph'?this.engine.memberIds:[from]);
   this.events.push(...(result.events||[]));const delivered=this.publish();if(delivered.has(from))this.send(from,{type:'result',sequence,result:member.lastResult});
  }else if(message.type==='ack'&&Number.isSafeInteger(message.sequence)&&message.sequence>0&&message.sequence<=(member.sent||0)){
   this.receiveAck(message,from);
  }else if(message.type==='leave'){
   await this.checkpoint([from]);this.send(from,{type:'end',reason:'已離開房間'});
  }else if(message.type==='finished'){
   this.engine.removeMember(from);this.members.delete(from);this.acks.delete(from);await this.transport.disconnect(from,'left');this.changed();
  }
 }
 async command(action){
  if(this.phase!=='active')return Promise.resolve({ok:false,error:'房間尚未準備好或正在結束'});
  if(this.tradeSaving)return{ok:false,error:'交易正在保存，請稍候'};
  if(this.isHost){try{let result=this.engine.command('host',action);if(result.tradePrepared)result=await this.completeTrade(result);if(result.ok&&durableActions.has(action.type))await this.checkpointConfirmed(action.type==='answerPolymorph'?this.engine.memberIds:['host']);this.events.push(...(result.events||[]));this.publish();return {...result,events:[]};}catch(error){await this.fail(error);return{ok:false,error:error.message};}}
  const sequence=++this.commandSequence;
  return new Promise(resolve=>{
   const timer=setTimeout(()=>{this.pending.delete(sequence);resolve({ok:false,error:'操作確認逾時，請檢查連線'});},12000);
   this.pending.set(sequence,{resolve,timer});
   if(!this.send(this.transport.hostId,{type:'command',sequence,action})){clearTimeout(timer);this.pending.delete(sequence);resolve({ok:false,error:'連線忙碌，請稍後再試'});}
  });
 }
 tick(){
  if(this.phase!=='active'||!this.isHost)return;
  if(this.tradeSaving){this.lastTick=performance.now();return;}
  const now=performance.now(),gap=(now-this.lastTick)/1000;this.lastTick=now;
  // Mobile background suspension ends the room; it never fast-forwards a battle.
  if(gap>3){this.leave('房主遊戲暫停，房間已結束').catch(error=>this.fail(error));return;}
  try{
   this.events.push(...this.engine.advance(Math.max(0,gap)).events);
   if(now-(this.publishedAt||0)>=250)this.publish();
   if(now-(this.checkpointAt||0)>=2000&&!this.saving){this.checkpointAt=now;this.saving=this.checkpoint().catch(error=>this.fail(error)).finally(()=>{this.saving=null});}
  }catch(error){this.fail(error);}
 }
 publish(){
  const sequence=++this.viewSequence,members=this.status.members,events=this.events.splice(0),delivered=new Set(['host']);
  for(const id of this.engine.memberIds){
   const view=this.engine.networkView?this.engine.networkView(id,events):this.engine.view(id);
   // The display needs only this map. Solo exploration history stays on its phone.
   view.state.worlds={[view.state.player.map]:view.state.worlds[view.state.player.map]};
   const personalEvents=this.engine.eventsFor(id,events);
   if(id==='host'){this.state=view.state;this.players=view.players;this.pendingTrade=view.pendingTrade||null;this.pendingPolymorph=view.pendingPolymorph||null;this.onEvents(personalEvents,this.state);}
   else{try{if(this.send(id,{type:'snapshot',sequence,view,events:personalEvents,members}))delivered.add(id);else this.transport.disconnect(id,'房間畫面未送達，保留最後已保存進度');}catch(error){this.onError(error);this.transport.disconnect(id,error.message);}}
  }
  this.publishedAt=performance.now();this.changed();return delivered;
 }
 receiveAck(message,from){const member=this.members.get(from);if(!member||!Number.isSafeInteger(message.sequence)||message.sequence<1||message.sequence>(member.sent||0))return;member.saved=Math.max(member.saved||0,message.sequence);this.acks.set(from,member.saved);this.changed();}
 async checkpointConfirmed(ids){
  const selected=[...new Set(ids)],sequence=await this.checkpoint(selected),deadline=performance.now()+4000;
  while(selected.some(id=>(this.members.get(id)?.saved||0)<sequence)){
   if(selected.some(id=>!this.members.has(id))||performance.now()>=deadline)throw Error('裝置尚未確認保存，保留最後已保存成果');
   await sleep(20);
  }
  return sequence;
 }
 completeTrade(prepared){
  const result=this.performTrade(prepared);this.tradeCompletion=result;
  return result.finally(()=>{if(this.tradeCompletion===result)this.tradeCompletion=null;});
 }
 async performTrade(prepared){
  const id=prepared.transactionId,participants=prepared.tradeMembers,all=[...new Set(['host',...participants])];this.tradeSaving=true;
  try{
   await this.checkpointConfirmed(all);
   const decision=this.engine.tradeDecision(id,'commit');if(!decision.ok)throw Error(decision.error);
   if(participants.includes('host')){const settled=this.engine.tradeSettle(id,'host');if(!settled.ok)throw Error(settled.error);this.engine.tradeAcknowledge(id,'host');}
   // The host decision is durable before either remote phone can receive items.
   await this.checkpointConfirmed(['host']);
   for(const member of participants.filter(id=>id!=='host')){const settled=this.engine.tradeSettle(id,member);if(!settled.ok)throw Error(settled.error);}
   await this.checkpointConfirmed(participants);
   for(const member of participants)this.engine.tradeAcknowledge(id,member);
   await this.checkpointConfirmed(['host']);return{ok:true,transactionId:id,tradeCommitted:true,events:[]};
  }catch(error){
   const tx=this.engine.tradeTransactions.find(t=>t.id===id);
   if(tx?.decision==='prepared'){
    this.engine.tradeDecision(id,'abort');
    if(this.engine.tradeParticipantIds(id).includes('host')){const restored=this.engine.tradeSettle(id,'host');if(restored.ok)this.engine.tradeAcknowledge(id,'host');}
    await this.checkpointConfirmed(['host']);
    const remaining=this.engine.tradeParticipantIds(id).filter(id=>id!=='host');
    for(const member of remaining)this.engine.tradeSettle(id,member);
    if(remaining.length)await this.checkpointConfirmed(remaining).catch(()=>{});
   }
   return{ok:false,error:'交易保存中斷；暫鎖物品請重新連回原房主核對。'+error.message,transactionId:id,events:[]};
  }finally{this.tradeSaving=false;this.lastTick=performance.now();}
 }
 async recoverTrades(memberId){
  const transactions=this.engine.tradeTransactions||[];
  for(const tx of transactions)if(this.engine.view('host').state.tradeReceipts?.some(r=>r.id===tx.id&&r.decision===tx.decision))this.engine.tradeAcknowledge(tx.id,'host');
  if(memberId==='host')for(const tx of transactions)if(tx.decision==='prepared')this.engine.tradeDecision(tx.id,'abort');
  for(const tx of this.engine.tradeTransactions||[]){
   const characterId=this.engine.tradeCharacterId(memberId),party=tx.parties.find(p=>p.characterId===characterId);if(!party||party.done||tx.decision==='prepared')continue;
   const state=this.engine.view(memberId).state;
   if(!state.tradeEscrow&&tx.decision==='abort'){this.engine.tradeAcknowledge(tx.id,memberId);continue;}
   const result=this.engine.tradeSettle(tx.id,memberId);if(!result.ok)continue;
   // Persist any recovery decision on the coordinator before releasing escrow.
   await this.checkpointConfirmed(['host']);await this.checkpointConfirmed([memberId]);this.engine.tradeAcknowledge(tx.id,memberId);
  }
  if(transactions.length)await this.checkpointConfirmed(['host']);
 }
 checkpoint(ids=this.engine.memberIds){
  const selected=[...ids],result=this.checkpointQueue.then(()=>this.saveCheckpoint(selected));this.checkpointQueue=result.catch(()=>{});return result;
 }
 async saveCheckpoint(ids){
  const sequence=++this.sequence;
  const checkpoints=ids.filter(id=>this.members.has(id)).map(id=>({roomId:this.roomId,memberId:id,sequence,state:this.engine.exportMember(id)}));
  for(const checkpoint of checkpoints){
   if(checkpoint.memberId==='host'){
    const result=await this.save.applyCheckpoint(checkpoint);this.members.get('host').saved=result.sequence;
   }else if(this.send(checkpoint.memberId,{type:'checkpoint',checkpoint:{...checkpoint,...compactRoomState(checkpoint.state)}})){this.members.get(checkpoint.memberId).sent=sequence;}
   else await this.transport.disconnect(checkpoint.memberId,'成果未送達，保留最後已保存進度');
  }
  this.changed();return sequence;
 }
 async leave(reason='房主結束房間'){
  if(this.phase==='idle')return;
  if(this.leaving)return this.leaving;
  const connecting=this.phase==='connecting';this.phase='ending';this.changed();clearInterval(this.timer);
  this.leaving=(async()=>{
   if(connecting)return this.finishLocal('已取消連線');
   if(this.isHost&&this.engine){
    await this.tradeCompletion;await this.saving;await this.checkpoint();
    for(const id of this.engine.memberIds)if(id!=='host')this.send(id,{type:'end',reason});
    const deadline=performance.now()+4000;
    while(this.members.size>1&&performance.now()<deadline)await sleep(50);
    await this.finishLocal(reason);
   }else if(this.save.active){
    this.send(this.transport.hostId,{type:'leave'});
    const deadline=performance.now()+5000;
    while(this.phase!=='idle'&&performance.now()<deadline)await sleep(50);
    if(this.phase!=='idle')await this.finishLocal('已離房，保留最後確認的成果');
   }else await this.finishLocal('已取消連線');
  })().catch(error=>this.fail(error));
  return this.leaving;
 }
 async finishLocal(reason,acknowledge=false){
  if(this.finishing)return this.finishing;
  this.finishing=(async()=>{
   clearInterval(this.timer);clearTimeout(this.joinTimer);for(const timer of this.joiningPeers.values())clearTimeout(timer);this.joiningPeers.clear();this.phase='ending';this.changed();
   try{
    await this.entry?.catch(()=>{});
    await this.tradeCompletion?.catch(()=>{});
    await this.checkpointQueue;
    await this.save?.finish();
    if(acknowledge)this.send(this.transport.hostId,{type:'finished'});
    // Allow the final acknowledgement to enter the reliable channel queue.
    if(acknowledge)await sleep(100);
   }finally{
    this.state=null;this.players=[];this.pendingTrade=null;this.pendingPolymorph=null;
    for(const pending of this.pending.values()){clearTimeout(pending.timer);pending.resolve({ok:false,error:'房間已結束'});}this.pending.clear();
    try{await this.transport?.close(reason)}finally{this.phase='idle';this.reason=reason;this.changed();}
   }
  })();
  return this.finishing;
 }
 async fail(error){this.onError(error);await this.finishLocal(error.message).catch(failure=>this.onError(failure));}
}
