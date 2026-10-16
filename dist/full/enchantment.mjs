import {ITEMS} from './data.mjs';
import {ENCHANT_STONES,ENCHANT_STONE_BY_ID,ELEMENTS,SPECIALS,enchantableTrack,enchantInfo,validEnchantment} from './enchantment-policy.mjs';
import {gear,count,consume,random,stats,magicDamage,effectValues,applyEffect} from './rules.mjs';
import {monsterDefinition} from './silver-monsters.mjs';

const fail=error=>({ok:false,error});
const dec=n=>typeof n==='string'&&/^(0|[1-9]\d*)$/.test(n);
export function enchantPreview(s,uid,stoneId){
 const equipment=gear(s,uid),stone=ENCHANT_STONE_BY_ID[stoneId];
 if(!equipment||!stone||!enchantableTrack(ITEMS[equipment.itemId],stone.track))return fail('此裝備不能使用這種附魔石');
 if(!equipment.identified||equipment.cursed||s.fusion.pending?.uids.includes(uid))return fail('請使用已鑑定、無詛咒且未投入融合的裝備');
 const current=enchantInfo(equipment,stone.track);
 return{ok:true,uid,stoneId,track:stone.track,kind:stone.kind,current,changing:!!current.kind&&current.kind!==stone.kind,transactionId:s.enchantments?.next||'1'};
}
export function enchantGear(s,c,events=[]){
 const ledger=s.enchantments;
 if(!dec(c.transactionId)||c.transactionId==='0')return fail('附魔交易編號無效');
 if(ledger&&BigInt(c.transactionId)<=BigInt(ledger.applied))return{ok:true,duplicate:true,receipt:ledger.receipts.find(r=>r.id===c.transactionId)};
 if(c.transactionId!==(ledger?.next||'1'))return fail('附魔畫面已過期，請重新確認');
 if(s.player.death||s.player.cast||s.player.voyage||s.player.recovery)return fail('目前無法附魔');
 const preview=enchantPreview(s,c.uid,c.stoneId);if(!preview.ok)return preview;
 if(preview.changing&&c.confirmChange!==true)return fail('更換附魔種類需要確認');
 if(count(s,c.stoneId)<1)return fail('缺少對應附魔石');
 const equipment=gear(s,c.uid),success=random(s)<preview.current.chance;
 consume(s,c.stoneId);
 if(success){equipment.enchantment??={version:1};equipment.enchantment[preview.track]={kind:preview.kind,count:(BigInt(preview.current.count)+1n).toString()};}
 s.enchantments??={version:1,next:'1',applied:'0',receipts:[]};
 const receipt={id:c.transactionId,uid:c.uid,itemId:equipment.itemId,stoneId:c.stoneId,success,track:preview.track,kind:preview.kind,count:success?equipment.enchantment[preview.track].count:preview.current.count};
 s.enchantments.applied=c.transactionId;s.enchantments.next=(BigInt(c.transactionId)+1n).toString();s.enchantments.receipts.push(receipt);s.enchantments.receipts=s.enchantments.receipts.slice(-64);
 events.push({type:'enchant',...receipt});return{ok:true,receipt};
}
export function validateEnchantments(s){
 const l=s.enchantments,errors=[];if(l===undefined)return{ok:true,errors};
 if(!l||l.version!==1||!dec(l.next)||!dec(l.applied)||BigInt(l.next)!==BigInt(l.applied)+1n||!Array.isArray(l.receipts)||l.receipts.length>64)return{ok:false,errors:['附魔帳本無效']};
 let previous=null;
 for(const r of l.receipts){const stone=ENCHANT_STONE_BY_ID[r?.stoneId];if(!r||!dec(r.id)||r.id==='0'||BigInt(r.id)>BigInt(l.applied)||previous!==null&&BigInt(r.id)!==previous+1n||typeof r.uid!=='string'||!/^e[1-9]\d*$/.test(r.uid)||!stone||!enchantableTrack(ITEMS[r.itemId],stone?.track)||stone.track!==r.track||stone.kind!==r.kind||typeof r.success!=='boolean'||!dec(r.count)||r.success&&r.count==='0')errors.push('附魔收據無效');if(dec(r?.id))previous=BigInt(r.id);}
 if(l.applied!=='0'&&previous!==BigInt(l.applied)||l.applied==='0'&&l.receipts.length)errors.push('附魔收據缺少最後結果');
 return{ok:!errors.length,errors};
}
// Called only once after a physical hit. The callback is damage settlement,
// never another attack, so an elemental hit cannot recursively proc effects.
export function enchantOnHit(s,target,physicalDamage,ctx){
 if(physicalDamage<=0)return;
 const st=stats(s),weapon=st.weapon;if(!weapon?.enchantment)return;
 const elemental=enchantInfo(weapon,'element'),special=enchantInfo(weapon,'special');
 let dealt=physicalDamage;
 if(elemental.kind&&target.hp>0){dealt+=ctx.damage(target,magicDamage(elemental.damage,{sp:0},ctx.actorStats(target),elemental.kind),s.player.id);ctx.visual?.(elemental.kind,target);}
 if(!special.kind||random(s)>=special.procChance)return;
 const drain=Math.max(1,Math.floor(dealt*.1));
 if(special.kind==='life_steal'){if(s.player.hp>0)s.player.hp=Math.min(st.maxHp,s.player.hp+drain);return;}
 if(special.kind==='mana_steal'){const n=Math.min(drain,target.mp||0);if(n>0)target.mp-=n;s.player.mp=Math.min(st.maxMp,s.player.mp+n);return;}
 if(target.hp<=0)return;
 const kind=special.kind,group=kind==='armor_break'?'enchant_armor_break':kind,immunity=monsterDefinition(target)?.status_immunity||[],fx=effectValues(s,target);
 if(immunity.includes(kind)||fx.invulnerable||fx.earthBarrier||kind==='paralyze'&&(fx.paralyzeImmune||(target.enchantParalyzeAt||0)>s.clockMs))return;
 const duration=kind==='paralyze'?1:kind==='slow'?3:5,values=kind==='paralyze'?{paralyze:1}:kind==='slow'?{slow:1.2}:{ac:2};
 const old=target.effects?.find(e=>e.group===group),until=Math.max(old?.until||0,s.clockMs+duration*1000);
 if(kind==='slow'&&old?.until>s.clockMs&&old.values?.slow>1.2)return;
 if(applyEffect(s,target,{id:'enchant-'+kind,group,values,duration:(until-s.clockMs)/1000,strength:kind==='slow'?1.2:kind==='armor_break'?2:1})&&kind==='paralyze')target.enchantParalyzeAt=s.clockMs+8000;
}
export function rollEnchantmentDrops(s,monster){
 const def=monsterDefinition(monster),drops=[];
 if(!def||monster.summoned||monster.captured)return drops;
 if(!def.boss&&!monster.elite&&ELEMENTS.includes(def.element)&&random(s)<.005)drops.push(ENCHANT_STONES.find(d=>d.kind===def.element).id);
 if((def.boss||monster.elite)&&random(s)<(def.boss?.1:.02)){const kind=SPECIALS[Math.floor(random(s)*SPECIALS.length)];drops.push(ENCHANT_STONES.find(d=>d.kind===kind).id);}
 return drops;
}
export {validEnchantment};
