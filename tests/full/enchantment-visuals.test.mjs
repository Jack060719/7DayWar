import test from 'node:test';
import assert from 'node:assert/strict';
import {visibleEnchantment,equippedEnchantment} from '../../dist/full/enchantment-visuals.mjs';
test('only identified equipped element tracks produce color, with no state mutation',()=>{
 const gear=(uid,itemId,kind,identified=true)=>({uid,itemId,identified,enchantment:{version:1,element:{kind,count:'1'}}});
 const s={inventory:{equipment:[gear('w','EQ-DAGGER','fire'),gear('a','EQ-LEATHER-ARMOR','water'),gear('b','EQ-LEATHER-ARMOR','wind',false)]},equipped:{weapon:'w',armor:'a',cloak:'b'}},before=JSON.stringify(s);
 assert.deepEqual(equippedEnchantment(s),{weapon:'fire',armor:['water']});assert.equal(visibleEnchantment(s.inventory.equipment[2]),null);assert.equal(JSON.stringify(s),before);
 for(const kind of['fire','water','wind','earth'])assert.equal(visibleEnchantment(gear('w','EQ-DAGGER',kind)),kind);
 delete s.equipped.weapon;assert.equal(equippedEnchantment(s).weapon,null);assert.equal(visibleEnchantment({...s.inventory.equipment[0],enchantment:{version:1,special:{kind:'slow',count:'1'}}}),null);
});
