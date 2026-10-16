import test from 'node:test';
import assert from 'node:assert/strict';
import {equipmentName,itemQuality,ITEM_COLORS,groundItemPresentation} from '../../dist/full/item-presentation.mjs';
import {FUSION_SCROLLS} from '../../dist/full/fusion-policy.mjs';

test('unknown equipment and all fusion scroll variants conceal quality, tier and abilities on the ground',()=>{
 const gear={itemId:'EQ-LEATHER-ARMOR',identified:false,plus:17,quality:'blessed',blessingStat:'STR'},before=structuredClone(gear);
 assert.deepEqual(groundItemPresentation({gear}),{name:'未鑑定的防具',color:ITEM_COLORS.unidentified});assert.deepEqual(gear,before);
 for(const definition of FUSION_SCROLLS){const scroll={itemId:definition.id,identified:false};assert.deepEqual(groundItemPresentation({scroll}),{name:'未鑑定的融合卷',color:ITEM_COLORS.unidentified});scroll.identified=true;assert.deepEqual(groundItemPresentation({scroll}),{name:definition.name_zh,color:ITEM_COLORS[definition.quality]});}
});
test('identified equipment names prefix enhancement and preserve blessing details without changing state',()=>{
 for(const quality of ['normal','blessed']){const gear={itemId:'EQ-LEATHER-ARMOR',identified:true,plus:4,quality,blessingStat:'STR'},before=structuredClone(gear);assert.equal(itemQuality(gear),quality);assert.equal(equipmentName(gear),quality==='blessed'?'+4 祝福的皮甲 · 力量 +1':'+4 皮甲');assert.deepEqual(groundItemPresentation({gear}),{name:equipmentName(gear),color:ITEM_COLORS[quality]});assert.deepEqual(gear,before);}
 assert.equal(itemQuality({identified:true,itemId:'EQ-DAGGER'}),'normal');assert.equal(equipmentName({identified:true,itemId:'EQ-DAGGER',plus:0}),'+0 匕首');
});
