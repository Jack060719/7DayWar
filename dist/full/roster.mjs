import {TradeInteractions} from './trade.mjs';
import {PolymorphInteractions} from './polymorph-interaction.mjs';
import {fieldCampMonsterIds} from './world-camps.mjs';
import {CoopRoom} from './coop-engine.mjs';
import {createGame,validate,stats} from './engine.mjs';
import {LAYOUT_REVISION} from './structures.mjs';

const failure=error=>({ok:false,error,events:[]});
const roomFor=roster=>{const room=CoopRoom.revive(roster.simulation);room.party=structuredClone(roster.party);return room};
const store=(roster,room)=>{roster.simulation=room.serialize()};
export function fromSolo(state){
  const check=validate(state);
  if(!check.ok)throw Error('角色存檔無效：'+check.errors.join('、'));
  const room=new CoopRoom(state.rng,{mode:'local'}),result=room.addMember('member-1',state);
  if(!result.ok)throw Error(result.error);
  return {version:1,selectedId:'member-1',party:{enabled:false,leaderId:null,follow:false},simulation:room.serialize()};
}
export function validateRoster(roster){
  const errors=[],check=(ok,message)=>{if(!ok)errors.push(message)},integer=n=>Number.isSafeInteger(n)&&n>=0;
  try{
    check(roster?.version===1,'角色帳本版本不符');
    const simulation=roster.simulation,rows=simulation.members;
    check(simulation.mode==='local'&&Array.isArray(rows)&&rows.length>=1&&rows.length<=4,'角色帳本人數或模式');
    check(integer(simulation.clockMs)&&Number.isFinite(simulation.fractionMs)&&simulation.fractionMs>=0&&simulation.fractionMs<1,'共享時鐘');
    check([0,.5].includes(simulation.xpFraction),'經驗小數餘量');
    check(integer(simulation.serial)&&integer(simulation.xpCursor)&&integer(simulation.goldCursor)&&simulation.xpCursor<=simulation.serial&&simulation.goldCursor<=simulation.serial,'獎勵游標');
    check(Array.isArray(simulation.contributions)&&Array.isArray(simulation.lastAttack),'參戰紀錄');
    const ids=new Set(rows.map(member=>member.id)),serials=new Set(rows.map(member=>member.serial));
    check(ids.size===rows.length&&serials.size===rows.length&&rows.every(member=>typeof member.id==='string'&&member.id.length>0&&integer(member.serial)&&member.serial>0&&member.serial<=simulation.serial),'角色帳本身分');
    check(ids.has(roster.selectedId),'目前角色不存在');
    check(typeof roster.party?.enabled==='boolean'&&typeof roster.party.follow==='boolean'&&(roster.party.leaderId===null||ids.has(roster.party.leaderId))&&(!roster.party.enabled||ids.has(roster.party.leaderId)),'隊伍設定');
    const monsterIds=new Set(Object.values(simulation.worlds).flatMap(world=>[...world.monsters.map(monster=>monster.id),...fieldCampMonsterIds(world)]));
    for(const [monster,list] of simulation.contributions)check(monsterIds.has(monster)&&Array.isArray(list)&&new Set(list).size===list.length&&list.every(id=>ids.has(id)),'參戰者不存在');
    for(const [monster,id] of simulation.lastAttack)check(monsterIds.has(monster)&&ids.has(id),'最後攻擊者不存在');
    check(new Set(simulation.contributions.map(row=>row[0])).size===simulation.contributions.length&&new Set(simulation.lastAttack.map(row=>row[0])).size===simulation.lastAttack.length,'重複參戰紀錄');
    const interactionContext={members:new Map(rows.map(row=>[row.id,row.state]))};
    if(simulation.interactions){check(TradeInteractions.validate(simulation.interactions.trade,interactionContext),'交易視窗資料');if(simulation.interactions.polymorph)for(const error of PolymorphInteractions.validate(simulation.interactions.polymorph,interactionContext).errors)errors.push(error);}
    const room=roomFor(roster),characterIds=new Set;
    for(const member of rows){
      const state=member.state,inbound=new Map(member.inbound);
      check(inbound.size===member.inbound.length&&new Set(inbound.values()).size===inbound.size&&inbound.get('hero')==='coop-player-'+member.serial&&state.player.id===inbound.get('hero'),'角色別名');
      for(const [original,alias] of inbound)check(original==='hero'||/^(pet|summon|charm)[1-9][0-9]*$/.test(original)&&alias==='coop-'+member.serial+'-'+original,'同伴別名');
      check(state.clockMs===simulation.clockMs&&state.fractionMs===simulation.fractionMs&&state.rng===simulation.rng&&state.nextId===simulation.nextId,'角色與共享時鐘不一致');
      check(state.monsterRevision===1&&state.layoutRevision===LAYOUT_REVISION&&!!state.formProgress,'角色需先完成既有版本遷移');
      check(Object.entries(state.worlds).every(([map,world])=>simulation.worlds[map]&&Object.keys(world).length===1&&Array.isArray(world.ground)),'角色地面物品或共享世界重複');
      const view=room.view(member.id).state,result=validate(view);
      for(const error of result.errors)errors.push(member.id+'：'+error);
      check(!characterIds.has(view.id),'角色存檔身分重複');characterIds.add(view.id);
    }
  }catch{errors.push('角色帳本結構損壞')}
  return {ok:errors.length===0,errors};
}
export function selectedView(roster){return CoopRoom.viewSnapshot(roster.simulation,roster.selectedId).state}
export function roomView(roster){return CoopRoom.viewSnapshot(roster.simulation,roster.selectedId)}
export function memberViews(roster){const room=roomFor(roster);return room.memberIds.map(id=>({id,state:room.view(id).state}))}
export function members(roster){return memberViews(roster).map(({id,state})=>({id,name:state.player.name,classId:state.player.classId,level:state.player.level,map:state.player.map,hp:state.player.hp,maxHp:stats(state).maxHp,autoEnabled:state.auto.enabled,selected:id===roster.selectedId}))}
export function select(roster,memberId){
  if(!roster.simulation.members.some(member=>member.id===memberId))return failure('找不到角色');
  roster.selectedId=memberId;return {ok:true,events:[]};
}
export function createMember(roster,{classId='knight',name='旅人',allocated,seed}={}){
  if(roster.simulation.members.length>=4)return failure('本機最多四名角色');
  try{
    const room=roomFor(roster),serial=roster.simulation.serial+1,memberId='member-'+serial,state=createGame(classId,name,allocated,seed??'local-character-'+serial);
    state.id+='-member-'+serial;
    const result=room.addMember(memberId,state);
    if(result.ok){store(roster,room);return {...result,memberId}}
    return result;
  }catch(error){return failure(error.message)}
}
export function command(roster,action){
  const room=roomFor(roster),result=room.command(roster.selectedId,action);
  if(result.ok){store(roster,room);result.events=room.eventsFor(roster.selectedId,result.events)}
  return result;
}
export function advance(roster,seconds,{offline=false}={}){
  const room=roomFor(roster),result=room.advance(seconds,{offline});store(roster,room);
  return {events:room.eventsFor(roster.selectedId,result.events)};
}
export function replaceSelected(roster,state){
  const room=roomFor(roster),result=room.replaceLocal(roster.selectedId,state);
  if(result.ok)store(roster,room);
  return result;
}
export function configureParty(roster,{enabled,leaderId=roster.selectedId,follow=false}){
  if(typeof enabled!=='boolean'||typeof follow!=='boolean'||!roster.simulation.members.some(member=>member.id===leaderId))return failure('隊伍設定無效');
  roster.party={enabled,leaderId:enabled?leaderId:null,follow:enabled&&follow};return {ok:true,events:[]};
}
