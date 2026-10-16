import {MONSTERS} from './data.mjs';

// Original provisional single-player tuning. These values are not a claim of
// fidelity to an external game's rules. Callers display the same definitions
// they use for progression, form effects, and derived collection bonuses.
export const FORM_PROGRESS_VERSION=1;
export const FORM_POLICY=Object.freeze({
 version:1,provisional:true,origin:'original_single_player_provisional',
 disclosure:'原創單人暫定平衡；並非外部版本的精確數值。',
 ordinaryKills:300,bossContractChance:.05,durationSeconds:1800,durationSource:'scroll',
 nonBossClassification:'provisional_ordinary',
 ordinaryAttackSpeedFactor:1.05,bossAttackSpeedFactor:1.15,
});
export const LEGACY_FORM_ALIASES=Object.freeze({
 'FORM-SKELETON':'MON-SKELETON',
 'FORM-BLACK-KNIGHT':'MON-BLACK-KNIGHT',
 'FORM-KURTZ':'MON-KURTZ',
 'FORM-DEATH-KNIGHT':'MON-DEATH-KNIGHT',
});
export const LEGACY_FORM_LEVELS=Object.freeze({
 'MON-SKELETON':15,'MON-BLACK-KNIGHT':30,'MON-KURTZ':45,'MON-DEATH-KNIGHT':50,
});
const LEGACY_RENDER_IDS=Object.freeze(Object.fromEntries(Object.entries(LEGACY_FORM_ALIASES).map(([alias,id])=>[id,alias])));
// No elite roster has been confirmed. An empty pending classification has no
// runtime unlocks, invented members, drops, or bonuses.
export const ELITE_FORM_CLASSIFICATION=Object.freeze({status:'pending',monsterIds:Object.freeze([])});
export const FORM_COLLECTION_MILESTONES=Object.freeze([
 {earned:3,reward:{damage:1,hit:0},total:{damage:1,hit:0}},
 {earned:10,reward:{damage:0,hit:1},total:{damage:1,hit:1}},
 {earned:25,reward:{damage:1,hit:0},total:{damage:2,hit:1}},
 {earned:50,reward:{damage:0,hit:1},total:{damage:2,hit:2}},
].map(row=>Object.freeze({...row,reward:Object.freeze(row.reward),total:Object.freeze(row.total)})));

export const FORM_DEFINITIONS=Object.freeze(Object.fromEntries(Object.values(MONSTERS).map(monster=>{
 const boss=monster.boss===true,minLevel=boss?(LEGACY_FORM_LEVELS[monster.id]??monster.level):1;
 const contractItemId=boss?'ITEM-FORM-CONTRACT-'+monster.id.slice(4):null;
 const activationAvailable=true;
 const unlock=Object.freeze(boss
  ?{kind:'contract',itemId:contractItemId,count:1,minLevel,dropChance:FORM_POLICY.bossContractChance}
  :{kind:'kills',monsterId:monster.id,count:FORM_POLICY.ordinaryKills,minLevel});
 const reward=Object.freeze({durationSeconds:FORM_POLICY.durationSeconds,durationSource:'scroll',
  scrollDurationSeconds:FORM_POLICY.durationSeconds,
  attackSpeedFactor:boss?FORM_POLICY.bossAttackSpeedFactor:FORM_POLICY.ordinaryAttackSpeedFactor});
 return[monster.id,Object.freeze({id:monster.id,monsterId:monster.id,formId:monster.id,
  name:monster.name_zh,name_zh:monster.name_zh,category:boss?'boss':'ordinary',
  categoryLabel:boss?'首領':'一般（暫定）',provisional:true,
  renderConsumerId:LEGACY_RENDER_IDS[monster.id]||monster.id,activationAvailable,
  activationUnavailableReason:activationAvailable?'':'此變身本體素材待補，暫不開放使用；擊殺與收集進度照常保留。',
  classificationSource:'catalog.boss',minLevel,contractItemId,unlock,reward,
  conditionText:boss?`取得並消耗 ${monster.name_zh}變身契約 1 張，角色等級 ${minLevel}。`
   :`累積擊殺 ${monster.name_zh} ${FORM_POLICY.ordinaryKills} 隻。`,
  rewardText:`解鎖此變身；卷軸 ${FORM_POLICY.durationSeconds} 秒／技能依其時間，攻擊速度 ×${reward.attackSpeedFactor}。`,
 })];
})));
export const FORM_IDS=Object.freeze(Object.keys(FORM_DEFINITIONS));
const CONTRACT_FORMS=Object.freeze(Object.fromEntries(Object.values(FORM_DEFINITIONS)
 .filter(def=>def.contractItemId).map(def=>[def.contractItemId,def.id])));
