import{prepareSilverMigration}from'./silver-camp-state.mjs';
import{SILVER_ITEMS}from'./silver-items.mjs';
import{isFusionScroll}from'./fusion-inventory.mjs';
import{validate}from'./validate.mjs';
export{prepareSilverMigration};
export function canRestoreBeforeSilver(state){if(!state||!validate(state).ok||state.monsterRevision!==undefined)return false;let valid=true;const visit=v=>{if(!valid||!v||typeof v!=='object')return;for(const[k,x]of Object.entries(v)){if(k==='blessingStat'||(k==='quality'&&x==='blessed')||SILVER_ITEMS[k]||isFusionScroll(k)){valid=false;return;}if(['definitionProfile','campRevision','campCycles','campId','campSlotId','generation','monsterCast','resurrectionCount','revivedThisGeneration','firstDeathRespawnAt','dropRevision','scrolls','scroll','recipeRevision'].includes(k)){valid=false;return;}if(typeof x==='string'&&(SILVER_ITEMS[x]||isFusionScroll(x)||['MON-GOBLIN','MON-DWARF-WARRIOR','MON-ORC-WIZARD'].includes(x))){valid=false;return;}visit(x)}};visit(state);return valid;}
