/* Explicit original completion decisions. These are not official Classic data. */
export const SUPPLEMENT_VERSION='AC-RUNTIME-DECISIONS-2';
export const RECIPES=[
{id:'RCP-RUNTIME-LADA-LEATHER',npcId:'NPC-CANON-LADA',inputs:{'ITEM-LEATHER':12},fee:200,output:'EQ-LEATHER-ARMOR'},
{id:'RCP-RUNTIME-JULIE-BOW',npcId:'NPC-CANON-JULIE',inputs:{'ITEM-LEATHER':15,'ITEM-IRON':5},fee:800,output:'EQ-ELVEN-BOW'},
{id:'RCP-RUNTIME-VINCENT-SWORD',npcId:'NPC-CANON-VINCENT',inputs:{'ITEM-IRON':15},fee:500,output:'EQ-BROAD-SWORD'},
{id:'RCP-RUNTIME-MORIA-ROBE',npcId:'NPC-CANON-MORIA',classId:'mage',inputs:{'ITEM-LEATHER':12,'ITEM-SAPPHIRE':1},fee:800,output:'EQ-MAGE-ROBE'}];
export const TOTEM_EXCHANGE={id:'QUEST-RUNTIME-TOTEM-EXCHANGE',npcId:'NPC-ELF-WARDEN',count:10,reward:250,items:['ITEM-TOTEM-ATUBA','ITEM-TOTEM-GANDI','ITEM-TOTEM-NERUGA','ITEM-TOTEM-DUDAMARA','ITEM-TOTEM-ROVA']};
// Provisional availability only: these existing retail NPCs already sell red/green
// potions and both travel scrolls. Blue uses the catalog's Giran supply prices.
const STARTER_SUPPLY_NPCS=new Set(['NPC-TALKING-SUPPLY','NPC-SILVER-SUPPLY','NPC-ELF-SUPPLY']);
export function serviceStock(npc){
 const stock=[...(npc.shop_stock||[])],extra=[];
 if(STARTER_SUPPLY_NPCS.has(npc.id)&&npc.service==='sell_consumables')extra.push({item_id:'ITEM-BLUE-POTION',purchase_price_adena:500,sale_price_adena:125,stock_quantity:'unlimited_npc_supply',origin:'assistant_design',availability_status:'provisional_starter_supply',price_source_npc_id:'NPC-GIRAN-SUPPLY'});
 if(npc.id==='NPC-HEINE-SUPPLY')extra.push({item_id:'ITEM-EVA-BLESSING',purchase_price_adena:300,sale_price_adena:75},{item_id:'ITEM-MERMAID-SCALE',purchase_price_adena:120,sale_price_adena:30});
 for(const row of extra)if(!stock.some(existing=>existing.item_id===row.item_id))stock.push(row);
 return stock;
}
export const SURFACE_RETURN={TALKING:'TALKING',GLUDIN:'GLUDIN',ELF:'ELF',WINDAWOOD:'WINDAWOOD',SILVER:'SILVER',DRAGON:'GIRAN',HEINE:'HEINE',FIRE:'WERLD',OREN:'OREN',ADEN:'ADEN',TWILIGHT:'ADEN',WIND:'ADEN',KENT:'KENT',GIRAN:'GIRAN'};
export const ARMED_MONSTERS=['MON-ORC','MON-ORC-ARCHER','MON-ORC-FIGHTER','MON-SKELETON','MON-SKELETON-ARCHER','MON-BLACK-KNIGHT'];
export const POTION_MONSTERS=['MON-ORC-FIGHTER','MON-BLACK-KNIGHT'];
