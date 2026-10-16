import {MAPS,CONNECTIONS,isTown} from './data.mjs';
import {geometry,crossing,findPath} from './world.mjs';

const forest=new Set(['MAP-REG-ELF','MAP-TOWN-ELF','MAP-TOWN-WILLOW']);
export function canEnterMap(player,mapId,from=player.map){return !forest.has(mapId)||forest.has(from)||player.classId==='elf'||player.forestPermit===true}
function edges(map){return Object.keys(CONNECTIONS).map(id=>({id,cross:crossing(id,map),spec:CONNECTIONS[id]})).filter(row=>row.cross)}
export function travelRoute(player,target,{boats=true}={}){
  if(player.map===target)return [];
  const queue=[player.map],seen=new Set(queue),previous=new Map;
  for(let i=0;i<queue.length;i++)for(const {id,cross,spec} of edges(queue[i])){
    if(!boats&&spec.transport_parameters||!canEnterMap(player,cross.mapId,queue[i])||seen.has(cross.mapId))continue;
    seen.add(cross.mapId);previous.set(cross.mapId,{map:queue[i],id});
    if(cross.mapId===target){const result=[];let map=target;while(map!==player.map){const step=previous.get(map);result.push(step.id);map=step.map}return result.reverse()}
    queue.push(cross.mapId);
  }
  return null;
}
const costs=new Map;
function walkingCost(map,a,b){
  const key=[map,a.x,a.y,b.x,b.y].join(':');
  if(costs.has(key))return costs.get(key);
  const value=findPath(geometry(map),a,b)?.length??Infinity;
  if(costs.size>=128)costs.delete(costs.keys().next().value);costs.set(key,value);return value;
}
// Each graph node is a concrete arrival tile. Edges charge actual legal grid
// steps to the next exit, so a visually close but blocked town does not win.
export function nearestTown(player){
  if(isTown(player.map))return {mapId:player.map,steps:0};
  const queue=[{mapId:player.map,x:player.x,y:player.y,steps:0}],best=new Map;
  while(queue.length){
    queue.sort((a,b)=>a.steps-b.steps||a.mapId.localeCompare(b.mapId));
    const node=queue.shift(),key=[node.mapId,node.x,node.y].join(':');
    if(node.steps>best.get(key))continue;
    if(isTown(node.mapId))return {mapId:node.mapId,steps:node.steps};
    for(const {cross,spec} of edges(node.mapId)){
      if(spec.transport_parameters||!canEnterMap(player,cross.mapId,node.mapId))continue;
      const steps=node.steps+walkingCost(node.mapId,node,cross.entrance),nextKey=[cross.mapId,cross.arrival.x,cross.arrival.y].join(':');
      if(!Number.isFinite(steps)||steps>=(best.get(nextKey)??Infinity))continue;
      best.set(nextKey,steps);queue.push({mapId:cross.mapId,...cross.arrival,steps});
    }
  }
  return null;
}
