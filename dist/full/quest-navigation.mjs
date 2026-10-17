import {QUESTS,NPCS,MAPS,CONNECTIONS} from './data.mjs';
import {currentStep,canAccept} from './quests.mjs';
import {distance,worldRoute,crossing,geometry,findPath,walkable} from './world.mjs';

export function questDestination(s,id){
 const q=QUESTS[id],a=s.quests.active[id];
 if(!q||!a&&canAccept(s,id))return null;
 const step=a?currentStep(s,id):{type:'talk',npc_id:q.start_npc_id};
 if(!step)return null;
 if(['talk','return_and_report'].includes(step.type)){
  const n=NPCS[step.npc_id||q.end_npc_id];
  return {kind:'npc',mapId:n.map_id,x:n.position_tiles[0],y:n.position_tiles[1],radius:n.interaction_radius_tiles,npcId:n.id,label:n.name_zh.replace('（自設）','')};
 }
 const mapId=step.map_id||step.population_ref,map=MAPS[mapId];
 if(s.player.map!==mapId)return {kind:step.type,mapId,label:map.name_zh};
 if(step.type==='travel'){
  // Already on the island does not satisfy a required ship journey.
  const ship=Object.values(CONNECTIONS).find(c=>c.mode===step.mode&&c.to_map_id===mapId);
  return ship?{kind:'travel',mapId:ship.from_map_id,label:MAPS[ship.from_map_id].name_zh}:null;
 }
 if(step.type==='survey'){
  const l=map.landmarks.filter(l=>step.landmark_ids.includes(l.id)&&!a.landmarks.includes(l.id)).sort((a,b)=>distance(s.player,{x:a.tile_x,y:a.tile_y})-distance(s.player,{x:b.tile_x,y:b.tile_y}))[0];
  return l?{kind:'landmark',mapId,x:l.tile_x,y:l.tile_y,radius:l.interaction_radius_tiles,landmarkId:l.id,label:l.name_zh}:null;
 }
 if(step.type==='kill'){
  const eligible=m=>step.target_monster_ids.includes(m.type)&&(!step.target_population_ids||step.target_population_ids.includes(m.populationId));
  const monster=s.worlds[mapId].monsters.filter(m=>!m.captured&&!m.summoned&&eligible(m)).sort((a,b)=>Number(b.hp>0)-Number(a.hp>0)||distance(s.player,a)-distance(s.player,b))[0];
  let point=monster?.hp>0?monster:monster?.origin;
  if(!point){
   const binding=map.inhabitant_assignment?.spawn_bindings.find(b=>step.target_monster_ids.includes(b.monster_id)&&(!step.target_population_ids||step.target_population_ids.includes(b.population_id)));
   const zone=map.encounter_layout?.zones.find(z=>binding?.allowed_zone_ids?.includes(z.id));
   point=binding?.fixedCell||(binding?.boss_tile?{x:binding.boss_tile.tile_x,y:binding.boss_tile.tile_y}:zone?{x:Math.round((zone.rectangle_tiles[0]+zone.rectangle_tiles[2])/2),y:Math.round((zone.rectangle_tiles[1]+zone.rectangle_tiles[3])/2)}:null);
  }
  return point?{kind:'kill',mapId,x:point.x,y:point.y,radius:3,label:map.name_zh+'任務怪物區'}:null;
 }
 return null;
}

export function questRouteStep(s,id){
 const target=questDestination(s,id);
 if(!target)return {error:'目前沒有可尋路的任務目標'};
 let goal=target;
 if(s.player.map!==target.mapId){
  const route=worldRoute(s.player.map,target.mapId),connectionId=route?.[0],cross=connectionId&&crossing(connectionId,s.player.map);
  if(!cross)return {error:'找不到通往任務目標的路線'};
  goal={...cross.entrance,radius:1,connectionId};
 }
 if(distance(s.player,goal)<=goal.radius){
  if(goal.connectionId)return CONNECTIONS[goal.connectionId].transport_parameters?{transport:goal.connectionId}:{command:{type:'travel',connectionId:goal.connectionId}};
  return {arrived:target};
 }
 const g=geometry(s.player.map),points=[];
 for(let y=goal.y-goal.radius;y<=goal.y+goal.radius;y++)for(let x=goal.x-goal.radius;x<=goal.x+goal.radius;x++)if(walkable(g,x,y))points.push({x,y});
 points.sort((a,b)=>distance(s.player,a)-distance(s.player,b));
 for(const point of points)if(findPath(g,s.player,point))return {command:{type:'move',...point}};
 return {error:'無法抵達任務目標，請確認通道或改從另一側靠近'};
}