const own=(object,key)=>Object.prototype.hasOwnProperty.call(object,key);
const failure=error=>({ok:false,error});

export function normalizeFormId(id){
 if(typeof id!=='string')return null;
 if(own(FORM_DEFINITIONS,id))return id;
 return own(LEGACY_FORM_ALIASES,id)?LEGACY_FORM_ALIASES[id]:null;
}
export function formDefinition(id){return FORM_DEFINITIONS[normalizeFormId(id)]||null;}
export function formContractItemId(id){return formDefinition(id)?.contractItemId||null;}
export function formIdForContract(itemId){return typeof itemId==='string'&&own(CONTRACT_FORMS,itemId)?CONTRACT_FORMS[itemId]:null;}

function emptyLedger(){return{version:FORM_PROGRESS_VERSION,kills:{},earned:[],legacy:[]};}
function validRecord(value){return!!value&&typeof value==='object'&&!Array.isArray(value);}
function ledgerErrors(ledger){
 const errors=[];
 if(!validRecord(ledger))return['變身紀錄格式錯誤'];
 if(ledger.version!==FORM_PROGRESS_VERSION)errors.push('變身紀錄版本不支援');
 if(!validRecord(ledger.kills))errors.push('變身擊殺紀錄格式錯誤');
 else for(const[id,n]of Object.entries(ledger.kills))
  if(!own(FORM_DEFINITIONS,id)||typeof n!=='string'||!/^(0|[1-9]\d*)$/.test(n))errors.push('變身擊殺紀錄無效');
 for(const key of['earned','legacy']){
  const ids=ledger[key];
  if(!Array.isArray(ids)){errors.push('變身權限紀錄格式錯誤');continue;}
  if(new Set(ids).size!==ids.length||ids.some(id=>typeof id!=='string'||!own(FORM_DEFINITIONS,id)
   ||key==='legacy'&&!own(LEGACY_FORM_LEVELS,id)))errors.push('變身權限紀錄無效');
 }
 return errors;
}
export function validateFormProgress(s){
 const errors=s.formProgress===undefined?[]:ledgerErrors(s.formProgress);
 return{ok:errors.length===0,errors};
}
function requireLedger(ledger){const errors=ledgerErrors(ledger);if(errors.length)throw Error(errors[0]);return ledger;}

// Migration is an explicit one-time caller choice for an old save only. A new
// game's existing empty ledger cannot later acquire legacy grants by leveling.
export function ensureFormProgress(s,{migrateLegacy=false}={}){
 if(s.formProgress!==undefined)return requireLedger(s.formProgress);
 const ledger=emptyLedger();
 if(migrateLegacy)ledger.legacy=Object.entries(LEGACY_FORM_LEVELS)
  .filter(([,level])=>(s.player?.level||0)>=level).map(([id])=>id);
 s.formProgress=ledger;
 return ledger;
}
// Read APIs never create a ledger, migrate permissions, or change player stats.
export function readFormProgress(s){
 const ledger=s.formProgress===undefined?emptyLedger():requireLedger(s.formProgress);
 return{version:ledger.version,kills:{...ledger.kills},earned:[...ledger.earned],legacy:[...ledger.legacy]};
}

