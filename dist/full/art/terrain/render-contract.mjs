// Reference runtime compositing contract. Source art files remain immutable.
// Renderer owner may import/adapt this file; this staging file edits no game source.
export const TERRAIN_RENDER_CONTRACT = {
  version:'2.1.0',
  tileWidth:64,tileHeight:32,
  worldSeedRequired:true,
  patchDrawWidth:112,patchDrawHeight:56,
  sourceEdgeFeather:{innerDiamondRadius:.36,outerDiamondRadius:.98},
  // These quiet bases need near-opaque overlap at cell bisectors. The old .36
  // interior left periodic underlay exposure, visible as a diagonal checker even
  // when every source member had the same material. Other approved families keep
  // their existing feather; this does not assert source-edge seamlessness.
  sourceEdgeFeatherByFamily:{DESERT:{innerDiamondRadius:.62,outerDiamondRadius:.99},SWAMP:{innerDiamondRadius:.62,outerDiamondRadius:.99},VOLCANIC:{innerDiamondRadius:.62,outerDiamondRadius:.99},SNOW:{innerDiamondRadius:.62,outerDiamondRadius:.99},ICE:{innerDiamondRadius:.62,outerDiamondRadius:.99}},
  underlay:{COAST:'#777164',GRASS:'#756343',FOREST:'#55432d',DESERT:'#9e7b45',SWAMP:'#4e4e37',SNOW:'#a6aca8',VOLCANIC:'#322d27',MOUNTAIN:'#626156',CITY:'#756958',CAVE:'#514d43',CRYPT:'#5f594e',ANT:'#756246',UNDERWATER:'#355e63',TOWER:'#615c54',ICE:'#8aadb6',SEWER:'#4a4840'},
  compatibleBaseMembers:{COAST:[0,1,2,9,12],GRASS:[0,2,7,8,10,11,13],FOREST:[0,3,6],DESERT:[4],SWAMP:[9],SNOW:[4],VOLCANIC:[0,9],MOUNTAIN:[0,4,8,10,13],CITY:[0,5,10],CAVE:[5,6,12,13],CRYPT:[0,1,9],ANT:[0,1,3,5,11],UNDERWATER:[1,10],TOWER:[0,4,6],ICE:[5],SEWER:[1,7,14]},
  alternateSpatialPools:{CAVE:{paleLimestone:[0,3,9,11]},CITY:{flagstone:[2,7]},UNDERWATER:{sand:[0,6,14]},SEWER:{muckChannel:[2,9,13,15]}},
  edgeOverlayAutotile:false,
  note:'Overlapping source patches with deterministic feathering and quiet opaque underlay. This is runtime blending, not a claim that source borders are seamless or a verified Wang/bitmask set.'
};
export function terrainHash(u,v,seed=1){let x=(Math.imul(u,374761393)^Math.imul(v,668265263)^seed)>>>0;x=Math.imul(x^(x>>>13),1274126177);return(x^(x>>>16))>>>0;}
export function isoToScreen(u,v,originX=0,originY=0){return{x:originX+(u-v)*32,y:originY+(u+v)*16};}
export function selectGroundMember(manifest,u,v,seed=1){const pool=TERRAIN_RENDER_CONTRACT.compatibleBaseMembers[manifest.family]||manifest.tiles.map((_,i)=>i);return manifest.tiles[pool[terrainHash(u,v,seed)%pool.length]];}
export function featherGroundPatch(makeCanvas,atlasImage,entry){
  const c=makeCanvas(128,64),ctx=c.getContext('2d'),r=entry.rect;
  const family=entry.family||entry.id?.split('-')[0],feather=TERRAIN_RENDER_CONTRACT.sourceEdgeFeatherByFamily[family]||TERRAIN_RENDER_CONTRACT.sourceEdgeFeather;
  ctx.drawImage(atlasImage,r.x,r.y,r.w,r.h,0,0,128,64);
  const pixels=ctx.getImageData(0,0,128,64),{data}=pixels;
  for(let y=0;y<64;y++)for(let x=0;x<128;x++){
    const q=Math.abs((x+.5-64)/64)+Math.abs((y+.5-32)/32);
    const t=Math.max(0,Math.min(1,(q-feather.innerDiamondRadius)/(feather.outerDiamondRadius-feather.innerDiamondRadius))),weight=1-t*t*(3-2*t);
    data[(y*128+x)*4+3]=Math.round(data[(y*128+x)*4+3]*weight);
  }
  ctx.putImageData(pixels,0,0);return c;
}
export function paintTerrainPatch(ctx,patch,screenX,screenY){ctx.drawImage(patch,screenX-56,screenY-28,112,56);}
export function paintUnderlay(ctx,width,height,family='GRASS'){ctx.fillStyle=TERRAIN_RENDER_CONTRACT.underlay[family]||'#554b3a';ctx.fillRect(0,0,width,height);}
export function drawTerrainProp(ctx,image,entry,footX,footY){const r=entry.rect,d=entry.drawSize,a=entry.footAnchor||entry.anchor;ctx.drawImage(image,r.x,r.y,r.w,r.h,footX-a.x/r.w*d.w,footY-a.y/r.h*d.h,d.w,d.h);}
// Stable painter ordering is mandatory: sort tiles by (u+v,u), then props by footY/id.
// Region transitions: use spatial biome regions; avoid independently random family per tile.
// Overlay edges: choose only by authored shape and actual region boundary. Their alpha is
// decorative detail; the patch feather/underlay is the deterministic seam treatment.
