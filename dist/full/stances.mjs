import {CONTENT,ITEMS} from './data.mjs';
import {activeEffects} from './rules.mjs';

// Visual bindings never alter the equipment's combat family or statistics.
export function heroStance(state,index){
 const classId=CONTENT.classes[state.player.classId],form=activeEffects(state).find(e=>e.group==='form')?.formId;
 if(form)return{consumerId:form};
 const weapon=state.inventory.equipment.find(e=>e.uid===state.equipped.weapon),itemId=weapon?.itemId,family=ITEMS[itemId]?.family||'unarmed',row=index?.classes?.[classId];
 if(!index)return{consumerId:classId+':'+family,missing:true,loading:true,family,itemId};
 const binding=row?.items?.[itemId]||row?.families?.[family],key=classId+':'+(row?.items?.[itemId]?itemId:family);
 if(!binding||!['accepted-default','source-reviewed-candidate','integration-candidate'].includes(binding.status))return{consumerId:key,missing:true,family,itemId};
 return{consumerId:binding.status==='accepted-default'?classId:key,manifest:binding.manifest,family,itemId};
}
