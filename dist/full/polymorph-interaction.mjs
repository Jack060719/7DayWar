import {skillBehavior} from './skill-mastery.mjs';
import {formDefinition,formCollection,canUseForm} from './form-progress.mjs';
import {distance,geometry,lineOfSight} from './world.mjs';
const SKILL='SKILL-G09-03',fail=error=>({ok:false,error});
const decimal=value=>typeof value==='string'&&/^[1-9]\d*$/.test(value);
const empty=()=>({version:1,next:'1',pending:[],grants:[]});
function problem(ctx,row){
 const caster=ctx.members.get(row.casterMemberId),target=ctx.members.get(row.targetMemberId),p=caster?.player,t=target?.player;
 if(!p||!t||row.casterMemberId===row.targetMemberId)return'邀請只接受另一名玩家';
 if(p.hp<=0||t.hp<=0||p.death||t.death||p.voyage||t.voyage)return'玩家目前無法接受變身';
 const b=skillBehavior(caster,SKILL);if(!p.skills.includes(SKILL)||!b.classMinLevels[p.classId]||p.level<b.classMinLevels[p.classId])return'施法者尚不能使用變形術';
 if(p.map!==t.map||p.map!==row.mapId||distance(p,t)>b.range||b.requiresLineOfSight&&!lineOfSight(geometry(p.map),p,t))return'目標已離開施法範圍或視線';
 if(!canUseForm(target,row.formId))return'目標尚不能使用這個形態';
 return null;
}
export class PolymorphInteractions{
 constructor(snapshot=empty()){const result=PolymorphInteractions.validate(snapshot);if(!result.ok)throw Error(result.errors.join('；'));this.state=structuredClone(snapshot)}
 static validate(snapshot,ctx){
  const errors=[],s=snapshot,check=(ok,message)=>{if(!ok)errors.push(message)};
  if(!s||typeof s!=='object'||Array.isArray(s)||s.version!==1||!decimal(s.next)||!Array.isArray(s.pending)||!Array.isArray(s.grants))return{ok:false,errors:['變身邀請格式無效']};
  check(!Object.keys(s).some(k=>!['version','next','pending','grants'].includes(k)),'未知變身邀請欄位');check(s.pending.length<=10&&s.grants.length<=10,'變身邀請過多');
  const ids=new Set;
  for(const[list,casting]of[[s.pending,false],[s.grants,true]]){const casters=new Set;for(const row of list){
   if(!row||typeof row!=='object'||Array.isArray(row)){errors.push('變身邀請內容無效');continue}
   const sequence=typeof row.id==='string'&&/^poly-[1-9]\d*$/.test(row.id)?row.id.slice(5):null;
   check(!!sequence&&BigInt(sequence)<BigInt(s.next)&&!ids.has(row.id),'變身邀請編號無效或重複');ids.add(row.id);
   check(typeof row.casterMemberId==='string'&&row.casterMemberId.length>0&&typeof row.targetMemberId==='string'&&row.targetMemberId.length>0&&row.casterMemberId!==row.targetMemberId&&!casters.has(row.casterMemberId),'變身邀請玩家無效');casters.add(row.casterMemberId);
   check(typeof row.mapId==='string'&&!!formDefinition(row.formId)&&Number.isSafeInteger(row.createdAt)&&row.createdAt>=0,'變身邀請形態或時間無效');
   const keys=['id','casterMemberId','targetMemberId','formId','mapId','createdAt',...(casting?['status','endAt']:[])];check(!Object.keys(row).some(k=>!keys.includes(k)),'未知變身邀請內容');
   if(casting)check(['accepted','casting'].includes(row.status)&&Number.isSafeInteger(row.endAt)&&row.endAt>=row.createdAt,'變身同意狀態無效');
   if(ctx)check(ctx.members.has(row.casterMemberId)&&ctx.members.has(row.targetMemberId),'變身邀請玩家不存在');
  }}
  return{ok:!errors.length,errors};
 }
 serialize(){return structuredClone(this.state)}
 prune(ctx){
  this.state.pending=this.state.pending.filter(row=>!problem(ctx,row));
  this.state.grants=this.state.grants.filter(row=>!problem(ctx,row)&&(row.status==='casting'?ctx.members.get(row.casterMemberId)?.player.cast?.polymorphInvitationId===row.id:row.endAt>=ctx.clockMs));
 }
 invite(ctx,casterMemberId,{targetMemberId,formId}={}){
  this.prune(ctx);const caster=ctx.members.get(casterMemberId),row={casterMemberId,targetMemberId,formId:formDefinition(formId)?.id||formId,mapId:caster?.player.map,createdAt:ctx.clockMs},error=problem(ctx,row);if(error)return fail(error);
  if(caster.player.cast||this.state.grants.some(g=>g.casterMemberId===casterMemberId))return fail('請先完成目前施法');
  const prior=this.state.pending.find(r=>r.casterMemberId===casterMemberId);if(prior?.targetMemberId===targetMemberId&&prior.formId===row.formId)return{ok:true,duplicate:true,invitation:structuredClone(prior)};
  this.state.pending=this.state.pending.filter(r=>r.casterMemberId!==casterMemberId);row.id='poly-'+this.state.next;this.state.next=(BigInt(this.state.next)+1n).toString();this.state.pending.push(row);return{ok:true,invitation:structuredClone(row)};
 }
 answer(ctx,targetMemberId,{invitationId,accept}={}){
  this.prune(ctx);const row=this.state.pending.find(r=>r.id===invitationId);if(!row||row.targetMemberId!==targetMemberId||typeof accept!=='boolean')return fail('邀請已失效，或不是由目標玩家回覆');
  this.state.pending=this.state.pending.filter(r=>r!==row);if(!accept)return{ok:true,declined:true};
  const caster=ctx.members.get(row.casterMemberId),target=ctx.members.get(row.targetMemberId),b=skillBehavior(caster,SKILL);
  this.state.grants.push({...row,status:'accepted',endAt:ctx.clockMs+Math.round(b.castSeconds*1000)});
  return{ok:true,casterMemberId:row.casterMemberId,action:{type:'skill',skillId:SKILL,targetId:target.player.id,formId:row.formId,polymorphInvitationId:row.id}};
 }
 afterCast(invitationId,ok){const grant=this.state.grants.find(r=>r.id===invitationId);if(!grant)return;if(ok)grant.status='casting';else this.state.grants=this.state.grants.filter(r=>r!==grant)}
 resolve(ctx,casterMemberId,command){
  const row=this.state.grants.find(r=>r.id===command.polymorphInvitationId&&r.casterMemberId===casterMemberId);if(!row||command.skillId!==SKILL||row.formId!==formDefinition(command.formId)?.id||problem(ctx,row))return null;
  const target=ctx.members.get(row.targetMemberId).player;if(target.id!==command.targetId)return null;
  return{target,consumerId:formDefinition(row.formId).renderConsumerId};
 }
 view(ctx,viewerId){
  const describe=row=>({...row,casterName:ctx.members.get(row.casterMemberId)?.player.name||'',targetName:ctx.members.get(row.targetMemberId)?.player.name||'',formName:formDefinition(row.formId)?.name_zh||row.formId});
  const pending=this.state.pending.filter(row=>!problem(ctx,row)),viewer=ctx.members.get(viewerId),targets=[];
  if(viewer)for(const[memberId,state]of ctx.members){if(memberId===viewerId)continue;const forms=formCollection(state).filter(form=>form.eligible&&!problem(ctx,{casterMemberId:viewerId,targetMemberId:memberId,formId:form.id,mapId:viewer.player.map})).map(form=>({id:form.id,name:form.name_zh}));if(forms.length)targets.push({memberId,actorId:state.player.id,name:state.player.name,forms})}
  return{incoming:pending.filter(row=>row.targetMemberId===viewerId).map(describe),outgoing:pending.filter(row=>row.casterMemberId===viewerId).map(describe),targets};
 }
}

