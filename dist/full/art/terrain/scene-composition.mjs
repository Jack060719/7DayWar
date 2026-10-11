/* Pure staging module. Does not import or mutate game geometry, renderer, or manifests.
 * Import recipe JSON separately and pass canonical binding from map-bindings.json.
 */
export const COMPOSITION_VERSION = '1.6.0-authored-landmark-composition-candidate';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a),0,1);return t*t*(3-2*t)};
export const compositionHash=(x,y,seed=1)=>{let n=Math.imul(x+17,374761393)^Math.imul(y+31,668265263)^seed;n=Math.imul(n^(n>>>13),1274126177);return(n^(n>>>16))>>>0};
export const isoProject=(x,y)=>({x:(x-y)*32,y:(x+y)*16});
const manifestAt=(manifests,family)=>manifests instanceof Map?manifests.get(family):manifests[family];
const inGrid=(g,x,y)=>x>=0&&y>=0&&x<g.width&&y<g.height;
const walk=(g,x,y)=>inGrid(g,x,y)&&g.mask[y*g.width+x]===1;
const road=(g,x,y)=>inGrid(g,x,y)&&!!g.road[y*g.width+x];
// Low-frequency material fields are continuous in world space. No tile-by-tile
// biome dice roll or camera-relative grid; soft accents cross source-patch seams.
const lerp=(a,b,t)=>a+(b-a)*t;
function materialNoise(x,y,scale,seed){
 const u=x/scale,v=y/scale,ix=Math.floor(u),iy=Math.floor(v),tx=smooth(0,1,u-ix),ty=smooth(0,1,v-iy);
 const sample=(a,b)=>compositionHash(a,b,seed)/4294967295;
 return lerp(lerp(sample(ix,iy),sample(ix+1,iy),tx),lerp(sample(ix,iy+1),sample(ix+1,iy+1),tx),ty);
}
const point=a=>({x:a.tile_x??a.x,y:a.tile_y??a.y});
export function footprintCells(x,y,footprint){
  const u=footprint.u||.5,v=footprint.v||.5,eps=1e-7,out=[];
  for(let yy=Math.floor(y-v/2+.5+eps);yy<=Math.ceil(y+v/2-.5-eps);yy++)for(let xx=Math.floor(x-u/2+.5+eps);xx<=Math.ceil(x+u/2-.5-eps);xx++)out.push({x:xx,y:yy});
  return out;
}
export function footprintIsSolid(g,x,y,footprint){return footprintCells(x,y,footprint).every(p=>inGrid(g,p.x,p.y)&&!walk(g,p.x,p.y)&&!road(g,p.x,p.y));}
function regionAt(map,g,x,y,recipe){
 const spec=recipe.mapRecipes?.[map.id||g.mapId];let active=null,blend=0;
 for(const r of spec?.regions||[]){let q=Infinity,w=0;if(r.shape==='ellipse'){q=Math.hypot((x/g.width-r.cx)/r.rx,(y/g.height-r.cy)/r.ry);w=1-smooth(1-r.feather,1+r.feather,q);}else if(r.shape==='outside-service-court'){const [x0,y0,x1,y1]=r.courtBounds;const distance=Math.max(x0-x,x-x1,y0-y,y-y1,0);w=smooth(0,r.featherTiles||4,distance);if(r.keepPrimaryRoads){const xx=Math.round(x),yy=Math.round(y),halo=r.roadFeatherTiles||2;let nearest=halo+1;for(let dy=-halo;dy<=halo;dy++)for(let dx=-halo;dx<=halo;dx++)if(road(g,xx+dx,yy+dy))nearest=Math.min(nearest,Math.hypot(dx,dy));w*=smooth(0,halo,nearest);}}if(w>0){active=r;blend=w;}}
 return {active,blend};
}
function materialRole(g,x,y){
 if(!walk(g,x,y))return 'solid';
 if(road(g,x,y)){const interior=[[2,0],[-2,0],[0,2],[0,-2]].every(([dx,dy])=>road(g,x+dx,y+dy));return interior?'road':'roadMargin';}
 const edge=[[1,0],[-1,0],[0,1],[0,-1],[2,0],[-2,0],[0,2],[0,-2]].some(([dx,dy])=>road(g,x+dx,y+dy)||!walk(g,x+dx,y+dy));
 return edge?'roadMargin':'field';
}
function poolFor(m,role,recipe){const explicit=recipe.materialPools?.[m.family]?.[role];if(explicit)return explicit.map(i=>m.tiles[i]).filter(Boolean);const expression=role==='road'?/path|compacted|track|worn|soil|sand|floor|dust/i:role==='solid'?/rock|stone|moss|grit|rubble|slate/i:/dirt|soil|grit|dust|floor|sand/i;const candidates=m.tiles.filter(a=>expression.test(a.name));return candidates.length?candidates:m.tiles;}
function artClone(entry,scale=1,overrides={}){
 const r=entry.rect,a=entry.footAnchor||entry.anchor||{x:r.w/2,y:r.h*.92},anchor=Array.isArray(a)?{x:a[0],y:a[1]}:{...a};const d=entry.drawSize||{w:r.w,h:r.h};
 return {...entry,anchor:{...anchor},footAnchor:{...anchor},drawSize:{w:d.w*scale,h:d.h*scale},...overrides};
}
function naturalPools(m,recipe,mapPools){const props=m?.props||[],explicit=mapPools?.[m.family]||recipe.propPools?.[m.family];if(explicit)return Object.fromEntries(['trees','snags','rocks','brush','roots','low','manmade'].map(k=>[k,(explicit[k]||[]).map(i=>props[i]).filter(Boolean)]));return {
 trees:props.filter(a=>/mature-oak|sparse-old-oak|old-pine|crooked-birch|stunted wind-bent pine/i.test(a.name)),
 snags:props.filter(a=>/snag|dead-conifer|dead-sapling|dead alpine tree/i.test(a.name)),
 rocks:props.filter(a=>/boulder|crag|forest-rocks|slate rocks|lichen-covered flat slab|root-covered stone|rockpool-slab|flint-cluster/i.test(a.name)),
 brush:props.filter(a=>/thorn-bush|thorn-scrub|alpine thorn scrub/i.test(a.name)),
 roots:props.filter(a=>/root-cluster|split-stump|oak-log|driftwood-stump|rooted-stump|branch-pile/i.test(a.name)),
 low:props.filter(a=>/fern|grass|pebble|wrack|kelp|mushroom-bark/i.test(a.name)),
 manmade:props.filter(a=>/sign|barrel|wheel|milestone|waymarker|pier-post|chest/i.test(a.name))
 };}
