// Group movement uses existing race, camp, range and cooldown data; it adds no combat numbers.
import {monsterDefinition} from './silver-monsters.mjs';
import {distance,canStep,lineOfSight} from './world.mjs';
const backline=actor=>{const def=monsterDefinition(actor);return actor.hp>0&&def.range_cells>1&&['ranged','caster'].includes(def.role)};
function sameGroup(a,b){
 const da=monsterDefinition(a),db=monsterDefinition(b);
 return a===b||a.fieldCampId&&a.fieldCampId===b.fieldCampId||a.campId&&a.campId===b.campId||da.racial_assistance&&db.racial_assistance&&da.race_group===db.race_group||a.type===b.type;
}
export function backlineChaser(monster,monsters,players){
 const def=monsterDefinition(monster),canCover=def.role==='melee'||def.abilities.some(ability=>ability.effect==='root');
 if(!canCover)return null;
 const candidates=players.filter(player=>{const ally=monsters.get(player.targetId);return ally&&player.hp>0&&!player.death&&!player.voyage&&backline(ally)&&sameGroup(monster,ally)&&distance(monster,ally)<=Math.max(def.assist_radius||0,def.range_cells)&&distance(player,ally)<=monsterDefinition(ally).range_cells});
 candidates.sort((a,b)=>distance(monster,a)-distance(monster,b));return candidates[0]||null;
}
export function retreatCell(monster,target,g,occupied,range){
 if(range<=1||distance(monster,target)>1)return null;
 const current=distance(monster,target),candidates=[];
 for(const [dx,dy] of [[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]]){
  const point={x:monster.x+dx,y:monster.y+dy};
  if(distance(point,target)>current&&distance(point,monster.origin)<=monsterDefinition(monster).leash_cells&&canStep(g,monster,point)&&!occupied.some(actor=>actor!==monster&&actor.hp>0&&actor.x===point.x&&actor.y===point.y)&&lineOfSight(g,point,target))candidates.push(point);
 }
 candidates.sort((a,b)=>distance(b,target)-distance(a,target));return candidates[0]||null;
}
