import {ITEMS} from './data.mjs';
import {FUSION_SCROLL_BY_ID} from './fusion-policy.mjs';
import {fusionScrollName} from './fusion-inventory.mjs';

export const ITEM_COLORS={unidentified:'#aaaaaa',normal:'#ffffff',blessed:'#fff0ad'};
const attributeNames={STR:'力量',DEX:'敏捷',CON:'體質',WIS:'精神',CHA:'魅力',INT:'智力'};
export function itemQuality(item){
 if(item.identified!==true)return 'unidentified';
 return (FUSION_SCROLL_BY_ID[item.itemId]?.quality||item.quality)==='blessed'?'blessed':'normal';
}
export function equipmentName(item){
 const definition=ITEMS[item.itemId];
 if(item.identified!==true)return '未鑑定的'+(definition.slot==='weapon'?'武器':'防具');
 return '+'+item.plus+' '+(item.quality==='blessed'?'祝福的':'')+definition.name_zh+(item.quality==='blessed'&&item.blessingStat?' · '+(attributeNames[item.blessingStat]||item.blessingStat)+' +1':'');
}
export function groundItemPresentation(drop){
 const item=drop.gear||drop.scroll;
 return {name:drop.gear?equipmentName(item):drop.scroll?fusionScrollName(item):drop.itemId==='ITEM-ADENA'?'金幣':ITEMS[drop.itemId]?.name_zh||'掉落物',color:item?ITEM_COLORS[itemQuality(item)]:'#c8b476'};
}
