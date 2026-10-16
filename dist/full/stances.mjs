import {CONTENT,ITEMS} from './data.mjs';
import {activeEffects} from './rules.mjs';

// Visual bindings never alter the equipment's combat family or statistics.
export function heroStance(state,index){
 const classId=CONTENT.classes[state.player.classId],form=activeEffects(state).find(e=>e.group==='form')?.formId;
 if(form)return{consumerId:form};
 const weapon=state.inventory.equipment.find(e=>e.uid===state.equipped.weapon),itemId=weapon?.itemId,family=ITEMS[itemId]?.family||'unarmed',row=index?.classes?.[classId];
 if(!index)return{consumerId:classId+':'+family,missing:true,loading:true,family,itemId};
 const binding=row?.items?.[itemId]||row?.families?.[family],shield=state.inventory.equipment.find(e=>e.uid===state.equipped.shield),variant=binding?.shieldVariants?(ITEMS[shield?.itemId]?.slot==='shield'?'with-shield':'without-shield'):null,selected=variant?binding.shieldVariants[variant]:binding,key=classId+':'+(row?.items?.[itemId]?itemId:family)+(variant?':'+variant:'');
 if(!selected||!['accepted-default','source-reviewed-candidate','integration-candidate'].includes(selected.status))return{consumerId:key,missing:true,family,itemId};
 return{consumerId:!variant&&selected.status==='accepted-default'?classId:key,manifest:selected.manifest,family,itemId};
}
