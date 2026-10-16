import {ITEMS,PETS} from './data.mjs';
import {weight,stats,uid,addCount} from './rules.mjs';
import {distance} from './world.mjs';
import {validEnchantment} from './enchantment-policy.mjs';
import {FUSION_SCROLL_BY_ID} from './fusion-policy.mjs';
import {validatePetV4} from './pets-v4.mjs';

const copy=value=>structuredClone(value),fail=error=>({ok:false,error,events:[]});
const integer=(n,min=0)=>Number.isSafeInteger(n)&&n>=min;
const decimal=n=>typeof n==='string'&&/^(0|[1-9]\d*)$/.test(n);
const plain=value=>value&&typeof value==='object'&&!Array.isArray(value);
export const emptyTradeOffer=()=>({gold:0,stacks:{},equipment:[],scrolls:[],petIds:[]});
function validOffer(offer){return plain(offer)&&Object.keys(offer).length===5&&integer(offer.gold)&&plain(offer.stacks)&&Object.entries(offer.stacks).every(([id,n])=>!!ITEMS[id]&&integer(n,1))&&['equipment','scrolls','petIds'].every(key=>Array.isArray(offer[key])&&offer[key].every(id=>typeof id==='string'&&id.length>0)&&new Set(offer[key]).size===offer[key].length);}
export function tradeableItem(item){return !!item&&item.id!=='ITEM-PET-COLLAR'&&item.id!=='ITEM-ADENA'&&item.binding!=='bound'&&(item.tradeable===true||!!item.slot&&item.tradeable!==false);}
export function tradeDistanceError(first,second){
 if(!first||!second||first===second||first.id===second.id)return'交易對象不存在';
 if(first.player.map!==second.player.map||distance(first.player,second.player)>3)return'交易雙方需要在同圖三格內';
 if([first,second].some(s=>s.player.death||s.player.hp<=0||s.player.voyage||s.player.cast))return'死亡、航行或施法中不能交易';
 return null;
}
export function tradeOfferError(s,offer){
 if(s.tradeEscrow)return'請先連回原房主處理暫鎖交易';
 if(!validOffer(offer)||offer.gold>s.player.gold)return'交易金額或內容無效';
 const used=new Set;
 for(const key of ['equipment','scrolls','petIds']){
  if(!Array.isArray(offer[key]))return'交易物品列表無效';
  for(const id of offer[key]){if(typeof id!=='string'||used.has(id))return'交易物品重複';used.add(id);}
 }
 for(const [id,n] of Object.entries(offer.stacks))if(!integer(n,1)||!tradeableItem(ITEMS[id])||ITEMS[id].slot||FUSION_SCROLL_BY_ID[id]||(s.inventory.stacks[id]||0)<n)return'交易物品不可交換或數量不足';
 for(const id of offer.equipment){const e=s.inventory.equipment.find(e=>e.uid===id);if(!e||!tradeableItem(ITEMS[e.itemId])||e.cursed||Object.values(s.equipped).includes(id)||s.fusion.pending?.uids.includes(id))return'裝備不存在、已穿戴、詛咒或已投入融合';}
 for(const id of offer.scrolls){const e=s.inventory.scrolls?.find(e=>e.uid===id);if(!e||!tradeableItem(ITEMS[e.itemId])||s.fusion.pending?.scrollUid===id)return'卷軸不存在或已投入融合';}
 for(const id of offer.petIds){const pet=s.pets.find(p=>p.id===id);if(!pet||pet.active||pet.collarInBag!==true||s.petBreeding?.pending?.parents.some(p=>p.id===id))return'項圈不存在、寵物仍出戰或正在繁殖';}
 return null;
}
const localPetId=id=>typeof id==='string'?id.replace(/^coop-\d+-(pet\d+)$/,'$1'):id;
function assetsFor(s,offer){return{gold:offer.gold,stacks:copy(offer.stacks),equipment:offer.equipment.map(id=>copy(s.inventory.equipment.find(e=>e.uid===id))),scrolls:offer.scrolls.map(id=>copy(s.inventory.scrolls.find(e=>e.uid===id))),pets:offer.petIds.map(id=>{const p=copy(s.pets.find(p=>p.id===id));p.id=localPetId(p.id);return p;})};}
export function tradeAssetWeight(assets){return [...assets.equipment,...assets.scrolls].reduce((n,e)=>n+(ITEMS[e.itemId]?.weight||0),0)+Object.entries(assets.stacks).reduce((n,[id,q])=>n+(ITEMS[id]?.weight||0)*q,0);}
export function tradeLockedWeight(s){return s.tradeEscrow?Math.max(tradeAssetWeight(s.tradeEscrow.outgoing),tradeAssetWeight(s.tradeEscrow.incoming)):0;}
function bagIds(s){const pets=[...s.pets,...(s.petBreeding?.pending?.child?[s.petBreeding.pending.child]:[])];return new Set([s.inventory,s.storage,...pets.filter(p=>p.v4).map(p=>p.v4.bag)].flatMap(b=>[...b.equipment,...(b.scrolls||[])].map(e=>e.uid)).concat(pets.flatMap(p=>[localPetId(p.id),p.collarUid]),Object.values(s.worlds).flatMap(w=>w.ground.flatMap(d=>d.gear?[d.gear.uid]:d.scroll?[d.scroll.uid]:[]))));}
function incomingAssets(source,target,assets){
 const incoming=copy(assets),used=bagIds(target);
 // Solo ground is kept on its phone, so imported assets always get a fresh local UID.
 const reserve=(object,key,prefix)=>{const original=object[key];object.tradeOrigin??={characterId:source.id,identities:{}};object.tradeOrigin.identities[key]??=original;do{object[key]=uid(target,prefix);}while(used.has(object[key]));used.add(object[key]);const serial=/^(?:e|scroll|pet|collar)([1-9]\d*)$/.exec(object[key]);if(serial&&BigInt(serial[1])>=BigInt(target.nextId))target.nextId=(BigInt(serial[1])+1n).toString();};
 for(const e of incoming.equipment)reserve(e,'uid','e');for(const e of incoming.scrolls)reserve(e,'uid','scroll');
 for(const pet of incoming.pets){reserve(pet,'id','pet');reserve(pet,'collarUid','collar');pet.tradeOrigin??={characterId:source.id,identities:{}};pet.tradeOrigin.sourceId??=pet.sourceId;pet.sourceId='trade:'+source.id+':'+pet.sourceId;pet.active=false;pet.path=[];pet.targetId=null;pet.effects=[];pet.map=target.player.map;pet.x=target.player.x;pet.y=target.player.y;if(pet.v4)for(const e of pet.v4.bag.equipment)reserve(e,'uid','e');if(pet.v4)for(const e of pet.v4.bag.scrolls)reserve(e,'uid','scroll');}
 return incoming;
}
function removeAssets(s,assets){s.player.gold-=assets.gold;for(const [id,n] of Object.entries(assets.stacks))addCount(s.inventory,id,-n);s.inventory.equipment=s.inventory.equipment.filter(e=>!assets.equipment.some(a=>a.uid===e.uid));s.inventory.scrolls=(s.inventory.scrolls||[]).filter(e=>!assets.scrolls.some(a=>a.uid===e.uid));s.pets=s.pets.filter(p=>!assets.pets.some(a=>a.id===localPetId(p.id)));}
function addAssets(s,assets){s.player.gold+=assets.gold;for(const [id,n] of Object.entries(assets.stacks))addCount(s.inventory,id,n);s.inventory.equipment.push(...copy(assets.equipment));(s.inventory.scrolls??=[]).push(...copy(assets.scrolls));for(const pet of copy(assets.pets)){pet.active=false;pet.map=s.player.map;pet.x=s.player.x;pet.y=s.player.y;pet.foodAt=s.clockMs+60000;pet.mpRegenAt=s.clockMs+8000;if(pet.v4)pet.v4At=s.clockMs;s.pets.push(pet);}}
export function prepareTrade(coordinator,first,second,firstOffer,secondOffer){
 const error=tradeDistanceError(first,second)||tradeOfferError(first,firstOffer)||tradeOfferError(second,secondOffer);if(error)return fail(error);
 if(coordinator.tradeCoordinator?.transactions.some(t=>t.decision==='prepared'))return fail('房間還有交易正在保存');
 const outgoing=[assetsFor(first,firstOffer),assetsFor(second,secondOffer)];
 for(const [index,s] of [first,second].entries()){
  if(weight(s).total-tradeAssetWeight(outgoing[index])+tradeAssetWeight(outgoing[1-index])>stats(s).carry)return fail('對方或自己的背包負重不足');
  if(!integer(s.player.gold-outgoing[index].gold+outgoing[1-index].gold))return fail('交易金額超過可保存範圍');
  for(const [id,n] of Object.entries(outgoing[1-index].stacks))if(!integer((s.inventory.stacks[id]||0)-(outgoing[index].stacks[id]||0)+n))return fail('交易物品數量超過可保存範圍');
 }
 const ledger=coordinator.tradeCoordinator??={version:1,next:'1',transactions:[]},id=coordinator.id+':trade:'+ledger.next;
 const incoming=[incomingAssets(second,first,outgoing[1]),incomingAssets(first,second,outgoing[0])];
 const parties=[first,second].map((s,index)=>({characterId:s.id,done:false,escrow:{version:1,id,coordinatorId:coordinator.id,coordinatorName:coordinator.player.name,characterId:s.id,peerId:[first,second][1-index].id,outgoing:outgoing[index],incoming:incoming[index]}}));
 for(const [index,s] of [first,second].entries()){removeAssets(s,outgoing[index]);s.tradeEscrow=copy(parties[index].escrow);}
 ledger.transactions.push({id,decision:'prepared',parties});ledger.next=(BigInt(ledger.next)+1n).toString();
 return{ok:true,transactionId:id,tradePrepared:true,events:[]};
}
export function decideTrade(coordinator,id,decision){
 if(!['commit','abort'].includes(decision))return fail('交易決定無效');const transaction=coordinator.tradeCoordinator?.transactions.find(t=>t.id===id);
 if(!transaction)return fail('找不到原房主的交易紀錄');
 if(transaction.decision!=='prepared'&&transaction.decision!==decision)return fail('已保存的交易決定不能更改');
 transaction.decision=decision;return{ok:true,transactionId:id,decision,events:[]};
}
export function settleTrade(s,coordinator,id){
 const transaction=coordinator.tradeCoordinator?.transactions.find(t=>t.id===id),party=transaction?.parties.find(p=>p.characterId===s.id);
 if(!party||!['commit','abort'].includes(transaction.decision))return fail('交易尚未有原房主的保存決定');
 if(!s.tradeEscrow){if(s.tradeReceipts?.some(r=>r.id===id&&r.decision===transaction.decision))return{ok:true,duplicate:true,events:[]};return fail('找不到這名角色的暫鎖交易');}
 if(s.tradeEscrow.id!==id||s.tradeEscrow.coordinatorId!==coordinator.id||JSON.stringify(s.tradeEscrow)!==JSON.stringify(party.escrow))return fail('暫鎖交易與原房主紀錄不符');
 const assets=transaction.decision==='commit'?s.tradeEscrow.incoming:s.tradeEscrow.outgoing;
 if(!integer(s.player.gold+assets.gold)||Object.entries(assets.stacks).some(([id,n])=>!integer((s.inventory.stacks[id]||0)+n)))return fail('交易結果超過可保存數量，原物品仍暫鎖');
 const owned=bagIds(s);if([...assets.equipment,...assets.scrolls].some(e=>owned.has(e.uid))||assets.pets.some(p=>owned.has(p.id)||owned.has(p.collarUid)))return fail('交易物品身分與背包衝突，原物品仍暫鎖');
 // Pending assets reserve their heavier side, so normal play cannot consume
 // the space needed either to finish the exchange or to return the originals.
 addAssets(s,assets);delete s.tradeEscrow;(s.tradeReceipts??=[]).push({id,coordinatorId:coordinator.id,decision:transaction.decision});
 return{ok:true,transactionId:id,decision:transaction.decision,events:[]};
}
export function acknowledgeTrade(coordinator,id,characterId){const tx=coordinator.tradeCoordinator?.transactions.find(t=>t.id===id),party=tx?.parties.find(p=>p.characterId===characterId);if(!party||tx.decision==='prepared')return false;party.done=true;if(tx.parties.every(p=>p.done))for(const p of tx.parties)delete p.escrow;return true;}
function validAssets(assets){
 if(!plain(assets)||!integer(assets.gold)||!plain(assets.stacks)||!['equipment','scrolls','pets'].every(k=>Array.isArray(assets[k])))return false;
 const ids=new Set,unique=id=>typeof id==='string'&&id.length>0&&!ids.has(id)&&!!ids.add(id);
 if(!Object.entries(assets.stacks).every(([id,n])=>tradeableItem(ITEMS[id])&&!ITEMS[id].slot&&!FUSION_SCROLL_BY_ID[id]&&integer(n,1)))return false;
 for(const e of assets.equipment)if(!e||!unique(e.uid)||!tradeableItem(ITEMS[e.itemId])||!ITEMS[e.itemId].slot||!integer(e.plus)||!integer(e.durability)||typeof e.identified!=='boolean'||typeof e.cursed!=='boolean'||!validEnchantment(e.enchantment,ITEMS[e.itemId]))return false;
 for(const e of assets.scrolls)if(!e||!unique(e.uid)||!FUSION_SCROLL_BY_ID[e.itemId]||typeof e.identified!=='boolean')return false;
 for(const p of assets.pets)if(!p||!unique(p.id)||!unique(p.collarUid)||!PETS[p.type]||p.active!==false||p.collarInBag!==true||!integer(p.level,1)||!decimal(p.xp)||!integer(p.hp)||!integer(p.mp)||p.v4&&!validatePetV4(p).ok||(p.aptitudes===undefined&&p.v4?false:!p.aptitudes||!['hp','attack','defense','speed'].every(k=>integer(p.aptitudes[k],k==='speed'?90:80)&&p.aptitudes[k]<=(k==='speed'?110:120))))return false;
 return true;
}
function validEscrow(e){return plain(e)&&e.version===1&&['id','coordinatorId','coordinatorName','characterId','peerId'].every(k=>typeof e[k]==='string'&&e[k].length>0)&&e.id.startsWith(e.coordinatorId+':trade:')&&e.characterId!==e.peerId&&validAssets(e.outgoing)&&validAssets(e.incoming);}
export function validTradeView(view,members,viewerId){
 if(view===undefined||view===null)return true;
 if(!plain(view)||!Array.isArray(view.targets)||view.targets.length>9||!view.targets.every(t=>t&&members.has(t.memberId)&&t.memberId!==viewerId&&typeof t.name==='string'))return false;
 const t=view.open;if(t===null)return true;
 return !!t&&integer(t.revision,1)&&typeof t.id==='string'&&t.selfId===viewerId&&Array.isArray(t.members)&&t.members.length===2&&new Set(t.members).size===2&&t.members.includes(viewerId)&&t.members.every(id=>members.has(id)&&typeof t.names?.[id]==='string'&&validOffer(t.offers?.[id])&&(t.assets?.[id]===null||validAssets(t.assets?.[id])))&&Array.isArray(t.accepted)&&new Set(t.accepted).size===t.accepted.length&&t.accepted.every(id=>t.members.includes(id));
}
export function validateTradeState(s){
 const errors=[];
 if(s.tradeEscrow!==undefined&&(!validEscrow(s.tradeEscrow)||s.tradeEscrow.characterId!==s.id))errors.push('暫鎖交易格式或角色不符');
 if(s.tradeReceipts!==undefined){const ids=new Set;if(!Array.isArray(s.tradeReceipts))errors.push('交易收據無效');else for(const r of s.tradeReceipts)if(!r||typeof r.id!=='string'||ids.has(r.id)||typeof r.coordinatorId!=='string'||!r.id.startsWith(r.coordinatorId+':trade:')||!['commit','abort'].includes(r.decision))errors.push('交易收據無效');else ids.add(r.id);}
 const l=s.tradeCoordinator;
 if(l!==undefined){if(!l||l.version!==1||!decimal(l.next)||!Array.isArray(l.transactions))errors.push('房主交易帳本無效');else{
  const ids=new Set;let prepared=0;
  for(const tx of l.transactions){const serial=typeof tx?.id==='string'&&tx.id.startsWith(s.id+':trade:')?tx.id.slice((s.id+':trade:').length):null;
   if(!decimal(serial)||serial==='0'||BigInt(serial)>=BigInt(l.next)||ids.has(tx?.id)||!['prepared','commit','abort'].includes(tx?.decision)||!Array.isArray(tx.parties)||tx.parties.length!==2||tx.parties[0].characterId===tx.parties[1].characterId){errors.push('房主交易紀錄無效');continue;}ids.add(tx.id);if(tx.decision==='prepared')prepared++;
   for(const party of tx.parties)if(typeof party.characterId!=='string'||typeof party.done!=='boolean'||!party.done&&!validEscrow(party.escrow)||party.escrow&&(party.escrow.id!==tx.id||party.escrow.characterId!==party.characterId))errors.push('房主交易參與者無效');
  }
  if(prepared>1||BigInt(l.next)!==BigInt(l.transactions.length)+1n)errors.push('房主交易序號不連續');
 }}
 return{ok:!errors.length,errors};
}

