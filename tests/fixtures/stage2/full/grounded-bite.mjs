import{project,distance,lineOfSight,walkable,canStep}from'./world.mjs';
// Original presentation interpretation: a grounded reach within part of one cell.
// This helper never changes actor coordinates, gameplay range or damage.
export function groundedBiteOffset({from,to,muzzle,anchor,sourceHeight,displayHeight,targetHeight=72,age,contactMs,durationMs,geometry:g}){
 const zero={x:0,y:0};if(!g||!muzzle||!anchor||!(sourceHeight>0)||!(displayHeight>0)||!(contactMs>0)||!(durationMs>contactMs)||age<0||age>=durationMs||distance(from,to)<.01||distance(from,to)>1||!lineOfSight(g,from,to))return zero;
 const a=project(from.x,from.y),b=project(to.x,to.y),factor=displayHeight/sourceHeight;
 const rx=b.x-a.x,ry=b.y-a.y,reachX=rx-(muzzle[0]-anchor[0])*factor,reachY=ry-Math.min(18,targetHeight*.18)-(muzzle[1]-anchor[1])*factor;
 const fractionNeeded=(reachX*rx+reachY*ry)/(rx*rx+ry*ry);if(!Number.isFinite(fractionNeeded)||fractionNeeded<=0)return zero;
 // Remain on the existing ground-cell approach ray; never lift the animal to a torso.
 const travel=Math.min(.75,fractionNeeded),delta={x:(to.x-from.x)*travel,y:(to.y-from.y)*travel};
 // Check the actual ground trajectory, including measured thin barriers.
 let previous={x:Math.round(from.x),y:Math.round(from.y)};for(let i=1;i<=12;i++){const cell={x:Math.round(from.x+delta.x*i/12),y:Math.round(from.y+delta.y*i/12)};if(!walkable(g,cell.x,cell.y)||(cell.x!==previous.x||cell.y!==previous.y)&&!canStep(g,previous,cell))return zero;previous=cell;}
 const start=contactMs*.25,smooth=t=>t*t*(3-2*t),fraction=age<=start?0:age<=contactMs?smooth((age-start)/(contactMs-start)):1-smooth((age-contactMs)/(durationMs-contactMs));
 return fraction===0?zero:{x:delta.x*fraction,y:delta.y*fraction};
}
