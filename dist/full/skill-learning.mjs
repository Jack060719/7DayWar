import {SKILLS,NPCS} from './data.mjs';
import {consume,count,random} from './rules.mjs';
import {distance,geometry,lineOfSight} from './world.mjs';
import {masteryInfo,recordMasterySuccess} from './skill-mastery.mjs';

export function learningLocation(s,id){
 const p=s.player;
 const sites=id.startsWith('SKILL-G')?Object.values(NPCS).filter(n=>n.service==='skill_learning'):id.startsWith('SKILL-ELF-')?[NPCS['NPC-CANON-MOTHER-TREE']]:null;
 if(!sites)return{ok:true,label:'不限制學習地點'};
 const label=id.startsWith('SKILL-ELF-')?'妖精森林母親樹':'正義／邪惡神殿';
 const ok=sites.some(n=>n&&n.map_id===p.map&&distance(p,{x:n.position_tiles[0],y:n.position_tiles[1]})<=2&&lineOfSight(geometry(p.map),p,{x:n.position_tiles[0],y:n.position_tiles[1]}));
 return{ok,label,error:ok?undefined:'請在'+label+'兩格內閱讀'};
}
export function learnSkill(s,id,events=[]){
 const p=s.player,k=SKILLS[id],fail=error=>({ok:false,error});
 if(!k||!(p.classId in k.class_min_levels)||p.level<k.class_min_levels[p.classId])return fail('職業或等級不符');
 if(p.death||p.cast||p.voyage||p.recovery)return fail('請先結束死亡、施法、航行或療養再閱讀');
 const location=learningLocation(s,id);if(!location.ok)return fail(location.error);
 if(!count(s,k.book_id))return fail('行囊沒有對應技能書');
 if(!p.skills.includes(id)){consume(s,k.book_id);p.skills.push(id);events.push({type:'learn',skillId:id});return{ok:true,learned:true};}
 const before=masteryInfo(s,id);consume(s,k.book_id);const success=random(s)<before.chance;
 const after=success?recordMasterySuccess(s,id):before;
 events.push({type:'mastery',skillId:id,success,count:after.count,direction:after.direction,bonus:after.bonus});
 return{ok:true,mastery:{success,...after}};
}
