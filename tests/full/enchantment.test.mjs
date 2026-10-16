import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,command,validate,advance} from '../../dist/full/engine.mjs';
import {ITEMS,MONSTERS} from '../../dist/full/data.mjs';
import {grantGear,uid,random,stats,magicDamage} from '../../dist/full/rules.mjs';
import {ENCHANT_STONES,enchantInfo,validEnchantment} from '../../dist/full/enchantment-policy.mjs';
import {enchantPreview,enchantGear,enchantOnHit,rollEnchantmentDrops} from '../../dist/full/enchantment.mjs';
import {fusionRecipe,fusionScrollId} from '../../dist/full/fusion-policy.mjs';
const copy=s=>JSON.parse(JSON.stringify(s));
const make=()=>createGame('knight','附魔測試',undefined,23);
const element=(kind='fire',count='10')=>({version:1,element:{kind,count}});
const action=(s,kind='FIRE')=>({type:'enchant',uid:s.inventory.equipment[0].uid,stoneId:'ITEM-ENCHANT-'+kind,transactionId:s.enchantments?.next||'1'});
function seedFor(chance,result){for(let rng=1;;rng++){const probe={rng};if((random(probe)<chance)===result)return rng;}}
function equipped(s,track,kind,n='10'){const weapon=s.inventory.equipment[0];weapon.enchantment={version:1,[track]:{kind,count:n}};return weapon;}