// Invoke once from the existing confirmed-kill branch. The caller owns kill
// deduplication. Ordinary kills consume no RNG; every boss kill consumes one
// supplied [0,1) roll, even when its form was earned previously.
export function recordFormKill(s,monsterId,{random}={}){
 if(typeof monsterId!=='string'||!own(MONSTERS,monsterId))return failure('未知怪物種類');
 const def=FORM_DEFINITIONS[monsterId];
 let contract=null;
 if(def.category==='boss'){
  if(typeof random!=='function')return failure('王怪契約掉落需要注入隨機來源');
  // Validate the ledger before asking the caller to advance its RNG state.
  if(s.formProgress!==undefined)requireLedger(s.formProgress);
  const roll=random();
  if(!Number.isFinite(roll)||roll<0||roll>=1)throw RangeError('契約隨機值必須介於 0（含）與 1（不含）之間');
  if(roll<def.unlock.dropChance)contract={itemId:def.contractItemId,count:1,formId:def.id};
 }
 const ledger=ensureFormProgress(s),killCount=(BigInt(ledger.kills[def.id]||'0')+1n).toString();
 ledger.kills[def.id]=killCount;
 const unlocked=def.category==='ordinary'&&BigInt(killCount)>=BigInt(def.unlock.count)&&!ledger.earned.includes(def.id);
 if(unlocked)ledger.earned.push(def.id);
 return{ok:true,formId:def.id,killCount,unlocked,contract,contractItemId:contract?.itemId||null};
}

// Caller must verify ownership and consume the returned item/count atomically
// with this ledger change. This module never reads or writes inventory/storage.
export function unlockFormContract(s,itemOrFormId){
 const def=formDefinition(formIdForContract(itemOrFormId)||itemOrFormId);
 if(!def||def.category!=='boss')return failure('無效的變身契約');
 if((s.player?.level||0)<def.minLevel)return failure(`角色等級需達 ${def.minLevel}`);
 const current=s.formProgress===undefined?null:requireLedger(s.formProgress);
 if(current?.earned.includes(def.id))return failure('已經解鎖此變身');
 const ledger=ensureFormProgress(s);
 ledger.earned.push(def.id);
 return{ok:true,formId:def.id,unlocked:true,consume:{itemId:def.contractItemId,count:1}};
}

function eligibilityFor(def,ledger,level){
 if(!def)return{eligible:false,known:false,formId:null,earned:false,legacy:false,reason:'未知變身'};
 const earned=ledger.earned.includes(def.id),legacy=ledger.legacy.includes(def.id);
 const minLevel=earned?def.minLevel:legacy?(LEGACY_FORM_LEVELS[def.id]??def.minLevel):def.minLevel;
 const eligible=def.activationAvailable&&(earned||legacy)&&level>=minLevel;
 return{eligible,known:true,formId:def.id,earned,legacy,minLevel,activationAvailable:def.activationAvailable,
  reason:eligible?'':!def.activationAvailable?def.activationUnavailableReason
   :level<minLevel?`角色等級需達 ${minLevel}`:def.conditionText};
}
export function formEligibility(s,id){return eligibilityFor(formDefinition(id),readFormProgress(s),s.player?.level||0);}
export function canUseForm(s,id){return formEligibility(s,id).eligible;}

export function collectionBonuses(s){
 const ledger=s.formProgress;
 // Keep this frequently called derived-stat read small and nonmutating. Invalid
 // save schemas are rejected by validateFormProgress/ensureFormProgress.
 const earned=new Set(Array.isArray(ledger?.earned)?ledger.earned.filter(id=>own(FORM_DEFINITIONS,id)):[]).size;
 let damage=0,hit=0;
 for(const row of FORM_COLLECTION_MILESTONES)if(earned>=row.earned){damage+=row.reward.damage;hit+=row.reward.hit;}
 return{damage,hit};
}
export function formCollection(s){
 const ledger=readFormProgress(s),level=s.player?.level||0;
 return FORM_IDS.map(id=>{const def=FORM_DEFINITIONS[id];return{...def,
  ...eligibilityFor(def,ledger,level),kills:ledger.kills[id]||'0',
  requiredKills:def.category==='ordinary'?def.unlock.count:null};});
}
