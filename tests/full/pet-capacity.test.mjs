import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,ensureWorld,command,validate,stats,weight} from '../../dist/full/engine.mjs';
import {ITEMS,PETS,PET_HIDDEN_CHA} from '../../dist/full/data.mjs';
import {random} from '../../dist/full/rules.mjs';
import {tamingChance} from '../../dist/full/taming-policy.mjs';

const expected={knight:[12,12,2],elf:[9,21,3],mage:[8,14,2],darkelf:[9,15,2]};
for(const [classId,[visible,effective,capacity]] of Object.entries(expected))test(classId+': hidden charisma controls capacity without changing displayed attributes',()=>{
 const state=createGame(classId,'Pet capacity',undefined,37),before=JSON.stringify(state),value=stats(state);
 assert.equal(value.attrs.CHA,visible);assert.equal(value.petCHA,effective);assert.equal(value.petCapacity,capacity);assert.equal(JSON.stringify(state),before);
 assert.equal(stats(JSON.parse(before)).petCHA,effective);assert.equal(PET_HIDDEN_CHA[classId],effective-visible);
});
test('equipment charisma counts once while transient charisma does not change pet capacity',()=>{
 const state=createGame('elf','Synthetic equipment',undefined,8),item=ITEMS[state.inventory.equipment.find(e=>e.uid===state.equipped.weapon).itemId],original=item.stats;
 try{
  item.stats={...original,cha:6};
  state.player.effects.push({id:'synthetic-cha',group:'synthetic-cha',until:state.clockMs+10000,values:{CHA:60}});
  const value=stats(state);assert.equal(value.attrs.CHA,75);assert.equal(value.petCHA,27);assert.equal(value.petCapacity,4);
 }finally{item.stats=original;}
});
function wild(classId){
 const state=createGame(classId,'Capture',undefined,2);state.player.map='MAP-REG-TALKING';const monster=ensureWorld(state,state.player.map).monsters.find(m=>m.petType);
 assert(monster);Object.assign(state.player,monster.origin);monster.hp=Math.floor(monster.maxHp*.25);
 const food=PETS[monster.petType].favorite_food_item_id;state.inventory.stacks[food]=3;return{state,monster,food};
}
for(const classId of ['elf','mage','darkelf'])test(classId+': capture uses effective charisma and survives reopen without rerolling',()=>{
 const {state,monster,food}=wild(classId),value=stats(state),low=tamingChance(monster.hp,monster.maxHp,value.attrs.CHA,monster.petType),high=tamingChance(monster.hp,monster.maxHp,value.petCHA,monster.petType);
 let seed;for(let n=1;n<100000;n++){const sample=random({rng:n});if(sample>=low&&sample<high){seed=n;break;}}
 assert(seed,'deterministic draw distinguishes hidden charisma');state.rng=seed;const reopened=JSON.parse(JSON.stringify(state));
 for(const copy of [state,reopened]){
  const result=command(copy,{type:'feedWild',targetId:monster.id,itemId:food});assert.equal(result.captured,true);assert.equal(copy.inventory.stacks[food],2);
  assert.equal(copy.pets[0].sourceId,monster.id);assert(validate(copy).ok,validate(copy).errors.join());
  const captured=structuredClone(copy);assert.equal(command(copy,{type:'feedWild',targetId:monster.id,itemId:food}).ok,false);assert.deepEqual(copy,captured);
 }
 assert.deepEqual(reopened,JSON.parse(JSON.stringify(state)));
});
test('captured collar is marked tradeable and adds no carrying weight',()=>{
 const {state,monster,food}=wild('knight');state.rng=1;const before=weight(state).total;
 assert.equal(command(state,{type:'feedWild',targetId:monster.id,itemId:food}).captured,true);assert.equal(state.pets.length,1);
 assert.equal(ITEMS['ITEM-PET-COLLAR'].weight,0);assert.equal(ITEMS['ITEM-PET-COLLAR'].tradeable,true);
 assert.equal(weight(state).total,before-ITEMS[food].weight);const reopened=JSON.parse(JSON.stringify(state));assert.equal(weight(reopened).total,weight(state).total);assert.deepEqual(reopened.pets,state.pets);
});
