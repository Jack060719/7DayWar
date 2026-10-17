import {TradeInteractions,decideTrade,settleTrade,acknowledgeTrade} from './trade.mjs';
import {PolymorphInteractions} from './polymorph-interaction.mjs';
import {setSkillPolymorphResolver} from './skills.mjs';
import {createGame,ensureWorld,command as engineCommand,cooperativeEngine,validate,stats} from './engine.mjs';
import {geometry,nearestWalkable,distance,walkable} from './world.mjs';
import {monsterDefinition} from './silver-monsters.mjs';
import {roll,random} from './rules.mjs';
import {rewardExperience} from './trial-rewards.mjs';
import {enableFieldCamps} from './world-camps.mjs';
import {visibleCell} from './silver-camps.mjs';

const failure=error=>({ok:false,error,events:[]});
const timerKeys=new Set(['started','until','tickAt','attackAt','moveAt','nextAI','regenAt','foodAt','mpRegenAt','magicAt','lastActionAt','lastHitAt','lastCombatAt','reviveAt','endAt','drownAt','pathAt','reviewAt','nextTrigger','expiresAt','resupplyAt','enchantParalyzeAt','v4At']);
function shiftTimers(value,delta){
  if(!value||typeof value!=='object')return;
  for(const [key,item] of Object.entries(value)){
    if(typeof item==='number'&&Number.isFinite(item)&&timerKeys.has(key))value[key]=key==='lastActionAt'?Math.max(-8000,item+delta):['lastHitAt','lastCombatAt','v4At'].includes(key)?item+delta:Math.max(0,item+delta);
    else if(['cooldowns','lastByAttacker','abilityAt'].includes(key)&&item&&typeof item==='object'){
      for(const name of Object.keys(item))if(Number.isFinite(item[name]))item[name]=Math.max(0,item[name]+delta);
    }else if(item&&typeof item==='object')shiftTimers(item,delta);
  }
}
const actorIdKeys=new Set(['id','targetId','actorId','sourceId','petId','sourceActorId','targetActorId','lastAttackerId','companions','petIds','parents','firstId','secondId']);
function remap(value,ids,field=''){
  if(['tradeEscrow','tradeCoordinator','tradeOrigin'].includes(field))return structuredClone(value);
  if(typeof value==='string')return actorIdKeys.has(field)?ids.get(value)||value:value;
  if(Array.isArray(value))return value.map(item=>remap(item,ids,field));
  if(!value||typeof value!=='object')return value;
  if(field==='dormant')return Object.fromEntries(Object.entries(value).map(([id,packed])=>[id,typeof packed==='string'?[...ids.keys()].some(key=>packed.includes(JSON.stringify(key)))?JSON.stringify(remap(JSON.parse(packed),ids)):packed:remap(packed,ids)]));
  return Object.fromEntries(Object.entries(value).map(([key,item])=>[field==='lastByAttacker'?ids.get(key)||key:key,remap(item,ids,key)]));
}
function cloneWorlds(worlds){
 return Object.fromEntries(Object.entries(worlds).map(([id,world])=>{
  const ledger=world.fieldCamps,dormant=ledger?.dormant,copy=structuredClone({...world,...(dormant?{fieldCamps:{...ledger,dormant:undefined}}:{})});
  if(dormant)copy.fieldCamps.dormant=Object.fromEntries(Object.entries(dormant).map(([key,value])=>[key,typeof value==='string'?value:structuredClone(value)]));
  return [id,copy];
 }));
}
function stopActor(actor){
  actor.path=[];
  actor.targetId=null;
  actor.cast=null;
  delete actor.pathGoal;
  delete actor.lastAttackerId;
  delete actor.monsterCast;
}