// Offers and confirmations have no financial effect. Only both confirmations
// of the same revision can create escrow; the controller persists the decision.
export class TradeInteractions{
 constructor(snapshot={next:'1',open:[]}){this.state=copy(snapshot);}
 serialize(){return copy(this.state);}
 static validate(snapshot,ctx){
  if(snapshot===undefined)return true;
  if(!snapshot||!decimal(snapshot.next)||snapshot.next==='0'||!Array.isArray(snapshot.open)||snapshot.open.length>5)return false;
  const ids=new Set,participants=new Set;
  for(const t of snapshot.open){if(!t||typeof t.id!=='string'||ids.has(t.id)||!integer(t.revision,1)||!Array.isArray(t.members)||t.members.length!==2||t.members[0]===t.members[1]||!plain(t.offers)||!Array.isArray(t.accepted)||new Set(t.accepted).size!==t.accepted.length||t.accepted.some(id=>!t.members.includes(id)))return false;ids.add(t.id);
   const serial=/^offer-([1-9]\d*)$/.exec(t.id);if(!serial||BigInt(serial[1])>=BigInt(snapshot.next)||Object.keys(t.offers).length!==2)return false;
   for(const id of t.members){if(typeof id!=='string'||participants.has(id)||ctx&&!ctx.members.has(id)||!validOffer(t.offers[id]))return false;participants.add(id);}
  }
  return true;
 }
 prune(ctx){this.state.open=this.state.open.filter(t=>!tradeDistanceError(...t.members.map(id=>ctx.members.get(id)))&&t.members.every(id=>!tradeOfferError(ctx.members.get(id),t.offers[id])));}
 handle(ctx,memberId,action){
  if(!['inviteTrade','offerTrade','confirmTrade','cancelTrade'].includes(action.type))return null;
  const s=ctx.members.get(memberId);if(!s)return fail('找不到交易角色');
  if(action.type==='inviteTrade'){
   const target=ctx.members.get(action.targetMemberId),error=tradeDistanceError(s,target);if(error)return fail(error);
   if(s.tradeEscrow||target.tradeEscrow)return fail('請先處理暫鎖交易');
   if(this.state.open.some(t=>t.members.includes(memberId)||t.members.includes(action.targetMemberId)))return fail('其中一方已有交易視窗');
   const id='offer-'+this.state.next;this.state.next=(BigInt(this.state.next)+1n).toString();this.state.open.push({id,revision:1,members:[memberId,action.targetMemberId],offers:{[memberId]:emptyTradeOffer(),[action.targetMemberId]:emptyTradeOffer()},accepted:[]});return{ok:true,tradeId:id,events:[]};
  }
  const t=this.state.open.find(t=>t.id===action.tradeId&&t.members.includes(memberId));if(!t)return fail('交易已取消或不存在');
  if(action.type==='cancelTrade'){this.state.open=this.state.open.filter(row=>row!==t);return{ok:true,events:[]};}
  if(action.revision!==t.revision)return fail('交易內容已更動，請重新查看雙方物品');
  const members=t.members.map(id=>ctx.members.get(id)),distanceError=tradeDistanceError(...members);if(distanceError)return fail(distanceError);
  if(action.type==='offerTrade'){
   const error=tradeOfferError(s,action.offer);if(error)return fail(error);
   if(!Number.isSafeInteger(t.revision+1))return fail('請重新開啟交易視窗');
   t.offers[memberId]=copy(action.offer);t.accepted=[];t.revision++;return{ok:true,revision:t.revision,events:[]};
  }
  for(const id of t.members){const error=tradeOfferError(ctx.members.get(id),t.offers[id]);if(error)return fail(error);}
  if(!t.accepted.includes(memberId))t.accepted.push(memberId);
  if(t.accepted.length!==2)return{ok:true,waiting:true,events:[]};
  const coordinator=ctx.members.get(ctx.coordinatorMemberId),result=prepareTrade(coordinator,...members,...t.members.map(id=>t.offers[id]));
  if(!result.ok){t.accepted=[];return result;}
  this.state.open=this.state.open.filter(row=>row!==t);
  if(ctx.mode==='local'){
   decideTrade(coordinator,result.transactionId,'commit');
   for(const state of members){const settled=settleTrade(state,coordinator,result.transactionId);if(!settled.ok)return settled;acknowledgeTrade(coordinator,result.transactionId,state.id);}
   return{ok:true,transactionId:result.transactionId,tradeCommitted:true,events:[]};
  }
  return{...result,tradeMembers:[...t.members]};
 }
 view(ctx,memberId){
  const own=ctx.members.get(memberId);if(!own)return{open:null,targets:[]};
  const t=this.state.open.find(t=>t.members.includes(memberId)),open=t?copy(t):null;
  if(open){open.selfId=memberId;open.names=Object.fromEntries(t.members.map(id=>[id,ctx.members.get(id)?.player.name||'角色']));open.assets=Object.fromEntries(t.members.map(id=>[id,tradeOfferError(ctx.members.get(id),t.offers[id])?null:assetsFor(ctx.members.get(id),t.offers[id])]));}
  return{open,targets:[...ctx.members].filter(([id,state])=>id!==memberId&&!tradeDistanceError(own,state)&&!own.tradeEscrow&&!state.tradeEscrow).map(([id,state])=>({memberId:id,name:state.player.name}))};
 }
}