// Validate only the serialized presentation contract; authority stays in the
// host's private interaction ledger and is checked again when answering.
export function validPolymorphView(view,membersSet,viewerId){
 try{
  if(!view||typeof view!=='object'||Array.isArray(view)||!membersSet?.has(viewerId)||!['incoming','outgoing','targets'].every(key=>Array.isArray(view[key])))return false;
  const member=id=>typeof id==='string'&&membersSet.has(id),text=value=>typeof value==='string';
  const invitation=(row,incoming)=>!!row&&typeof row==='object'&&!Array.isArray(row)&&/^poly-[1-9]\d*$/.test(row.id)&&member(row.casterMemberId)&&member(row.targetMemberId)&&row.casterMemberId!==row.targetMemberId&&(incoming?row.targetMemberId===viewerId:row.casterMemberId===viewerId)&&!!formDefinition(row.formId)&&text(row.mapId)&&Number.isSafeInteger(row.createdAt)&&row.createdAt>=0&&text(row.casterName)&&text(row.targetName)&&text(row.formName);
  return view.incoming.every(row=>invitation(row,true))&&view.outgoing.every(row=>invitation(row,false))&&view.targets.every(row=>!!row&&typeof row==='object'&&!Array.isArray(row)&&member(row.memberId)&&row.memberId!==viewerId&&text(row.actorId)&&row.actorId.length>0&&text(row.name)&&Array.isArray(row.forms)&&row.forms.every(form=>!!form&&typeof form==='object'&&!Array.isArray(form)&&!!formDefinition(form.id)&&text(form.name)));
 }catch{return false}
}