export function composeScene({geometry:g,map,manifests,binding,bounds,recipe}){
 if(!g||!map||!recipe)throw Error('composeScene requires geometry, map, manifests, binding, bounds and recipe');
 const mapId=map.id||g.mapId,specific=recipe.mapRecipes?.[mapId],primaryFamily=binding?.family||specific?.primaryFamily;
 if(!primaryFamily)throw Error('Canonical binding.family required for this map');
 if(specific&&primaryFamily!==specific.primaryFamily)throw Error('Canonical family mismatch for '+mapId+': expected '+specific.primaryFamily);
 if(!manifestAt(manifests,primaryFamily))throw Error('Missing canonical manifest '+primaryFamily);
 const b={minX:clamp(Math.floor(bounds?.minX??0),0,g.width-1),maxX:clamp(Math.ceil(bounds?.maxX??g.width-1),0,g.width-1),minY:clamp(Math.floor(bounds?.minY??0),0,g.height-1),maxY:clamp(Math.ceil(bounds?.maxY??g.height-1),0,g.height-1)},conf=recipe.composition;
 const ground=[],objects=[],assets=new Set(),omissions=new Set(),occupied=new Set(),landmarks=[...(map.landmarks||[]),...(map.anchors||[])].map(a=>({...point(a),id:a.id}));
 const palettes=new Map;for(const m of manifests instanceof Map?manifests.values():Object.values(manifests))if(m)palettes.set(m.family,naturalPools(m,recipe,specific?.propPools));
 function surface(x,y){const r=regionAt(map,g,x,y,recipe);if(r.active&&!manifestAt(manifests,r.active.family)){omissions.add('Missing secondary manifest '+r.active.family);return{family:primaryFamily,blend:0};}return{family:r.active?.family||primaryFamily,blend:r.blend,regionId:r.active?.id||'canonical-primary'};}
 const add=(entry,x,y,{scale=1,footprint,kind='natural',solid=true,groupId,exposedFace,landmarkId,canopy=false,allowWallJoin=false,drawSize,boundaryCells}={})=>{
  if(!entry)return false;const fp=footprint||entry.footprint||{u:1,v:1};if(solid&&!footprintIsSolid(g,x,y,fp))return false;
  const cells=footprintCells(x,y,fp);if(cells.some(p=>(g.rootedFoundations||[]).some(b=>b.blocked.some(([dx,dy])=>b.x+dx===p.x&&b.y+dy===p.y))))return false;if(solid&&!allowWallJoin&&cells.some(p=>occupied.has(p.x+','+p.y)))return false;
  const art=artClone(entry,scale,{...(drawSize?{drawSize}:{}),footprint:{...fp},collision:{solid,shape:solid?'existing-solid-footprint':'none'}}),foot=isoProject(x,y),id=mapId+':'+kind+':'+x.toFixed(3)+','+y.toFixed(3)+':'+entry.id;
  assets.add(art.atlas);if(solid)cells.forEach(p=>occupied.add(p.x+','+p.y));
  objects.push({id,x,y,art,kind,groupId,landmarkId,exposedFace,boundaryCells,solid,footprint:{...fp},footprintCells:cells,depth:x+y+(solid?0:.001),footY:foot.y,contactShadow:(kind==='bank'||kind==='wall-run'||kind==='authored-boundary')?{radiusX:Math.max(10,art.drawSize.w*.3),radiusY:3,opacity:.12,offsetY:1}:{radiusX:Math.max(9,fp.u*19+fp.v*7),radiusY:Math.max(3,fp.u*4+fp.v*4),opacity:solid?conf.contactShadowOpacity:.08,offsetY:2},occlusion:{enabled:canopy||art.drawSize.h>75,alpha:conf.occludedObjectAlpha,onlyWhenBehind:true,heroPaddingPx:12,canopyOverhangVisualOnly:canopy}});return true;
 };
 for (const f of specific?.authoredObjects || []) {
  if(f.x<b.minX||f.x>b.maxX||f.y<b.minY||f.y>b.maxY)continue;
  const m=manifestAt(manifests,f.family),entry=m?.[f.collection||'props']?.find(a=>a.id===f.assetId);
  if(!entry){omissions.add('Missing authored asset '+f.assetId);continue;}
  const cells=footprintCells(f.x,f.y,f.footprint);if(cells.some(p=>g.structureMask?.[p.y*g.width+p.x])){omissions.add('Authored object intersects structure '+f.id);continue;}
  if(!add(entry,f.x,f.y,{scale:f.scale,footprint:f.footprint,kind:f.kind||'authored-landmark',groupId:f.groupId,canopy:f.canopy,drawSize:f.drawSize,boundaryCells:f.boundaryCells,exposedFace:f.exposedFace,allowWallJoin:f.allowWallJoin}))omissions.add('Authored footprint withheld '+f.id);
 }
 for(let y=b.minY;y<=b.maxY;y++)for(let x=b.minX;x<=b.maxX;x++){
  const s=surface(x,y),role=materialRole(g,x,y),families=s.family===primaryFamily||s.blend>=.999?[{family:s.family,alpha:1}]:[{family:primaryFamily,alpha:1},{family:s.family,alpha:s.blend}];
  const layers=families.flatMap(({family,alpha})=>{const m=manifestAt(manifests,family),pool=poolFor(m,role,recipe),entry=pool[compositionHash(x,y,g.seed+role.length)%pool.length],fixed=recipe.materialOrientation?.[family]==='fixed',base={family,alpha,entry,flipX:!fixed&&!!(compositionHash(x,y,g.seed+19)&1),flipY:!fixed&&!!(compositionHash(x,y,g.seed+23)&1),offsetX:((compositionHash(x,y,g.seed+71)%17)-8)*.65*(fixed?.25:1),offsetY:((compositionHash(x,y,g.seed+73)%11)-5)*.45*(fixed?.25:1)};assets.add(entry.atlas);
   const out=[base];for(const [i,a] of (recipe.materialAccents?.[family]||[]).entries()){if(a.roles&&!a.roles.includes(role))continue;const n=materialNoise(x,y,a.scaleTiles||16,g.seed^(a.seed||((i+1)*137))),weight=smooth(a.threshold??.35,a.full??.8,n)*(a.alpha??.3);if(weight<.015)continue;const members=a.members.map(index=>m.tiles[index]).filter(Boolean);if(!members.length)continue;const accent=members[compositionHash(Math.floor(x/4),Math.floor(y/4),g.seed+i)%members.length];assets.add(accent.atlas);out.push({...base,entry:accent,alpha:alpha*weight});}return out;});
  const softened=layers.flatMap(layer=>{if(role==='solid'&&layer.family==='FOREST'){const m=manifestAt(manifests,'FOREST'),base=m.tiles[11];assets.add(base.atlas);return [{...layer,entry:base},{...layer,alpha:layer.alpha*(conf.solidGroundAccentAlpha??.55)}];}return[layer];});
  for(const f of specific?.groundFeatures||[]){const distance=Math.hypot((x-f.x)/(f.rx||4),(y-f.y)/(f.ry||4)),weight=(1-smooth(f.inner??.25,1,distance))*(f.alpha??.45);if(weight<.015)continue;const m=manifestAt(manifests,f.family),entry=m?.tiles[f.member];if(!entry){omissions.add('Missing authored ground '+f.id);continue;}assets.add(entry.atlas);softened.push({family:f.family,alpha:weight,entry,flipX:false,flipY:false,offsetX:0,offsetY:0,featureId:f.id});}
  ground.push({x,y,role,regionId:s.regionId,family:s.family,layers:softened,depth:x+y});
 }
 // Masonry uses contiguous runs of REAL exposed collision cells, rather than
 // every-third-cell outdoor bank sampling. Runs have stable world-space origins.
 // Adjacent wall modules may share existing solid corner cells, never floor cells.
 const continuous=recipe.continuousWalls?.[primaryFamily];
 if(continuous){
  const m=manifestAt(manifests,primaryFamily),wallStep=continuous.moduleCells||2;
  for(const face of ['positiveX','positiveY']){
   const axisX=face==='positiveX',fixedMin=axisX?b.minX:b.minY,fixedMax=axisX?b.maxX:b.maxY,alongMin=axisX?b.minY:b.minX,alongMax=axisX?b.maxY:b.maxX;
   const exposed=(fixed,t)=>{const x=axisX?fixed:t,y=axisX?t:fixed;return inGrid(g,x,y)&&!walk(g,x,y)&&!road(g,x,y)&&walk(g,x+(axisX?1:0),y+(axisX?0:1))&&!g.structureMask?.[y*g.width+x];};
   for(let fixed=fixedMin;fixed<=fixedMax;fixed++)for(let t=alongMin;t<=alongMax;t++){
    if(!exposed(fixed,t))continue;let start=t;while(start>0&&exposed(fixed,start-1))start--;let end=t;while(exposed(fixed,end+1))end++;
    const first=Math.max(start,start+Math.floor((alongMin-start)/wallStep)*wallStep);
    for(let at=first;at<=end&&at<=alongMax;at+=wallStep){const span=Math.min(wallStep,end-at+1),center=at+(span-1)/2,x=axisX?fixed:center,y=axisX?center:fixed,entry=m.walls[span===1?3:axisX?continuous.positiveX:continuous.positiveY],fp=axisX?{u:.72,v:span}:{u:span,v:.72};if(!entry)continue;
     // Keep full modules proportional to preserve the 2:1 baseline. A single-cell
     // remainder uses an existing pilaster/buttress sprite, not a stretched wall.
     const width=(span*32+(continuous.joinPixels||8)),height=entry.drawSize.h*(span===1?.42:width/entry.drawSize.w),cells=Array.from({length:span},(_,i)=>({x:axisX?fixed:at+i,y:axisX?at+i:fixed}));
     add(entry,x,y,{footprint:fp,kind:'wall-run',exposedFace:face,groupId:'wall-'+face+'-'+fixed+'-'+start,allowWallJoin:true,drawSize:{w:width,h:height},boundaryCells:cells});
    }t=end;
   }
  }
 }
 // Banks are only placed on actual exposed foreground solid boundaries. Source names
 // and footprint axes are not trusted: sprite 0 visually slopes up-right, sprite 1 down-right.
 for(let y=b.minY;y<=b.maxY;y++)for(let x=b.minX;x<=b.maxX;x++)if(!continuous&&!walk(g,x,y)){
  const s=surface(x,y),m=manifestAt(manifests,s.family),h=compositionHash(x,y,g.seed),faces=[];
  if(walk(g,x+1,y)&&y%3===0)faces.push({entry:m.walls?.[specific?.bankMembers?.[s.family]?.[0]??0],axis:'positiveX',fp:{u:.72,v:2.75}});
  if(walk(g,x,y+1)&&x%3===0)faces.push({entry:m.walls?.[specific?.bankMembers?.[s.family]?.[1]??1],axis:'positiveY',fp:{u:2.75,v:.72}});
  for(const f of faces)add(f.entry,x,y,{scale:specific?.composition?.bankVisualScale??conf.bankVisualScale,footprint:f.fp,kind:'bank',exposedFace:f.axis,groupId:'solid-bank-'+(x>>3)+'-'+(y>>3)});
 }
 // Broad clustered rock/root masses complement the groves. Never scatter manmade junk.
 const rockStep=specific?.composition?.rockSpacing||recipe.familyComposition?.[primaryFamily]?.rockSpacing||conf.rockClusterSpacing||4;
 for(let gy=Math.floor(b.minY/rockStep)-1;gy<=Math.ceil(b.maxY/rockStep);gy++)for(let gx=Math.floor(b.minX/rockStep)-1;gx<=Math.ceil(b.maxX/rockStep);gx++){
  const h=compositionHash(gx,gy,g.seed^0x8544),cx=gx*rockStep+(h%3),cy=gy*rockStep+((h>>>3)%3);if(cx<b.minX||cx>b.maxX||cy<b.minY||cy>b.maxY)continue;
  const s=surface(cx,cy),p=palettes.get(s.family);if(!p.rocks.length)continue;
  const offsets=[[0,0,1.9],[1.15,-1.1,1.15],[-1.1,.9,1.0]].slice(0,recipe.familyComposition?.[s.family]?.rocksPerCluster||3);
  for(let j=0;j<offsets.length;j++){const[dx,dy,base]=offsets[j],x=cx+dx,y=cy+dy,entry=p.rocks[(h+j)%p.rocks.length],scale=base+((h>>>8)%20)/100,fp={u:(entry.footprint?.u||1)*scale*.95,v:(entry.footprint?.v||1)*scale*.95};add(entry,x,y,{scale,footprint:fp,kind:'rock',groupId:'rock-mass-'+gx+'-'+gy});}
  if(p.brush.length){const entry=p.brush[(h>>>4)%p.brush.length],scale=Math.min(1.35,85/entry.drawSize.h);add(entry,cx+1.6,cy+1.4,{scale,footprint:{u:(entry.footprint?.u||1)*1.2,v:(entry.footprint?.v||1)*1.2},kind:'brush',groupId:'rock-mass-'+gx+'-'+gy});}
  if(p.roots.length&&h%3===0){const entry=p.roots[h%p.roots.length];add(entry,cx-1.3,cy-1.1,{scale:1.2,footprint:{u:(entry.footprint?.u||1)*1.2,v:(entry.footprint?.v||1)*1.2},kind:'root',groupId:'rock-mass-'+gx+'-'+gy});}
 }
 // One substantial tree per deterministic four-cell grove grid. The selected trunk/root
 // footprint is conservatively enlarged; foliage may overhang clear ground without collision.
 const step=conf.treeCellSpacing;
 for(let gy=Math.floor(b.minY/step)-1;gy<=Math.ceil(b.maxY/step);gy++)for(let gx=Math.floor(b.minX/step)-1;gx<=Math.ceil(b.maxX/step);gx++){
  const h=compositionHash(gx,gy,g.seed^0x923acd);if(h%10000/10000>(specific?.composition?.treeKeepFraction??recipe.familyComposition?.[primaryFamily]?.treeKeepFraction??conf.treeKeepFraction??.55))continue;const scale=conf.treeVisualScale[0]+((h>>>12)%100)/100*(conf.treeVisualScale[1]-conf.treeVisualScale[0]);
  const candidates=[[1+h%2,1+(h>>>4)%2],[1.5,1.5],[2.5,2.5],[.5,.5],[.5,2.5],[2.5,.5],[1,3],[3,1]];
  for(const [dx,dy] of candidates){const x=gx*step+dx,y=gy*step+dy;if(x<b.minX||x>b.maxX||y<b.minY||y>b.maxY)continue;
   const s=surface(x,y),p=palettes.get(s.family),trees=((!p.trees.length||h%(conf.snagOneIn||13)===0)&&p.snags.length)?p.snags:p.trees;if(!trees.length)continue;
   const weights=trees.map(t=>conf.forestTreeWeights?.[t.name]||1),totalWeight=weights.reduce((a,b)=>a+b,0);let choice=((h>>>8)%10000)/10000*totalWeight,index=0;for(;index<weights.length-1&&choice>=weights[index];index++)choice-=weights[index];const entry=trees[index],fp={u:(entry.footprint?.u||1)*conf.treeTrunkFootprintScale,v:(entry.footprint?.v||1)*conf.treeTrunkFootprintScale};
   if(add(entry,x,y,{scale,footprint:fp,kind:'tree',groupId:'grove-'+gx+'-'+gy,canopy:true}))break;
  }
 }
 // Small, explicitly non-solid detail only at walkable margins. Never road centers.
 for(let y=b.minY;y<=b.maxY;y++)for(let x=b.minX;x<=b.maxX;x++)if(walk(g,x,y)&&!road(g,x,y)&&compositionHash(x,y,g.seed)%5===0){
  const nearSolid=[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>!walk(g,x+dx,y+dy));if(!nearSolid)continue;const p=palettes.get(surface(x,y).family);if(!p.low.length)continue;const entry=p.low[compositionHash(x,y,g.seed+3)%p.low.length],scale=Math.min(.7,conf.lowDetailHeightCapPx/entry.drawSize.h);add(entry,x,y,{scale,footprint:{u:.3,v:.3},solid:false,kind:'low-margin'});
 }
 // Each authored landmark gets at most one small purposeful cluster; find a solid bay
 // in the existing mask, or omit. Entrances with no solid bay receive no invented obstacle.
 for(const lm of landmarks){if(specific?.authoredLandmarkIds?.includes(lm.id))continue;if(lm.x<b.minX-8||lm.x>b.maxX+8||lm.y<b.minY-8||lm.y>b.maxY+8)continue;let count=0;for(let radius=3;radius<=conf.landmarkPropRadiusTiles&&count<2;radius++)for(let k=0;k<16&&count<2;k++){
  const angle=k*Math.PI/8,x=Math.round(lm.x+Math.cos(angle)*radius),y=Math.round(lm.y+Math.sin(angle)*radius);if(x<b.minX||x>b.maxX||y<b.minY||y>b.maxY)continue;const local=palettes.get(surface(x,y).family).manmade,fallback=palettes.get(primaryFamily).manmade,pool=local.length?local:fallback;if(!pool.length)continue;const entry=pool[(compositionHash(lm.x,lm.y,g.seed)+count)%pool.length];if(add(entry,x,y,{kind:'landmark-prop',groupId:lm.id,landmarkId:lm.id}))count++;
 }}
 ground.sort((a,b)=>a.depth-b.depth||a.x-b.x);objects.sort((a,b)=>a.depth-b.depth||a.id.localeCompare(b.id));
 const output={version:COMPOSITION_VERSION,mapId,primaryFamily,bounds:b,ground,objects,assets:[...assets].sort(),omissions:[...omissions],stats:{groundCells:ground.length,solidObjects:objects.filter(o=>o.solid).length,trees:objects.filter(o=>o.kind==='tree').length,banks:objects.filter(o=>o.kind==='bank').length,wallModules:objects.filter(o=>o.kind==='wall-run').length,wallBoundaryCells:objects.filter(o=>o.kind==='wall-run').reduce((n,o)=>n+o.boundaryCells.length,0),rocks:objects.filter(o=>o.kind==='rock').length,lowMarginDetails:objects.filter(o=>!o.solid).length,manmade:objects.filter(o=>o.landmarkId).length}};
 output.validation=validateComposition(output,g,map,recipe);return output;
}
export function validateComposition(scene,g,map,recipe){
 const violations=[];for(const o of scene.objects){const a=o.art.anchor,f=o.art.footAnchor;if(a.x!==f.x||a.y!==f.y)violations.push({id:o.id,error:'anchor-footAnchor mismatch'});
  if(o.solid&&!footprintIsSolid(g,o.x,o.y,o.footprint))violations.push({id:o.id,error:'solid footprint touches walkable/road/out-of-grid'});
  if(!o.solid&&(o.art.drawSize.h>recipe.composition.lowDetailHeightCapPx+.001||road(g,Math.round(o.x),Math.round(o.y))))violations.push({id:o.id,error:'low detail too tall or on road'});
  if(o.exposedFace==='positiveX'&&!walk(g,Math.round(o.x)+1,Math.round(o.y)))violations.push({id:o.id,error:'bank positiveX is not exposed'});
  if(o.exposedFace==='positiveY'&&!walk(g,Math.round(o.x),Math.round(o.y)+1))violations.push({id:o.id,error:'bank positiveY is not exposed'});
  for(const p of o.boundaryCells||[]){const dx=o.exposedFace==='positiveX'?1:0,dy=o.exposedFace==='positiveY'?1:0;if(!inGrid(g,p.x,p.y)||walk(g,p.x,p.y)||road(g,p.x,p.y)||!walk(g,p.x+dx,p.y+dy))violations.push({id:o.id,error:'wall module does not follow exposed solid cells',cell:p});}
  if(o.landmarkId){const lm=[...(map.landmarks||[]),...(map.anchors||[])].find(l=>l.id===o.landmarkId),p=lm&&point(lm);if(!p||Math.hypot(p.x-o.x,p.y-o.y)>recipe.composition.landmarkPropRadiusTiles+1)violations.push({id:o.id,error:'manmade prop outside authored landmark radius'});}}
 return {pass:violations.length===0,checkedObjects:scene.objects.length,geometryMutated:false,violations};
}
export function objectOpacity(object,hero,project=isoProject){
 if(!object.occlusion.enabled||!hero)return 1;const a=project(object.x,object.y),h=project(hero.x,hero.y),r=object.art.rect,d=object.art.drawSize,an=object.art.anchor,pad=object.occlusion.heroPaddingPx,left=a.x-an.x/r.w*d.w,top=a.y-an.y/r.h*d.h;
 if(object.occlusion.onlyWhenBehind&&hero.x+hero.y>=object.depth)return 1;
 return h.x>left-pad&&h.x<left+d.w+pad&&h.y-36>top-pad&&h.y-36<top+d.h+pad?object.occlusion.alpha:1;
}