test('nine distinct stones and permitted tracks match the approved slots',()=>{
 assert.equal(ENCHANT_STONES.length,9);assert.equal(new Set(ENCHANT_STONES.map(s=>s.id)).size,9);
 const s=make();for(const stone of ENCHANT_STONES){assert(ITEMS[stone.id]);assert(enchantPreview(s,s.inventory.equipment[0].uid,stone.id).ok);}
 for(const item of Object.values(ITEMS).filter(i=>i.slot)){
  assert.equal(validEnchantment(element(),item),['weapon','helmet','armor','cloak','gloves','boots','shield','armguard'].includes(item.slot));
  assert.equal(validEnchantment({version:1,special:{kind:'slow',count:'1'}},item),item.slot==='weapon');
 }
});
test('success/failure consume one stone and one draw; same transaction remains settled after reopening',()=>{
 for(const success of [true,false]){
  const s=make(),c=action(s);s.inventory.stacks[c.stoneId]=2;s.rng=seedFor(.5,success);const next={rng:s.rng};random(next);
  const r=enchantGear(s,c);assert(r.ok);assert.equal(r.receipt.success,success);assert.equal(s.rng,next.rng);assert.equal(s.inventory.stacks[c.stoneId],1);
  assert.equal(s.inventory.equipment[0].enchantment?.element.count,success?'1':undefined);assert(validate(s).ok,validate(s).errors.join(','));
  const reopened=copy(s),before=copy(reopened);assert(enchantGear(reopened,c).duplicate);assert.deepEqual(reopened,before);
 }
});
test('replacing a kind needs confirmation and retains the old effect on failure and cumulative difficulty on success',()=>{
 const s=make();s.inventory.equipment[0].enchantment=element('water','5');const c=action(s);s.inventory.stacks[c.stoneId]=2;
 const before=copy(s);assert(!enchantGear(s,c).ok);assert.deepEqual(s,before);
 c.confirmChange=true;s.rng=seedFor(.25,false);assert.equal(enchantGear(s,c).receipt.success,false);assert.deepEqual(s.inventory.equipment[0].enchantment,element('water','5'));
 c.transactionId=s.enchantments.next;s.rng=seedFor(.25,true);assert.equal(enchantGear(s,c).receipt.success,true);assert.deepEqual(s.inventory.equipment[0].enchantment,element('fire','6'));
});
test('invalid, stale, unavailable and fusion-reserved inputs leave the entire state untouched',()=>{
 for(const mutate of [(s,c)=>{c.transactionId='2'},(s,c)=>{c.transactionId='01'},s=>{s.player.cast={kind:'return'}},s=>{s.inventory.equipment[0].identified=false},s=>{s.inventory.equipment[0].cursed=true},s=>{s.fusion.pending={uids:[s.inventory.equipment[0].uid]}},(s,c)=>{c.stoneId='unknown'}]){
  const s=make(),c=action(s);s.inventory.stacks[c.stoneId]=2;mutate(s,c);const before=copy(s);assert(!enchantGear(s,c).ok);assert.deepEqual(s,before);
 }
});
test('approved curves diminish without a count cap, and armor resistance enters the existing 80 percent clamp once',()=>{
 const s=make(),armor=s.inventory.equipment[1];armor.enchantment=element();const info=enchantInfo(armor,'element');
 assert.equal(info.damage,5);assert.equal(info.resistance,7.5);assert.equal(info.chance,1/6);assert.equal(info.procChance,.05);
 assert.equal(stats(s).resistances.fire,7.5);assert.equal(magicDamage(100,{sp:0},{mr:0,resistances:{fire:7.5}},'fire'),92);
 assert.equal(magicDamage(100,{sp:0},{mr:0,resistances:{fire:200}},'fire'),19);
 armor.enchantment.element.count='9999999999999999999999999999';assert(validate(s).ok);assert(enchantInfo(armor,'element').resistance<=15);
});
function contact(s,kind,{damage=100,mp=100,hp=1000,immune=[]}={}){
 if(kind)equipped(s,'special',kind);s.rng=seedFor(.05,true);
 const target={id:'target',type:'MON-ORC',hp,mp,effects:[],x:s.player.x+1,y:s.player.y},hits=[];
 const ctx={actorStats:()=>({mr:0,resistances:{}}),damage:(t,n)=>{const dealt=Math.min(n,t.hp);t.hp-=dealt;hits.push(dealt);return dealt}};
 enchantOnHit(s,target,damage,ctx);return{target,hits,ctx};
}
test('elemental follow-up applies only to physical contact and does not draw or recursively attack',()=>{
 const s=make();equipped(s,'element','fire');const target={hp:100,mp:0,effects:[]},hits=[],rng=s.rng,ctx={actorStats:()=>({mr:0,resistances:{fire:50}}),damage:(t,n)=>{hits.push(n);t.hp-=n;return n}};
 enchantOnHit(s,target,0,ctx);assert.deepEqual(hits,[]);enchantOnHit(s,target,20,ctx);assert.deepEqual(hits,[2]);assert.equal(s.rng,rng);
 target.hp=0;enchantOnHit(s,target,20,ctx);assert.deepEqual(hits,[2]);
});
test('steal uses actual damage, caps to resources, and never resurrects the attacker',()=>{
 const s=make(),max=stats(s).maxHp;s.player.hp=max-3;contact(s,'life_steal');assert.equal(s.player.hp,max);
 s.player.hp=0;contact(s,'life_steal');assert.equal(s.player.hp,0);
 s.player.mp=0;const {target}=contact(s,'mana_steal',{mp:2});assert.equal(target.mp,0);assert.equal(s.player.mp,Math.min(2,stats(s).maxMp));
});
test('paralysis has a saved eight second cooldown; slow and armor break refresh instead of stacking',()=>{
 const s=make();const {target,ctx}=contact(s,'paralyze');assert.equal(target.effects.length,1);assert.equal(target.enchantParalyzeAt,s.clockMs+8000);
 s.clockMs+=2000;s.rng=seedFor(.05,true);enchantOnHit(s,target,10,ctx);assert.equal(target.effects[0].until,1000);
 const restored=copy(target);s.clockMs=8000;s.rng=seedFor(.05,true);enchantOnHit(s,restored,10,ctx);assert.equal(restored.enchantParalyzeAt,16000);
 for(const kind of ['slow','armor_break']){equipped(s,'special',kind);target.effects=[];for(let i=0;i<2;i++){s.rng=seedFor(.05,true);enchantOnHit(s,target,10,ctx);s.clockMs+=100;}assert.equal(target.effects.length,1);assert.deepEqual(target.effects[0].values,kind==='slow'?{slow:1.2}:{ac:2});}
});
function fusionState(){const s=make(),a=grantGear(s,'EQ-DAGGER'),b=grantGear(s,'EQ-DAGGER');a.enchantment=element('fire','3');b.enchantment={...element('water','7'),special:{kind:'slow',count:'2'}};const scroll={uid:uid(s,'scroll'),itemId:fusionScrollId('weapon','basic'),identified:true};(s.inventory.scrolls??=[]).push(scroll);return{s,a,b,request:{uids:[a.uid,b.uid],scrollUid:scroll.uid}};}
test('fusion requires independent choices, keeps only the chosen counts, and never draws during preview',()=>{
 const {s,a,b,request}=fusionState(),before=copy(s);assert(!fusionRecipe(s,request,ITEMS).ok);
 const result=fusionRecipe(s,{...request,enchantmentChoices:{element:a.uid}},ITEMS);assert(result.ok);assert.deepEqual(result.enchantment,{version:1,element:a.enchantment.element,special:b.enchantment.special});assert.deepEqual(s,before);
 assert(!fusionRecipe(s,{...request,enchantmentChoices:{element:'missing'}},ITEMS).ok);
});
test('malformed effect counts, incompatible armor effects and transaction tampering are rejected by save validation',()=>{
 for(const effect of [element('fire','01'),element('fire','0'),element('fire','-1'),element('typo'),{version:2,element:{kind:'fire',count:'1'}}]){const s=make();s.inventory.equipment[0].enchantment=effect;assert(!validate(s).ok);}
 const s=make(),c=action(s);s.inventory.stacks[c.stoneId]=1;enchantGear(s,c);s.enchantments.next='7';assert(!validate(s).ok);
});
test('stone drops obey ordinary element and elite/Boss special pools with exactly one choice draw',()=>{
 const none=Object.values(MONSTERS).find(m=>!m.boss&&m.element==='none');const s=make(),rng=s.rng;assert.deepEqual(rollEnchantmentDrops(s,{type:none.id}),[]);assert.equal(s.rng,rng);
 for(const boss of [false,true]){const def=Object.values(MONSTERS).find(m=>!!m.boss===boss);s.rng=seedFor(boss?.1:.02,true);const expected={rng:s.rng};random(expected);random(expected);const result=rollEnchantmentDrops(s,{type:def.id,elite:!boss});assert.equal(result.length,1);assert(ENCHANT_STONES.some(x=>x.track==='special'&&x.id===result[0]));assert.equal(s.rng,expected.rng);}
});
test('engine command, save/reopen and offline partitions preserve enchantment and fusion inheritance',()=>{
 const {s,a,b,request}=fusionState();const c=action(s);s.inventory.stacks[c.stoneId]=1;s.rng=1;assert(command(s,c).ok);
 const stage=command(s,{type:'fusionStage',...request,enchantmentChoices:{element:a.uid}});assert(stage.ok,stage.error);const reopened=copy(s);assert(validate(reopened).ok,validate(reopened).errors.join(','));
 assert(command(reopened,{type:'fusionCommit',transactionId:stage.transactionId}).ok);const result=reopened.inventory.equipment.at(-1);assert.deepEqual(result.enchantment,{version:1,element:a.enchantment.element,special:b.enchantment.special});
 const after=copy(reopened);assert(command(reopened,{type:'fusionCommit',transactionId:stage.transactionId}).duplicate);assert.equal(reopened.inventory.equipment.length,after.inventory.equipment.length);
 const single=copy(reopened),split=copy(reopened);advance(single,12,{offline:true});advance(split,5,{offline:true});advance(split,7,{offline:true});assert.deepEqual(copy(single),copy(split));
});
