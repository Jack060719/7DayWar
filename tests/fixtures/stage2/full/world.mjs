import {ROOTED_FOUNDATIONS} from './rooted-foundations.mjs';
import {mapPortals,PORTAL_LANDINGS} from './portals.mjs';
import {buildDungeonRooms,ROOM_MAPS} from './dungeon-rooms.mjs';
/* Independently designed deterministic collision geometry for baseline seeds.
 * The catalog does not supply official tile masks. This algorithm is disclosed
 * as original geometry and is not an art/completeness substitute. */
import {mapStructures,movementEdgeKey,SERVICE_COURTS} from './structures.mjs';
import {MAPS,CONNECTIONS,mapConnections,mapNPCs} from './data.mjs';
export const distance=(a,b)=>Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y));
export const project=(x,y)=>({x:(x-y)*32,y:(x+y)*16});
export const unproject=(x,y)=>({x:x/64+y/32,y:y/32-x/64});
const hash=(x,y,seed)=>{let n=Math.imul(x+17,374761393)^Math.imul(y+31,668265263)^seed;n=Math.imul(n^(n>>>13),1274126177);return (n^(n>>>16))>>>0};
class Heap{constructor(){this.a=[]}push(v){let a=this.a,i=a.length;a.push(v);while(i){let p=(i-1)>>1;if(a[p][0]<=v[0])break;a[i]=a[p];i=p}a[i]=v}pop(){let a=this.a,top=a[0],v=a.pop();if(a.length){let i=0;while(i*2+1<a.length){let j=i*2+1;if(j+1<a.length&&a[j+1][0]<a[j][0])j++;if(a[j][0]>=v[0])break;a[i]=a[j];i=j}a[i]=v}return top}get length(){return this.a.length}}
export const NAV_METRICS={calls:0,expanded:0};
const cache=new Map();
export function geometry(mapId){if(cache.has(mapId)){const g=cache.get(mapId);cache.delete(mapId);cache.set(mapId,g);return g}const map=MAPS[mapId];if(!map)throw Error('Unknown map');const spec=map.geometry,w=spec.width_tiles,h=spec.height_tiles,mask=new Uint8Array(w*h),road=new Uint8Array(w*h),seed=spec.layout_seed>>>0;let count=0;
 const inside=(x,y)=>x>=1&&y>=1&&x<w-1&&y<h-1;
 const clear=(x,y,r=0)=>{x=Math.round(x);y=Math.round(y);for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++)if(dx*dx+dy*dy<=r*r+1&&inside(x+dx,y+dy)){let i=(y+dy)*w+x+dx;if(!mask[i]){mask[i]=1;count++}road[i]=1}};
 const points=[...(map.anchors||[]).map(a=>({x:a.tile_x,y:a.tile_y})),...(map.landmarks||[]).map(a=>({x:a.tile_x,y:a.tile_y})),...mapNPCs(mapId).map(n=>({x:n.position_tiles[0],y:n.position_tiles[1]})),...(map.encounter_layout?.zones||[]).flatMap(z=>{let [x,y,xx,yy]=z.rectangle_tiles;return [{x,y},{x:xx,y:yy},{x:(x+xx)>>1,y:(y+yy)>>1}]})];
 if(!points.length)points.push({x:w>>1,y:h>>1});if(ROOM_MAPS.has(mapId)){const rooms=buildDungeonRooms(map,points,mapStructures(mapId).reduce((n,b)=>n+b.blocked.length+(b.nonStandable?.length||0),0));return finishGeometry(mapId,w,h,rooms.mask,rooms.road,new Uint8Array(w*h),rooms.count,seed,'original-masonry-rooms-1',{roomLayout:{rooms:rooms.rooms,corridors:rooms.corridors,archetype:rooms.archetype}})}const radius=Math.max(1,Math.min(2,Math.floor(spec.corridor_width_tiles/2))); // Five-cell routes preserve retreat clearance at mobile camera scale.
 const line=(a,b)=>{let n=Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y));for(let k=0;k<=n;k++)clear(a.x+(b.x-a.x)*k/Math.max(1,n),a.y+(b.y-a.y)*k/Math.max(1,n),radius)};
 // Nearest connected anchor tree plus a perimeter loop, preserving retreats.
 const connected=[points[0]],remaining=points.slice(1);clear(points[0].x,points[0].y,radius);
 while(remaining.length){let best=Infinity,ai=0,bi=0;for(let a=0;a<connected.length;a++)for(let b=0;b<remaining.length;b++){let d=distance(connected[a],remaining[b]);if(d<best){best=d;ai=a;bi=b}}let p=remaining.splice(bi,1)[0];line(connected[ai],p);connected.push(p)}
 const ordered=[...points].sort((a,b)=>Math.atan2(a.y-h/2,a.x-w/2)-Math.atan2(b.y-h/2,b.x-w/2));for(let n=0;n<ordered.length;n++)line(ordered[n],ordered[(n+1)%ordered.length]);
 // Original scenic enclosure: preserve the route network, reserve irregular solid
 // masses beside encounter clearings so collision and visible rock/vegetation agree.
 const scenic=new Uint8Array(w*h),centers=(map.encounter_layout?.zones||[]).map(z=>({x:(z.rectangle_tiles[0]+z.rectangle_tiles[2])>>1,y:(z.rectangle_tiles[1]+z.rectangle_tiles[3])>>1}));
 if(!centers.length)centers.push(...(map.landmarks||[]).map(l=>({x:l.tile_x,y:l.tile_y})));
 for(const center of centers)for(let n=0;n<6;n++){const angle=n*Math.PI/3+(hash(center.x,center.y,seed)%100)/100,reach=7+(hash(n,center.y,seed)%4),cx=Math.round(center.x+Math.cos(angle)*reach),cy=Math.round(center.y+Math.sin(angle)*reach),r=3+(hash(center.x,n,seed)%3);for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){const x=cx+dx,y=cy+dy;if(!inside(x,y)||road[y*w+x]||dx*dx+dy*dy>r*r+(hash(x,y,seed)%3))continue;scenic[y*w+x]=1}}
 const target=Math.max(count,Math.min((w-2)*(h-2),spec.walkable_tile_target||Math.round(w*h*spec.walkable_fraction_target))),seen=new Uint8Array(w*h),frontier=new Heap();
 const add=(x,y)=>{if(!inside(x,y))return;const i=y*w+x;if(mask[i]||seen[i]||scenic[i])return;seen[i]=1;const coarse=hash(x>>4,y>>4,seed)/4294967296,detail=hash(x,y,seed)/4294967296;frontier.push([coarse*4+detail,i])};
 for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++)if(mask[y*w+x]){add(x-1,y);add(x+1,y);add(x,y-1);add(x,y+1)}
 while(count<target&&frontier.length){const [,i]=frontier.pop(),x=i%w,y=(i/w)|0;mask[i]=1;count++;add(x-1,y);add(x+1,y);add(x,y-1);add(x,y+1)}
 return finishGeometry(mapId,w,h,mask,road,scenic,count,seed);
}
function finishGeometry(mapId,w,h,mask,road,scenic,count,seed,geometryVersion='original-enclosure-2',details={}){
 // Authored starter market replaces unrelated procedural walls with an open service court.
 const court=SERVICE_COURTS[mapId];if(court)for(let y=court[1];y<=court[3];y++)for(let x=court[0];x<=court[2];x++){const i=y*w+x;if(!mask[i]){mask[i]=1;count++}scenic[i]=0}
 for(const [x,y]of PORTAL_LANDINGS[mapId]||[]){const i=y*w+x;if(!mask[i]){mask[i]=1;count++}road[i]=1;scenic[i]=0}
 const structures=[...mapStructures(mapId),...mapPortals(mapId)],structureMask=new Uint8Array(w*h),rootedFoundations=ROOTED_FOUNDATIONS.filter(b=>b.mapId===mapId),colliders=[...structures,...rootedFoundations];for(const b of colliders){for(const [dx,dy]of [...b.blocked,...(b.nonStandable||[])]){const i=(b.y+dy)*w+b.x+dx;structureMask[i]=1;if(mask[i]){mask[i]=0;count--}road[i]=0}for(const [dx,dy]of b.passable){const i=(b.y+dy)*w+b.x+dx;if(!mask[i]){if(b.kind==='portal')throw Error('Portal approach is not terrain-walkable: '+b.id);mask[i]=1;count++}road[i]=1}}
 const structureEdges=new Set;for(const b of colliders)for(const [a,c]of b.blockedEdges||[])structureEdges.add(movementEdgeKey({x:b.x+a[0],y:b.y+a[1]},{x:b.x+c[0],y:b.y+c[1]}));
 const out={rootedFoundations,structureEdges,structureMask,structures,mapId,width:w,height:h,mask,road,scenic,geometryVersion,...details,walkableCount:count,seed};cache.set(mapId,out);while(cache.size>3)cache.delete(cache.keys().next().value);return out;
}
export function walkable(g,x,y){x=Math.round(x);y=Math.round(y);return x>=0&&y>=0&&x<g.width&&y<g.height&&g.mask[y*g.width+x]===1}
export function canStep(g,a,b){if(distance(a,b)>1||g.structureEdges?.size&&g.structureEdges.has(movementEdgeKey(a,b))||!walkable(g,b.x,b.y))return false;const dx=b.x-a.x,dy=b.y-a.y;return !dx||!dy||(walkable(g,a.x+dx,a.y)&&walkable(g,a.x,a.y+dy))}
export function nearestWalkable(g,point,limit=Math.max(g.width,g.height)){let x=Math.round(point.x),y=Math.round(point.y);if(walkable(g,x,y))return{x,y};for(let r=1;r<=limit;r++)for(let d=-r;d<=r;d++)for(const p of [[x+d,y-r],[x+d,y+r],[x-r,y+d],[x+r,y+d]])if(walkable(g,...p))return{x:p[0],y:p[1]};return null}
export function lineOfSight(g,a,b){let x=Math.round(a.x),y=Math.round(a.y),tx=Math.round(b.x),ty=Math.round(b.y),dx=Math.abs(tx-x),dy=Math.abs(ty-y),sx=Math.sign(tx-x),sy=Math.sign(ty-y),ix=0,iy=0;if(!walkable(g,x,y)||!walkable(g,tx,ty))return false;while(ix<dx||iy<dy){const before={x,y};let cmp=(1+2*ix)*dy-(1+2*iy)*dx;if(cmp===0){if(!walkable(g,x+sx,y)||!walkable(g,x,y+sy))return false;x+=sx;y+=sy;ix++;iy++}else if(cmp<0){x+=sx;ix++}else{y+=sy;iy++}if(!walkable(g,x,y)||g.structureEdges?.size&&g.structureEdges.has(movementEdgeKey(before,{x,y})))return false}return true}
export function findPath(g,start,end){NAV_METRICS.calls++;const a={x:Math.round(start.x),y:Math.round(start.y)},b={x:Math.round(end.x),y:Math.round(end.y)};if(!walkable(g,a.x,a.y)||!walkable(g,b.x,b.y))return null;if(a.x===b.x&&a.y===b.y)return[];const endIndex=b.y*g.width+b.x,startIndex=a.y*g.width+a.x,previous=new Int32Array(g.mask.length).fill(-1),cost=new Float64Array(g.mask.length).fill(Infinity),heap=new Heap();cost[startIndex]=0;heap.push([distance(a,b),startIndex]);const done=new Uint8Array(g.mask.length);while(heap.length){const [,id]=heap.pop();if(done[id])continue;done[id]=1;NAV_METRICS.expanded++;if(id===endIndex){const path=[];for(let n=id;n!==startIndex;n=previous[n])path.push({x:n%g.width,y:(n/g.width)|0});return path.reverse()}const p={x:id%g.width,y:(id/g.width)|0};for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const q={x:p.x+dx,y:p.y+dy};if(!canStep(g,p,q))continue;const index=q.y*g.width+q.x,next=cost[id]+1;if(next>=cost[index])continue;cost[index]=next;previous[index]=id;heap.push([next+distance(q,b),index])}}return null}
export function worldRoute(from,to){if(from===to)return[];const queue=[from],visited=new Set(queue),previous=new Map();for(let i=0;i<queue.length;i++)for(const c of mapConnections(queue[i])){const next=c.from_map_id===queue[i]?c.to_map_id:c.from_map_id;if(visited.has(next))continue;visited.add(next);previous.set(next,{map:queue[i],connectionId:c.id});if(next===to){let out=[],at=to;while(at!==from){const p=previous.get(at);out.push(p.connectionId);at=p.map}return out.reverse()}queue.push(next)}return null}
export function crossing(connectionId,from){const c=CONNECTIONS[connectionId];if(!c)return null;if(c.from_map_id===from)return{mapId:c.to_map_id,entrance:{x:c.from_tile[0],y:c.from_tile[1]},arrival:{x:c.to_tile[0],y:c.to_tile[1]},mode:c.mode};if(c.bidirectional&&c.to_map_id===from)return{mapId:c.from_map_id,entrance:{x:c.to_tile[0],y:c.to_tile[1]},arrival:{x:c.from_tile[0],y:c.from_tile[1]},mode:c.mode};return null}
