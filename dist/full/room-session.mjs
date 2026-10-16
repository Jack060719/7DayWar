import {validate} from './engine.mjs';
import {validRoomMarker} from './storage.mjs';
import {restoreRoomState} from './room-transfer.mjs';

// Only exportMember() solo snapshots enter persistence. Room rendering stays in
// the controller and never becomes GameSession.state.
export class RoomSaveSession{
 constructor(session){this.session=session;this.active=false;this.entering=false;this.closing=false;this.sequence=0;this.queue=Promise.resolve()}
 async enter(roomId,memberId){
  const session=this.session,marker={roomId,memberId,sequence:0};
  if(!validRoomMarker(marker))throw Error('房間或玩家身分無效');
  if(this.active||this.entering||session.phase!=='ready'||session.busy||!session.session?.owned||!session.state)throw Error('目前無法加入房間');
  this.entering=true;session.busy=true;session.phase='room';session.workerGeneration++;session.worker?.terminate();session.worker=null;session.changed();
  try{
   await session.queue;
   if(session.phase!=='room')throw Error('加入房間前的存檔已中斷');
   const baseline=structuredClone(session.state),checked=validate(baseline);if(!checked.ok)throw Error(checked.errors.join('；'));
   await session.save(baseline,session.stateWallAt,{operation:'room-preflight'});
   await session.save(baseline,session.now(),{archive:true,operation:'room-enter',room:marker});
   this.roomId=roomId;this.memberId=memberId;this.sequence=0;this.baseline=baseline;this.durable=structuredClone(baseline);this.active=true;this.closing=false;session.stateWallAt=session.resolvedAt;
   return{roomId,memberId,state:structuredClone(baseline)};
  }catch(error){session.block(error);throw error}finally{this.entering=false;session.busy=false;session.changed()}
 }
 enqueue(action){const result=this.queue.then(action);this.queue=result.catch(()=>{});return result}
 applyCheckpoint(envelope){
  if(!this.active||this.closing)return Promise.reject(Error('房間已結束或尚未準備完成'));
  const incoming=structuredClone(envelope),receivedAt=this.session.now();
  return this.enqueue(async()=>{
   const session=this.session,marker={roomId:incoming?.roomId,memberId:incoming?.memberId,sequence:incoming?.sequence};
   if(!this.active||session.phase!=='room')throw Error('房間工作階段已停止');
   if(!validRoomMarker(marker)||marker.roomId!==this.roomId||marker.memberId!==this.memberId)throw Error('房間或玩家身分不符');
   if(marker.sequence<=this.sequence)return{accepted:false,reason:'stale',sequence:this.sequence};
   const state=incoming.personalWorlds===undefined?incoming.state:restoreRoomState(incoming,this.baseline),checked=validate(state);if(!checked.ok)throw Error('拒絕連線進度：'+checked.errors.join('；'));
   if(state.id!==this.baseline.id)throw Error('連線角色身分不符');
   for(const key of ['worlds','clockMs','elapsedMs','fractionMs','rng'])if(JSON.stringify(state[key])!==JSON.stringify(this.baseline[key]))throw Error('連線進度未還原個人世界：'+key);
   for(const key of ['map','x','y','home'])if(state.player[key]!==this.baseline.player[key])throw Error('連線進度未還原個人位置：'+key);
   try{
    await session.save(state,receivedAt,{operation:'room-checkpoint',room:marker});
    this.durable=structuredClone(state);this.sequence=marker.sequence;session.state=structuredClone(state);session.stateWallAt=session.resolvedAt;session.changed();
    return{accepted:true,sequence:this.sequence};
   }catch(error){session.state=structuredClone(this.durable);session.block(error);throw error}
  });
 }
 finish(){
  if(this.closing)return this.finishing;
  if(!this.active)return Promise.resolve({finished:false});
  this.closing=true;
  this.finishing=this.enqueue(async()=>{
   const session=this.session;if(session.phase!=='room')return{finished:false,reason:'blocked'};
   try{await session.save(this.durable,session.now(),{operation:'room-leave'});session.state=structuredClone(this.durable);session.stateWallAt=session.resolvedAt;session.phase='ready';session.report=null;this.active=false;session.changed();return{finished:true,sequence:this.sequence};}
   catch(error){session.block(error);throw error}
  });
  return this.finishing;
 }
}
