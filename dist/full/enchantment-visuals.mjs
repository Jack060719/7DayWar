import {ENCHANT_COLORS} from './enchantment-policy.mjs';
import {ITEMS} from './data.mjs';
export function visibleEnchantment(gear){
 const element=gear?.identified&&gear.enchantment?.element;
 return element&&/^[1-9]\d*$/.test(element.count)&&Object.hasOwn(ENCHANT_COLORS,element.kind)?element.kind:null;
}
export function equippedEnchantment(state){
 const result={weapon:null,armor:[]};
 for(const[slot,id]of Object.entries(state?.equipped||{})){
  const gear=state.inventory?.equipment.find(e=>e.uid===id),kind=visibleEnchantment(gear);if(!kind)continue;
  if(slot==='weapon'&&ITEMS[gear.itemId]?.slot==='weapon')result.weapon=kind;
  else if(['helmet','armor','cloak','gloves','boots','shield','armguard'].includes(slot)&&!result.armor.includes(kind))result.armor.push(kind);
 }
 return result;
}
