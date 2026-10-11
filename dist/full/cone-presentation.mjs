import {project} from './world.mjs';

// The existing combat fan is 90 degrees, limited by Chebyshev range.
// This only maps original pixels into that projected fan; it never applies hits.
export function conePresentation(from,to,range,axis,peakLength,peakHalfWidth,scale=1){
 const dx=to.x-from.x,dy=to.y-from.y,n=Math.max(Math.abs(dx),Math.abs(dy));
 if(!n||!(range>0)||!(peakLength>0)||!(peakHalfWidth>0))return null;
 const along=project(dx/n*range,dy/n*range),across=project(-dy/n*range,dx/n*range),[ux,uy]=axis;
 const lx=along.x*scale/peakLength,ly=along.y*scale/peakLength,sx=across.x*scale/peakHalfWidth,sy=across.y*scale/peakHalfWidth;
 let polygon=[{x:-range,y:-range},{x:range,y:-range},{x:range,y:range},{x:-range,y:range}];
 for(const f of [p=>dx*p.x+dy*p.y-(dx*p.y-dy*p.x),p=>dx*p.x+dy*p.y+(dx*p.y-dy*p.x)]){
  const next=[];for(let i=0;i<polygon.length;i++){const a=polygon[i],b=polygon[(i+1)%polygon.length],fa=f(a),fb=f(b),insideA=fa>=-1e-9,insideB=fb>=-1e-9;if(insideA)next.push(a);if(insideA!==insideB){const t=fa/(fa-fb);next.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t})}}polygon=next;
 }
 return{a:lx*ux-sx*uy,b:ly*ux-sy*uy,c:lx*uy+sx*ux,d:ly*uy+sy*ux,polygon:polygon.map(p=>{const q=project(p.x,p.y);return{x:q.x*scale,y:q.y*scale}})};
}

export function coneEdgeAlpha(polygon,x,y,feather=14){
 let nearest=Infinity;
 for(let i=0;i<polygon.length;i++){const a=polygon[i],b=polygon[(i+1)%polygon.length],dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy);if(length<1e-8)continue;const inside=(dx*(y-a.y)-dy*(x-a.x))/length;if(inside<0)return 0;nearest=Math.min(nearest,inside)}
 const t=Math.max(0,Math.min(1,nearest/feather));return t*t*(3-2*t);
}
