import test from 'node:test';
import assert from 'node:assert/strict';
import {petVisual} from '../../dist/full/pet-visuals.mjs';
const traits={shiny:true,ancestorNature:{type:'common'},birth:{STR:180000,DEX:200000,INT:30000,MND:50000,VIT:80000}};
const pet=()=>({type:'PET-WOLF',v4:structuredClone(traits),active:true,dead:false,hp:30,food:80,level:1,map:'map',x:2,y:3});
test('pet appearance reads owned and wild fixed traits without changing state or RNG',()=>{const p=pet(),before=JSON.stringify(p);assert.deepEqual(petVisual(p,{level:1}),{shiny:true,ancestor:true,auraAttributes:['STR','DEX']});assert.equal(JSON.stringify(p),before);assert.deepEqual(petVisual({petV4:traits}),{shiny:true,ancestor:true,auraAttributes:[]});assert.deepEqual(petVisual({}),{shiny:false,ancestor:false,auraAttributes:[]})});
test('inactive, dead, hungry, overcapacity and overlevel pets cannot display an active aura',()=>{for(const patch of[{active:false},{dead:true},{hp:0},{food:0},{overCapacity:true},{level:2}])assert.deepEqual(petVisual({...pet(),...patch},{level:1}).auraAttributes,[]);assert.deepEqual(petVisual(pet()).auraAttributes,[])});
