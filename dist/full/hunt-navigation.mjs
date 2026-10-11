import {canStep,walkable} from './world.mjs';
// Uniform-cost, eight-neighbour navigation: one bounded traversal for all goals.
// Scratch buffers carry no decisions and never enter a save. Tie order is input order.
const scratch=new WeakMap();
export const HUNT_NAV_METRICS={calls:0,expanded:0,maxExpanded:0};
export function nearestHuntPath(g,start,targets,{maxDepth=Infinity}={}){
 HUNT_NAV_METRICS.calls++;
 const x=Math.round(start.x),y=Math.round(start.y),n=g.mask.length,goals=new Map();
 targets.forEach((t,rank)=>{if(walkable(g,t.x,t.y)){const id=Math.round(t.y)*g.width+Math.round(t.x);if(!goals.has(id))goals.set(id,rank)}});
 if(!goals.size||!walkable(g,x,y)||maxDepth<0)return null;
 let b=scratch.get(g);if(!b){b={seen:new Uint32Array(n),queue:new Int32Array(n),previous:new Int32Array(n),depth:new Int32Array(n),epoch:0};scratch.set(g,b)}
 if(++b.epoch>=0xffffffff){b.seen.fill(0);b.epoch=1}
 const origin=y*g.width+x;let head=0,tail=1,expanded=0,best=-1,bestRank=Infinity,bestDepth=Infinity;
 b.queue[0]=origin;b.seen[origin]=b.epoch;b.depth[origin]=0;
 while(head<tail){const id=b.queue[head++],depth=b.depth[id];if(depth>maxDepth||depth>bestDepth)break;expanded++;
  const rank=goals.get(id);if(rank!==undefined){if(rank<bestRank){best=id;bestRank=rank;bestDepth=depth}continue}
  if(depth>=maxDepth||depth>=bestDepth)continue;
  const p={x:id%g.width,y:(id/g.width)|0};
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
   if(!dx&&!dy)continue;const q={x:p.x+dx,y:p.y+dy};if(q.x<0||q.y<0||q.x>=g.width||q.y>=g.height)continue;
   const next=q.y*g.width+q.x;if(b.seen[next]===b.epoch||g.mask[next]!==1||!canStep(g,p,q))continue;
   b.seen[next]=b.epoch;b.previous[next]=id;b.depth[next]=depth+1;b.queue[tail++]=next;
  }
 }
 HUNT_NAV_METRICS.expanded+=expanded;HUNT_NAV_METRICS.maxExpanded=Math.max(HUNT_NAV_METRICS.maxExpanded,expanded);
 if(best<0)return null;
 const path=[];for(let at=best;at!==origin;at=b.previous[at])path.push({x:at%g.width,y:(at/g.width)|0});path.reverse();
 return{target:targets[bestRank],path,expanded};
}