export function createRoom(seed=1){return new CoopRoom(seed)}
export class CoopRoom{
  #members=new Map;
  #worlds={};
  #serial=0;
  #contributions=new Map;
  #xpCursor=0;
  #xpFraction=0;
  #goldCursor=0;
  #lastAttack=new Map;
  #spawn=null;
  #context;
  #monsterWorld=new WeakMap;
  #trades=new TradeInteractions;
  #polymorph=new PolymorphInteractions;
  constructor(seed=1,{mode='family'}={}){
    this.mode=mode;
    this.party={enabled:mode==='family',leaderId:null,follow:false};
    const initial=createGame('knight','Room',undefined,seed);
    this.clockMs=0;
    this.fractionMs=0;
    this.rng=initial.rng;
    this.nextId=initial.nextId;
    this.seed=String(seed);
    this.#context={
      atomicCommands:true,
      ensureWorld:(state,mapId)=>this.#ensureWorld(state,mapId),
      registerWorld:world=>{for(const monster of world.monsters)this.#monsterWorld.set(monster,world)},
      prepareCamps:mapId=>{const world=this.#worlds[mapId];enableFieldCamps(world);for(const {state} of this.#members.values())if(state.worlds[mapId])state.worlds[mapId]=this.#wrap(world,state.worlds[mapId].ground)},
      owner:actor=>this.#owner(actor),
      actor:id=>this.#actors().find(actor=>actor.id===id),
      actors:mapId=>this.#actors().filter(actor=>actor.map===mapId),
      allies:state=>this.party.enabled?this.#actors().filter(actor=>actor.map===state.player.map):[state.player,...state.pets,...state.summons],
      leader:state=>{const leader=this.party.enabled&&this.party.follow?this.#members.get(this.party.leaderId)?.state.player:null;return leader&&leader!==state.player&&!leader.death?leader:null},
      healingTargets:state=>{
        if(!this.party.enabled)return [];
        const participants=new Set([...this.#contributions].filter(([id])=>this.#worlds[state.player.map]?.monsters.some(m=>m.id===id&&m.hp>0)).flatMap(([,set])=>[...set]));
        return [...this.#members].filter(([id,member])=>participants.has(id)&&member.state.player.map===state.player.map&&!member.state.player.death&&member.state.player.hp>0&&member.state.player.hp<stats(member.state).maxHp).sort((a,b)=>a[1].state.player.hp/stats(a[1].state).maxHp-b[1].state.player.hp/stats(b[1].state).maxHp).map(([,member])=>member.state.player);
      },
      players:mapId=>[...this.#members.values()].map(member=>member.state.player).filter(player=>player.map===mapId),
      combatState:(mapId,monster)=>{
        const target=this.#actors().find(actor=>actor.id===monster.targetId&&actor.hp>0&&actor.map===mapId);
        if(target)return this.#owner(target);
        const candidates=[...this.#members.values()].map(member=>member.state).filter(state=>state.player.map===mapId&&!state.player.death&&!state.player.voyage&&state.player.hp>0);
        candidates.sort((a,b)=>distance(a.player,monster)-distance(b.player,monster));
        return candidates[0];
      },
      engage:actor=>this.#engage(actor),
      power:actor=>this.mode==='family'&&this.#isMonster(actor)?actor.roomCombat?.factor||1:1,
      participate:(target,sourceId)=>{
        const memberId=this.#actorMember(sourceId);
        if(memberId===null||!this.#isMonster(target))return;
        this.#engage(target);
        if(!this.#contributions.has(target.id))this.#contributions.set(target.id,new Set);
        this.#contributions.get(target.id).add(memberId);
        this.#lastAttack.set(target.id,memberId);
      },
      support:(target,sourceId)=>{
        const targetMember=this.#actorMember(target.id),healer=this.#actorMember(sourceId);
        if(targetMember===null||healer===null)return;
        for(const participants of this.#contributions.values())if(participants.has(targetMember))participants.add(healer);
      },
      reward:(source,monster,events,award)=>{
        const mapId=source.player.map,participants=this.#contributions.get(monster.id)||new Set;
        const members=[...this.#members].filter(([id])=>participants.has(id)&&(this.party.enabled||id===this.#lastAttack.get(monster.id))),groundIds=[],pool=[];
        const definition=monsterDefinition(monster),boss=definition.boss,multiplier=this.mode==='family'?monster.roomCombat?.factor||1:1;
        const eliteUnlock=monster.elite?random(this)<.02:false;
        const exactXP=rewardExperience(monster)*multiplier+this.#xpFraction,totalXP=Math.floor(exactXP);
        if(members.length)this.#xpFraction=exactXP-totalXP;
        const shares=this.#shares(totalXP,members,'xp');
        for(let i=0;i<members.length;i++){
          const [id,member]=members[i];
          this.#ensureWorld(member.state,mapId);
          this.#run(member.state,(state,local)=>award(state,monster,local,mapId,{exp:shares.get(id),rollDrops:i===0,multiplier,eliteUnlock,drop:payload=>pool.push(payload)}),events);
        }
        const grant=(member,payload)=>groundIds.push(cooperativeEngine.grantDrop(member.state,payload,monster,mapId).id);
        if(boss&&members.length){
          const gold=pool.filter(drop=>drop.itemId==='ITEM-ADENA'),total=Math.max(members.length,gold.reduce((n,drop)=>n+drop.count,0));
          const goldShares=this.#shares(total,members,'gold'),expiresAt=gold[0]?.expiresAt||this.clockMs+300000;
          for(const [id,member] of members)grant(member,{itemId:'ITEM-ADENA',count:goldShares.get(id),expiresAt});
        }
        for(const payload of pool)if(!boss||payload.itemId!=='ITEM-ADENA')grant(members[members.length===1?0:roll(this,0,members.length-1)][1],payload);
        this.#contributions.delete(monster.id);
        this.#lastAttack.delete(monster.id);
        return groundIds;
      }
    };
  }
  get memberIds(){return [...this.#members.keys()]}
  #interactionContext(){return {members:new Map([...this.#members].map(([id,m])=>[id,m.state])),clockMs:this.clockMs,mode:this.mode,coordinatorMemberId:this.mode==='family'?'host':this.memberIds[0]}}
  #pruneInteractions(){const ctx=this.#interactionContext();this.#trades.prune(ctx);this.#polymorph.prune(ctx)}
  get tradeTransactions(){return structuredClone(this.#interactionContext().members.get(this.#interactionContext().coordinatorMemberId)?.tradeCoordinator?.transactions||[])}
  tradeParticipantIds(id){const tx=this.tradeTransactions.find(t=>t.id===id);return this.memberIds.filter(memberId=>tx?.parties.some(p=>p.characterId===this.#members.get(memberId).state.id))}
  tradeDecision(id,decision){const ctx=this.#interactionContext();return decideTrade(ctx.members.get(ctx.coordinatorMemberId),id,decision)}
  tradeSettle(id,memberId){const ctx=this.#interactionContext(),state=ctx.members.get(memberId);if(!state)return failure('交易角色已離房');const result=settleTrade(state,ctx.members.get(ctx.coordinatorMemberId),id);if(result.ok)this.#normalizePetAliases(memberId);return result}
  #normalizePetAliases(memberId){const member=this.#members.get(memberId),state=member.state;for(let i=0;i<state.pets.length;i++){const pet=state.pets[i];if([...member.inbound.values()].includes(pet.id))continue;const alias='coop-'+member.serial+'-'+pet.id;member.inbound.set(pet.id,alias);state.pets[i]=remap(pet,new Map([[pet.id,alias]]));}}
  tradeAcknowledge(id,memberId){const ctx=this.#interactionContext(),state=ctx.members.get(memberId);return !!state&&acknowledgeTrade(ctx.members.get(ctx.coordinatorMemberId),id,state.id)}
  tradeCharacterId(memberId){return this.#members.get(memberId)?.state.id||null}

  #isMonster(actor){if(!actor||actor.captured||this.#owner(actor))return false;if(!this.#monsterWorld.has(actor)){const world=Object.values(this.#worlds).find(world=>world.monsters.includes(actor));if(world)this.#monsterWorld.set(actor,world)}return this.#monsterWorld.has(actor)}
  #engage(monster){
    if(this.mode==='local')return;
    if(!this.#isMonster(monster)||monster.hp<=0||monster.roomCombat)return;
    const world=this.#monsterWorld.get(monster);
    const count=[...this.#members.values()].filter(({state})=>state.player.map===world.mapId).length;
    const factor=[1,1,1.5,2.5,3.5,4.5,5][Math.min(count,6)];
    monster.roomCombat={count,factor};
    monster.hp=Math.max(1,Math.floor(monster.hp*factor));
    monster.maxHp=Math.max(1,Math.floor(monster.maxHp*factor));
  }
  #shares(total,members,kind){
    const result=new Map;
    if(!members.length)return result;
    const base=Math.floor(total/members.length),remainder=total%members.length,cursor=kind==='xp'?this.#xpCursor:this.#goldCursor;
    for(const [id] of members)result.set(id,base);
    let start=members.findIndex(([,member])=>member.serial>cursor);
    if(start<0)start=0;
    for(let i=0;i<remainder;i++){
      const [id,member]=members[(start+i)%members.length];
      result.set(id,result.get(id)+1);
      if(kind==='xp')this.#xpCursor=member.serial;else this.#goldCursor=member.serial;
    }
    return result;
  }
  #actorMember(actorId){
    for(const [id,{state}] of this.#members)if([state.player,...state.pets,...state.summons].some(actor=>actor.id===actorId))return id;
    return null;
  }
  #owner(actor){
    for(const member of this.#members.values())if(member.state.player===actor||member.state.pets.includes(actor)||member.state.summons.includes(actor))return member.state;
    return null;
  }
  #actors(){return [...this.#members.values()].flatMap(({state})=>[state.player,...state.pets.filter(pet=>pet.active),...state.summons])}
  #bind(state){
    for(const key of ['rng','nextId'])Object.defineProperty(state,key,{enumerable:true,configurable:true,get:()=>this[key],set:value=>{this[key]=value}});
    cooperativeEngine.attach(state,this.#context);
    setSkillPolymorphResolver(state,c=>this.#polymorph.resolve(this.#interactionContext(),this.#actorMember(state.player.id),c));
  }
  #wrap(world,ground=[]){
    const wrapper={ground};
    for(const key of Object.keys(world))if(key!=='ground')Object.defineProperty(wrapper,key,{enumerable:true,configurable:true,get:()=>world[key],set:value=>{world[key]=value}});
    return wrapper;
  }
  #ensureWorld(state,mapId){
    if(!this.#worlds[mapId]){
      const generator={id:'room:'+this.seed,clockMs:this.clockMs,worlds:{}};
      for(const key of ['rng','nextId'])Object.defineProperty(generator,key,{get:()=>this[key],set:value=>{this[key]=value}});
      this.#worlds[mapId]=ensureWorld(generator,mapId);
    }
    this.#context.registerWorld(this.#worlds[mapId]);
    return state.worlds[mapId]??=this.#wrap(this.#worlds[mapId]);
  }
  addMember(memberId,original){
    if(typeof memberId!=='string'||!memberId||memberId.length>100)return failure('成員識別無效');
    if(this.#members.has(memberId))return failure('成員已在房內');
    if(this.#members.size>=(this.mode==='local'?4:10))return failure(this.mode==='local'?'本機最多四名角色':'房間最多十人（包含房主）');
    const check=validate(original);
    if(!check.ok)return failure('角色存檔無效：'+check.errors.join('、'));
    if(this.mode==='local')return this.#addLocal(memberId,original);
    if(original.player.death||original.player.cast||original.player.voyage||original.player.recovery)return failure('請先結束死亡、施法、航行或療養，再進入房間');
    const baseline=structuredClone(original),state=structuredClone(original),serial=++this.#serial;
    const inbound=new Map([['hero','coop-player-'+serial]]);
    for(const pet of state.pets)inbound.set(pet.id,'coop-'+serial+'-'+pet.id);
    const originalPets=new Map(baseline.pets.map(pet=>[pet.id,pet]));
    if(state.petBreeding)state.petBreeding=remap(state.petBreeding,inbound);
    state.player=remap(state.player,inbound);
    state.pets=remap(state.pets,inbound);
    shiftTimers(state.player,this.clockMs-original.clockMs);
    shiftTimers(state.pets,this.clockMs-original.clockMs);
    shiftTimers(state.petBreeding?.pending?.child,this.clockMs-original.clockMs);
    stopActor(state.player);
    state.summons=[];
    state.worlds={};
    state.clockMs=this.clockMs;
    state.fractionMs=this.fractionMs;
    state.nextAI=this.clockMs;
    state.needsProcess=true;
    state.auto.enabled=false;
    state.auto.phase='IDLE';
    delete state.auto.huntSelection;
    delete state.auto.pendingStopReason;
    if(BigInt(state.nextId)>BigInt(this.nextId))this.nextId=state.nextId;
    if(!this.#spawn){
      const mapId=state.player.home,g=geometry(mapId);
      this.#spawn={mapId,...nearestWalkable(g,{x:g.width>>1,y:g.height>>1})};
    }
    state.player.map=this.#spawn.mapId;
    const used=new Set([...this.#members.values()].filter(member=>member.state.player.map===this.#spawn.mapId).map(member=>member.state.player.x+','+member.state.player.y));
    let position={x:this.#spawn.x,y:this.#spawn.y};
    if(used.has(position.x+','+position.y)){
      search:for(let radius=1;radius<=10;radius++)for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++){
        const x=this.#spawn.x+dx,y=this.#spawn.y+dy;
        if(!used.has(x+','+y)&&walkable(geometry(this.#spawn.mapId),x,y)){position={x,y};break search;}
      }
    }
    Object.assign(state.player,position);
    for(const pet of state.pets){
      stopActor(pet);
      if(pet.active){pet.map=state.player.map;pet.x=state.player.x;pet.y=state.player.y;}
    }
    this.#members.set(memberId,{state,baseline,inbound,originalPets,serial,joinedAt:this.clockMs});
    this.#bind(state);
    this.#ensureWorld(state,state.player.map);
    return {ok:true,events:[]};
  }
  #addLocal(memberId,original){
    const state=structuredClone(original),serial=++this.#serial,inbound=new Map([['hero','coop-player-'+serial]]);
    for(const actor of [...state.pets,...state.summons])inbound.set(actor.id,'coop-'+serial+'-'+actor.id);
    const first=this.#members.size===0;
    if(first){
      this.clockMs=state.clockMs;this.fractionMs=state.fractionMs;this.rng=state.rng;this.nextId=state.nextId;
      this.#worlds=remap(structuredClone(state.worlds),inbound);
      for(const world of Object.values(this.#worlds))delete world.ground;
    }else{
      shiftTimers(state.player,this.clockMs-state.clockMs);
      shiftTimers(state.pets,this.clockMs-state.clockMs);
      shiftTimers(state.summons,this.clockMs-state.clockMs);
      shiftTimers(state.petBreeding?.pending?.child,this.clockMs-state.clockMs);
      state.clockMs=this.clockMs;state.fractionMs=this.fractionMs;state.nextAI=this.clockMs;state.needsProcess=true;
    }
    if(state.petBreeding)state.petBreeding=remap(state.petBreeding,inbound);
    state.player=remap(state.player,inbound);state.pets=remap(state.pets,inbound);state.summons=remap(state.summons,inbound);
    const worlds=state.worlds;state.worlds={};
    this.#members.set(memberId,{state,inbound,serial});
    if(BigInt(state.nextId)>BigInt(this.nextId))this.nextId=state.nextId;
    this.#bind(state);
    for(const [mapId,world] of Object.entries(worlds)){
      this.#ensureWorld(state,mapId);
      if(first)state.worlds[mapId].ground=remap(world.ground,inbound);
    }
    this.#ensureWorld(state,state.player.map);
    return {ok:true,events:[]};
  }
  serialize(){
    if(this.mode!=='local')throw Error('只有本機角色帳本能保存共享世界');
    const members=[...this.#members].map(([id,member])=>{
      const state=structuredClone({...member.state,worlds:Object.fromEntries(Object.entries(member.state.worlds).map(([map,world])=>[map,{ground:world.ground}]))});
      return {id,serial:member.serial,inbound:[...member.inbound],state};
    });
    const saved=structuredClone({interactions:{trade:this.#trades.serialize(),polymorph:this.#polymorph.serialize()},mode:'local',seed:this.seed,clockMs:this.clockMs,fractionMs:this.fractionMs,rng:this.rng,nextId:this.nextId,serial:this.#serial,members,contributions:[...this.#contributions].map(([id,set])=>[id,[...set]]),lastAttack:[...this.#lastAttack],xpCursor:this.#xpCursor,xpFraction:this.#xpFraction,goldCursor:this.#goldCursor});
    saved.worlds=cloneWorlds(this.#worlds);return saved;
  }
  static viewSnapshot(snapshot,memberId){return CoopRoom.#revive(snapshot,false).view(memberId)}
  static revive(snapshot){return CoopRoom.#revive(snapshot,true)}
  static #revive(snapshot,copy){
    const saved=copy?structuredClone({...snapshot,worlds:undefined}):{...snapshot,members:snapshot.members.map(member=>({...member,state:{...member.state}}))},room=new CoopRoom(saved.seed,{mode:'local'});saved.worlds=copy?cloneWorlds(snapshot.worlds):snapshot.worlds;
    for(const key of ['clockMs','fractionMs','rng','nextId'])room[key]=saved[key];
    room.#trades=new TradeInteractions(saved.interactions?.trade);room.#polymorph=new PolymorphInteractions(saved.interactions?.polymorph);
    room.#serial=saved.serial;room.#worlds=saved.worlds;for(const world of Object.values(room.#worlds))room.#context.registerWorld(world);room.#xpCursor=saved.xpCursor;room.#xpFraction=saved.xpFraction;room.#goldCursor=saved.goldCursor;
    room.#contributions=new Map(saved.contributions.map(([id,list])=>[id,new Set(list)]));room.#lastAttack=new Map(saved.lastAttack);
    for(const member of saved.members){
      const {id,state,serial,inbound}=member,worlds=state.worlds;
      state.worlds={};
      room.#members.set(id,{state,serial,inbound:new Map(inbound)});
      for(const [mapId,world] of Object.entries(worlds))state.worlds[mapId]=room.#wrap(room.#worlds[mapId],world.ground);
      room.#bind(state);
    }
    return room;
  }
  replaceLocal(memberId,original){
    if(this.mode!=='local')return failure('只有本機角色能套用個人成果');
    const member=this.#members.get(memberId),current=member&&this.view(memberId).state,check=validate(original);
    if(!member||!check.ok||original.id!==current.id)return failure('角色成果身分或資料無效');
    for(const key of ['clockMs','elapsedMs','fractionMs','rng','worlds'])if(JSON.stringify(original[key])!==JSON.stringify(current[key]))return failure('角色成果不能替換共享世界或時鐘');
    for(const key of ['map','x','y','home'])if(original.player[key]!==current.player[key])return failure('角色成果不能改變原本位置');
    if(BigInt(original.nextId)<BigInt(this.nextId))return failure('角色成果的身分序號不能倒退');
    const state=structuredClone(original),inbound=new Map(member.inbound);
    for(const actor of [...state.pets,...state.summons])if(!inbound.has(actor.id))inbound.set(actor.id,'coop-'+member.serial+'-'+actor.id);
    if(state.petBreeding)state.petBreeding=remap(state.petBreeding,inbound);
    state.player=remap(state.player,inbound);state.pets=remap(state.pets,inbound);state.summons=remap(state.summons,inbound);
    state.worlds=member.state.worlds;this.nextId=state.nextId;member.state=state;member.inbound=inbound;this.#bind(state);
    return {ok:true,events:[]};
  }
  #snapshot(){return {interactions:{trade:this.#trades.serialize(),polymorph:this.#polymorph.serialize()},lastAttack:structuredClone(this.#lastAttack),xpCursor:this.#xpCursor,xpFraction:this.#xpFraction,goldCursor:this.#goldCursor,contributions:structuredClone(this.#contributions),worlds:Object.fromEntries(Object.entries(this.#worlds).map(([id,world])=>{const ledger=world.fieldCamps,copy=structuredClone({...world,...(ledger?{fieldCamps:{...ledger,templates:undefined,dormant:undefined}}:{})});if(ledger){if(ledger.templates)copy.fieldCamps.templates={...ledger.templates};else delete copy.fieldCamps.templates;if(ledger.dormant)copy.fieldCamps.dormant={...ledger.dormant};else delete copy.fieldCamps.dormant}return[id,copy]})),rng:this.rng,nextId:this.nextId,states:new Map([...this.#members].map(([id,member])=>[id,structuredClone({...member.state,worlds:Object.fromEntries(Object.entries(member.state.worlds).map(([map,world])=>[map,{ground:world.ground}]))})]))}}
  #restore(snapshot){
    this.#trades=new TradeInteractions(snapshot.interactions.trade);this.#polymorph=new PolymorphInteractions(snapshot.interactions.polymorph);
    this.#worlds=snapshot.worlds;this.#monsterWorld=new WeakMap;for(const world of Object.values(this.#worlds))this.#context.registerWorld(world);
    this.#contributions=snapshot.contributions;
    this.#lastAttack=snapshot.lastAttack;
    this.#xpCursor=snapshot.xpCursor;this.#xpFraction=snapshot.xpFraction;
    this.#goldCursor=snapshot.goldCursor;
    this.rng=snapshot.rng;
    this.nextId=snapshot.nextId;
    for(const [id,state] of snapshot.states){
      this.#members.get(id).state=state;
      for(const [mapId,world] of Object.entries(state.worlds))state.worlds[mapId]=this.#wrap(this.#worlds[mapId],world.ground);
      this.#bind(state);
    }
  }
  command(memberId,action){
    const member=this.#members.get(memberId);
    if(!member)return failure('成員不在房內');
    if(!action||typeof action!=='object')return failure('指令格式錯誤');
    this.#pruneInteractions();const snapshot=this.#snapshot();
    try{
      const ctx=this.#interactionContext(),mapped=remap(action,member.inbound);let result;
      if(action.type==='invitePolymorph')result=this.#polymorph.invite(ctx,memberId,mapped);
      else if(action.type==='answerPolymorph'){
        result=this.#polymorph.answer(ctx,memberId,mapped);
        if(result.ok&&result.action){const caster=this.#members.get(result.casterMemberId);const cast=engineCommand(caster.state,result.action);this.#polymorph.afterCast(action.invitationId,cast.ok);result=cast;}
      }else result=this.#trades.handle(ctx,memberId,mapped)||engineCommand(member.state,mapped);
      if(result.tradeCommitted)for(const id of this.memberIds)this.#normalizePetAliases(id);
      else if(result.ok&&['petBreedCommit','feedWild'].includes(action.type))this.#normalizePetAliases(memberId);
      result.events??=[];
      if(result.ok)this.#pruneInteractions();
      if(!result.ok)this.#restore(snapshot);
      if(result.ok)result.events=result.events.map(event=>({...event,mapId:event.mapId||this.#eventMap(event)||member.state.player.map}));
      return result;
    }catch(error){this.#restore(snapshot);return failure(error.message)}
  }
  #eventMap(event){
    for(const id of [event.targetId,event.targetActorId,event.sourceId,event.sourceActorId,event.actorId]){
      const actor=this.#actors().find(actor=>actor.id===id);
      if(actor)return actor.map;
      for(const world of Object.values(this.#worlds))if(world.monsters.some(monster=>monster.id===id))return world.mapId;
    }
    return null;
  }
  #run(state,phase,events,active=true){
    const mapId=state.player.map,local=[];
    phase(state,local,active);
    for(const event of local)events.push({...event,mapId:event.mapId||this.#eventMap(event)||mapId});
  }
  #process(events,offline=false){
    for(const {state} of this.#members.values()){
      this.#run(state,cooperativeEngine.player,events);
      for(const world of Object.values(state.worlds))world.ground=world.ground.filter(drop=>!drop.expiresAt||drop.expiresAt>this.clockMs);
    }
    const maps=new Map;
    for(const {state} of this.#members.values())if(!maps.has(state.player.map))maps.set(state.player.map,state);
    for(const mapId of Object.keys(this.#worlds))if(!maps.has(mapId)){const member=[...this.#members.values()].find(({state})=>state.worlds[mapId]);if(member)cooperativeEngine.hibernate(member.state,mapId)}
    for(const state of maps.values())this.#run(state,cooperativeEngine.world,events,!offline||[...this.#members.values()].some(member=>member.state.player.map===state.player.map&&member.state.auto.enabled));
    for(const {state} of this.#members.values())this.#run(state,cooperativeEngine.companions,events,!offline||state.auto.enabled);
    for(const state of maps.values())this.#run(state,cooperativeEngine.hazards,events,!offline||[...this.#members.values()].some(member=>member.state.player.map===state.player.map&&member.state.auto.enabled));
    for(const {state} of this.#members.values())this.#run(state,cooperativeEngine.actors,events,!offline||state.auto.enabled);
    for(const {state} of this.#members.values())this.#run(state,cooperativeEngine.decision,events,!offline||state.auto.enabled);
  }
  advance(seconds,{offline=false}={}){
    if(!Number.isFinite(seconds)||seconds<0)throw Error('模擬秒數必須為非負有限數');
    this.#pruneInteractions();
    if(offline)for(const {state} of this.#members.values())if(!state.auto.enabled){state.player.path=[];state.player.targetId=null;if(state.player.cast?.kind==='skill')state.player.cast=null}
    const exact=seconds*1000+this.fractionMs,ms=Math.floor(exact+1e-7),target=this.clockMs+ms;
    if(!Number.isSafeInteger(target))throw Error('請以可續跑區塊處理長時間');
    this.fractionMs=exact-ms;
    if(Math.abs(this.fractionMs)<1e-7)this.fractionMs=0;
    for(const {state} of this.#members.values())state.fractionMs=this.fractionMs;
    const events=[];
    if([...this.#members.values()].some(({state})=>state.needsProcess))this.#process(events,offline);
    while(this.clockMs<target){
      const next=Math.min(...[...this.#members.values()].map(({state})=>cooperativeEngine.nextDeadline(state,!offline||state.auto.enabled))),at=Math.min(next,target),delta=at-this.clockMs;
      this.clockMs=at;
      for(const {state} of this.#members.values()){
        state.clockMs=at;
        state.fractionMs=this.fractionMs;
        state.elapsedMs=(BigInt(state.elapsedMs)+BigInt(delta)).toString();
      }
      if(next<=target)this.#process(events,offline);
    }
    this.#pruneInteractions();return {events};
  }
  eventsFor(memberId,events){
    const member=this.#members.get(memberId);
    if(!member)return [];
    return remap(events.filter(event=>event.mapId===member.state.player.map),new Map([...member.inbound].map(([original,room])=>[room,original])));
  }
  view(memberId){
    const member=this.#members.get(memberId);
    if(!member)throw Error('成員不在房內');
    const outbound=new Map([...member.inbound].map(([original,room])=>[room,original]));
    const state=remap(member.state,outbound);
    const players=[];
    for(const [id,other] of this.#members)if(id!==memberId&&other.state.player.map===state.player.map){
      const {player,pets,summons,equipped,inventory}=other.state;
      players.push(remap({memberId:id,player:{...player,maxHp:stats(other.state).maxHp},pets:pets.filter(pet=>pet.active&&pet.map===player.map),summons,equipped,inventory},outbound));
    }
    return {state,players,pendingTrade:remap(this.#trades.view(this.#interactionContext(),memberId),outbound),pendingPolymorph:this.#polymorph.view(this.#interactionContext(),memberId)};
  }
  networkView(memberId,events=[]){
    const member=this.#members.get(memberId);if(!member)throw Error('成員不在房內');
    const source=member.state,mapId=source.player.map,world=source.worlds[mapId],outbound=new Map([...member.inbound].map(([original,room])=>[room,original])),eventIds=new Set;
    for(const event of events)if(!event.mapId||event.mapId===mapId)for(const key of ['targetId','targetActorId','sourceId','sourceActorId','actorId','monsterId'])if(event[key])eventIds.add(event[key]);
    const visible=actor=>visibleCell(source.player,actor)||eventIds.has(actor.id)||actor.id===source.player.targetId;
    const displayWorld={mapId,visitedAt:world.visitedAt,monsters:world.monsters.filter(visible),ground:world.ground.filter(visible),hazards:world.hazards.filter(visible)};
    const state=remap({...source,worlds:{[mapId]:displayWorld}},outbound),players=[];
    for(const [id,other] of this.#members)if(id!==memberId&&other.state.player.map===mapId){
      const {player,pets,summons,equipped,inventory}=other.state;
      players.push(remap({memberId:id,player:{...player,maxHp:stats(other.state).maxHp},pets:pets.filter(pet=>pet.active&&pet.map===mapId),summons,equipped,inventory:{equipment:inventory.equipment.filter(item=>Object.values(equipped).includes(item.uid)),stacks:{},scrolls:[]}},outbound));
    }
    for(const monster of state.worlds[mapId].monsters)for(const key of ['campId','campSlotId','fieldCampId','fieldCampSlot','fieldGeneration','fieldRole'])delete monster[key];
    return {state,players,pendingTrade:remap(this.#trades.view(this.#interactionContext(),memberId),outbound),pendingPolymorph:this.#polymorph.view(this.#interactionContext(),memberId)};
  }
  exportMember(memberId){
    const member=this.#members.get(memberId);
    if(!member)throw Error('成員不在房內');
    const result=this.view(memberId).state,base=member.baseline,delta=base.clockMs-this.clockMs;
    result.worlds=structuredClone(base.worlds);
    result.summons=structuredClone(base.summons);
    result.clockMs=base.clockMs;
    result.elapsedMs=base.elapsedMs;
    result.fractionMs=base.fractionMs;
    result.rng=base.rng;
    result.nextId=this.nextId;
    shiftTimers(result.player,delta);
    shiftTimers(result.pets,delta);
    if(result.petBreeding?.pending?.child){const child=result.petBreeding.pending.child;shiftTimers(child,delta);child.map=base.player.map;child.x=base.player.x;child.y=base.player.y}
    for(const actor of [result.player,...result.pets])for(const effect of actor.effects||[])delete effect.sourceActorId;
    stopActor(result.player);
    result.player.home=base.player.home;
    result.player.map=base.player.map;
    result.player.x=base.player.x;
    result.player.y=base.player.y;
    delete result.player.recovery;
    delete result.player.voyage;
    if(result.player.death)Object.assign(result.player.death,{map:base.player.map,x:base.player.x,y:base.player.y});
    for(const pet of result.pets){
      stopActor(pet);
      const original=member.originalPets.get(pet.id);
      if(original){pet.sourceId=original.sourceId;pet.map=original.map;pet.x=original.x;pet.y=original.y;}
      else{pet.sourceId='room:'+this.seed+':'+pet.id+':'+pet.sourceId;pet.map=base.player.map;pet.x=base.player.x;pet.y=base.player.y;}
    }
    result.auto.enabled=false;
    result.auto.phase='IDLE';
    delete result.auto.huntSelection;
    delete result.auto.pendingStopReason;
    result.nextAI=base.clockMs;
    result.needsProcess=true;
    result.lastService=null;
    const check=validate(result);
    if(!check.ok)throw Error('房間成果校驗失敗：'+check.errors.join('、'));
    return result;
  }
  removeMember(memberId){
    const state=this.exportMember(memberId);
    const departing=this.#members.get(memberId).state,actorIds=new Set([departing.player,...departing.pets,...departing.summons].map(actor=>actor.id));
    cooperativeEngine.leave(departing);
    this.#members.delete(memberId);
    this.#pruneInteractions();
    for(const participants of this.#contributions.values())participants.delete(memberId);
    for(const [monsterId,id] of this.#lastAttack)if(id===memberId)this.#lastAttack.delete(monsterId);
    for(const world of Object.values(this.#worlds))for(const monster of world.monsters){
      if(actorIds.has(monster.targetId)){monster.targetId=null;monster.path=[];}
      if(actorIds.has(monster.monsterCast?.targetId))monster.monsterCast=null;
    }
    return state;
  }
}
