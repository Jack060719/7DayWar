import {uid} from '../../dist/full/rules.mjs';
import {createWildTraits,petStatsV4} from '../../dist/full/pets-v4.mjs';

// Synthetic valid v4 state without legacy aptitude shadow fields. Production
// generation still emits the optional shadow for old presentation consumers.
export function addV4Pet(state,{type='PET-WOLF',level=1,active=false}={}){
 const id=uid(state,'pet'),pet={id,sourceId:'synthetic:'+state.id+':'+id,collarUid:uid(state,'collar'),collarInBag:true,type,name:'Synthetic v4 pet',level,x:state.player.x,y:state.player.y,map:state.player.map,hp:1,mp:0,food:100,foodAt:state.clockMs+60000,mpRegenAt:state.clockMs+8000,magicAt:0,v4At:state.clockMs,xp:'0',active,dead:false,effects:[],attackAt:state.clockMs,moveAt:state.clockMs,path:[],mode:'defend',v4:createWildTraits(state,type,state.id+':'+id)};
 const stats=petStatsV4(pet);pet.hp=stats.maxHp;pet.mp=stats.maxMp;state.pets.push(pet);return pet;
}
