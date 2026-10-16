// Approved P3 trial values. This module has no simulation or data dependency.
export const ELEMENTS=Object.freeze(['fire','water','wind','earth']);
export const SPECIALS=Object.freeze(['life_steal','mana_steal','paralyze','slow','armor_break']);
export const ENCHANT_NAMES=Object.freeze({fire:'火',water:'水',wind:'風',earth:'地',life_steal:'吸血',mana_steal:'吸魔',paralyze:'麻痺',slow:'緩速',armor_break:'破甲'});
export const ENCHANT_COLORS=Object.freeze({fire:'#ed665c',water:'#72b9ff',wind:'#79d58c',earth:'#e0c965'});
export const ENCHANT_STONES=Object.freeze([...ELEMENTS,...SPECIALS].map(kind=>Object.freeze({id:'ITEM-ENCHANT-'+kind.toUpperCase().replaceAll('_','-'),name_zh:ENCHANT_NAMES[kind]+(ELEMENTS.includes(kind)?'元素石':'特效石'),family:'enchantment_stone',track:ELEMENTS.includes(kind)?'element':'special',kind,weight:1,stackable:true,tradeable:true,binding:'none',origin:'approved_p3_trial_20261011'})));
export const ENCHANT_STONE_BY_ID=Object.freeze(Object.fromEntries(ENCHANT_STONES.map(s=>[s.id,s])));
const ARMOR_SLOTS=new Set(['helmet','armor','cloak','gloves','boots','shield','armguard']);
const decimal=n=>typeof n==='string'&&/^[1-9]\d*$/.test(n);
export function enchantableTrack(item,track){return item?.slot==='weapon'||track==='element'&&ARMOR_SLOTS.has(item?.slot);}
export function enchantInfo(gear,track){
 const current=gear?.enchantment?.[track],count=current?.count||'0',n=Number(count),fraction=1-10/(n+10);
 return{kind:current?.kind||null,count,chance:.5/(1+n/5),damage:10*fraction,resistance:15*fraction,procChance:.1*fraction};
}
export function validEnchantment(value,item){
 if(value===undefined)return true;
 if(!value||typeof value!=='object'||Array.isArray(value)||value.version!==1||Object.keys(value).some(k=>!['version','element','special'].includes(k))||!value.element&&!value.special)return false;
 for(const track of ['element','special'])if(value[track]!==undefined){const v=value[track];if(!enchantableTrack(item,track)||!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).some(k=>!['kind','count'].includes(k))||!(track==='element'?ELEMENTS:SPECIALS).includes(v.kind)||!decimal(v.count))return false;}
 return true;
}
export function inheritedEnchantment(pair,choices={}){
 if(!choices||typeof choices!=='object'||Array.isArray(choices)||Object.keys(choices).some(k=>!['element','special'].includes(k)))return{ok:false,error:'附魔繼承選擇無效'};
 const output={version:1},selected={};
 for(const track of ['element','special']){
  const available=pair.filter(e=>e.enchantment?.[track]);let pick=available[0];
  if(available.length===2){pick=available.find(e=>e.uid===choices[track]);if(!pick)return{ok:false,error:'請逐軌選擇要保留哪一件材料的附魔',track};}
  else if(choices[track]!==undefined&&choices[track]!==pick?.uid)return{ok:false,error:'只能繼承材料原有的附魔',track};
  if(pick){output[track]={...pick.enchantment[track]};selected[track]=pick.uid;}
 }
 return{ok:true,choices:selected,enchantment:Object.keys(output).length>1?output:undefined};
}
