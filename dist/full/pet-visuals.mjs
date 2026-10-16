import {PET_ATTRIBUTES,attributeQuality} from './pets-v4.mjs';

// Display-only: no RNG, mutation, or combat modifiers. The renderer checks the
// viewer's map and five-tile range before drawing an active aura.
export function petVisual(pet,owner){
 const traits=pet.v4||pet.petV4,shiny=traits?.shiny===true,ancestor=!!traits?.ancestorNature;
 const eligible=!!pet.v4&&!!owner&&pet.active&&!pet.dead&&pet.hp>0&&pet.food>0&&!pet.overCapacity&&pet.level<=owner.level;
 const auraAttributes=eligible?PET_ATTRIBUTES.filter(key=>attributeQuality(pet.type,key,traits.birth[key])==='orange'):[];
 return{shiny,ancestor,auraAttributes};
}
