// Original room masks for catalog masonry archetypes. No official layout claim.
export function buildDungeonRooms(map,points,reserved=0){
 const w=map.geometry.width_tiles,h=map.geometry.height_tiles,seed=map.geometry.layout_seed>>>0,style=map.geometry.layout_archetype,target=Math.min((w-2)*(h-2),map.geometry.walkable_tile_target+reserved),j=((seed%17)-8)/200;
 for(let pass=0;pass<45;pass++){
  const mask=new Uint8Array(w*h),road=new Uint8Array(w*h),rooms=[],corridors=[];let count=0;
  const rectangle=(x0,y0,x1,y1,isRoad=false)=>{x0=Math.max(1,Math.round(x0));y0=Math.max(1,Math.round(y0));x1=Math.min(w-2,Math.round(x1));y1=Math.min(h-2,Math.round(y1));for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const i=y*w+x;if(!mask[i]){mask[i]=1;count++}if(isRoad)road[i]=1}};
  const room=(cx,cy,rw,rh)=>{const grow=pass*.36,x=cx*w,y=cy*h;const r=[x-rw*w/2-grow,y-rh*h/2-grow,x+rw*w/2+grow,y+rh*h/2+grow];rectangle(...r);rooms.push(r.map(Math.round));return{x:Math.round(x),y:Math.round(y)}};
  const corridor=(a,b,r=2)=>{const first=(seed+Math.round(a.x+a.y))%2===0?{x:b.x,y:a.y}:{x:a.x,y:b.y};for(const[u,v]of[[a,first],[first,b]]){rectangle(Math.min(u.x,v.x)-r,Math.min(u.y,v.y)-r,Math.max(u.x,v.x)+r,Math.max(u.y,v.y)+r,true);corridors.push([u,v])}};
  const ring=(x0,y0,x1,y1)=>{const r=2+Math.floor(pass*.3),a={x:Math.round(w*x0),y:Math.round(h*y0)},b={x:Math.round(w*x1),y:Math.round(h*y1)};rectangle(a.x-r,a.y-r,b.x+r,a.y+r,true);rectangle(a.x-r,b.y-r,b.x+r,b.y+r,true);rectangle(a.x-r,a.y-r,a.x+r,b.y+r,true);rectangle(b.x-r,a.y-r,b.x+r,b.y+r,true);corridors.push([a,{x:b.x,y:a.y}],[{x:b.x,y:a.y},b],[b,{x:a.x,y:b.y}],[{x:a.x,y:b.y},a]);return{a,b}};
  if(style==='中心廳加四條分岔'){
   const center=room(.5+j,.5,.25,.25);for(const[cx,cy,rw,rh]of[[.16,.5,.22,.28],[.84,.5,.22,.28],[.5,.16,.28,.22],[.5,.84,.28,.22]])corridor(center,room(cx,cy,rw,rh));
  }else if(style==='階梯式三段深度'){
   const a=room(.21,.23,.32,.30),b=room(.5+j,.5,.32,.30),c=room(.79,.77,.32,.30);corridor(a,b);corridor(b,c);corridor(b,room(.20,.73,.20,.18));corridor(b,room(.80,.27,.20,.18));
  }else if(style==='偏心環廊加回撤側室'){
   const r=ring(.18+j,.20,.78+j,.82);for(const[cx,cy,rw,rh]of[[.13,.50,.18,.28],[.80,.30,.24,.20],[.45,.84,.25,.20]]){const c=room(cx,cy,rw,rh);corridor(c,{x:Math.max(r.a.x,Math.min(r.b.x,c.x)),y:c.y>h*.6?r.b.y:r.a.y})}room(.47,.28,.25,.20);
  }else if(style==='外圈巡路與內部死角'){
   const r=ring(.12,.13,.88,.87);for(const[cx,cy,side]of[[.32,.35,'top'],[.68,.36,'right'],[.33,.69,'left'],[.68,.70,'bottom']]){const c=room(cx,cy,.24,.22),to=side==='top'?{x:c.x,y:r.a.y}:side==='bottom'?{x:c.x,y:r.b.y}:side==='left'?{x:r.a.x,y:c.y}:{x:r.b.x,y:c.y};corridor(c,to)}
  }else if(style==='兩個主環與窄橋'){
   const l=ring(.10,.17,.42,.83),r=ring(.58,.17,.90,.83);corridor({x:l.b.x,y:Math.round(h*.5)},{x:r.a.x,y:Math.round(h*.5)},1);room(.25,.20,.22,.16);room(.75,.80,.22,.16);room(.25,.80,.22,.16);room(.75,.20,.22,.16);
  }else throw Error('Unsupported masonry archetype '+style);
  // Exact protected points receive short orthogonal access, not diagonal blob cuts.
  for(const raw of points){const p={x:Math.round(raw.x),y:Math.round(raw.y)};if(mask[p.y*w+p.x])continue;let near=null;for(let r=1;r<Math.max(w,h)&&!near;r++)for(let d=-r;d<=r&&!near;d++)for(const[x,y]of[[p.x+d,p.y-r],[p.x+d,p.y+r],[p.x-r,p.y+d],[p.x+r,p.y+d]])if(x>0&&y>0&&x<w-1&&y<h-1&&mask[y*w+x]){near={x,y};break}if(!near)throw Error('Empty room layout');rectangle(p.x-2,p.y-2,p.x+2,p.y+2,true);corridor(p,near)}
  if(count>=target)return{mask,road,count,rooms,corridors,archetype:style};
 }
 throw Error('Masonry target area could not be reached: '+map.id);
}

export const ROOM_MAPS=new Set(["MAP-DUN-DESERT-F01", "MAP-DUN-DESERT-F02", "MAP-DUN-DESERT-F03", "MAP-DUN-DESERT-F04", "MAP-DUN-IVORY-F01", "MAP-DUN-IVORY-F02", "MAP-DUN-IVORY-F03", "MAP-DUN-IVORY-F04", "MAP-DUN-IVORY-F05", "MAP-DUN-IVORY-F06", "MAP-DUN-IVORY-F07", "MAP-DUN-IVORY-F08", "MAP-DUN-TOI-F01", "MAP-DUN-TOI-F02", "MAP-DUN-TOI-F03", "MAP-DUN-TOI-F04", "MAP-DUN-TOI-F05", "MAP-DUN-TOI-F06", "MAP-DUN-TOI-F07", "MAP-DUN-TOI-F08", "MAP-DUN-TOI-F09", "MAP-DUN-TOI-F10", "MAP-DUN-TOI-F11", "MAP-DUN-TOI-F12", "MAP-DUN-TOI-F13", "MAP-DUN-TOI-F14", "MAP-DUN-TOI-F15", "MAP-DUN-TOI-F16", "MAP-DUN-TOI-F17", "MAP-DUN-TOI-F18", "MAP-DUN-TOI-F19", "MAP-DUN-TOI-F20"]);
