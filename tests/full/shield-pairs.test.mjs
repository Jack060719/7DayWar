import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createGame} from '../../dist/full/engine.mjs';
import {heroStance} from '../../dist/full/stances.mjs';
import {FullRenderer,projectileLaunchPoint} from '../../dist/full/renderer.mjs';
const index=JSON.parse(await readFile(new URL('../../dist/full/art/stance-index.json',import.meta.url))),bare=JSON.parse(await readFile(new URL('../../dist/full/art/shield-pairs/knight-dagger-without-shield/manifest.json',import.meta.url))),old=JSON.parse(await readFile(new URL('../../dist/full/art/stance-staging/runtime/knight-dagger/manifest.json',import.meta.url)));
function character(){const s=createGame('knight','Shield fixture',undefined,83);s.inventory.equipment.push({uid:'fixture-shield',itemId:'EQ-SMALL-SHIELD'});return s}

test('actual equipped shield selects an isolated full-body pair for self and a peer without changing state',()=>{
 const s=character(),before=JSON.stringify(s),without=heroStance(s,index);assert.equal(without.consumerId,'CLASS-KNIGHT:dagger:without-shield');assert.equal(JSON.stringify(s),before);
 s.equipped.shield='fixture-shield';const withShield=heroStance(s,index);assert.equal(withShield.consumerId,'CLASS-KNIGHT:dagger:with-shield');assert.notEqual(withShield.manifest,without.manifest);
 assert.deepEqual(heroStance({player:s.player,inventory:s.inventory,equipped:s.equipped,clockMs:s.clockMs},index),withShield);
 s.equipped.shield='missing-uid';assert.equal(heroStance(s,index).consumerId,without.consumerId);
 s.equipped.shield=s.equipped.armor;assert.equal(heroStance(s,index).consumerId,without.consumerId);
 s.player.effects.push({group:'form',formId:'MON-WOLF',until:s.clockMs+1000});assert.deepEqual(heroStance(s,index),{consumerId:'MON-WOLF'});
});

test('item overrides and unpaired bindings retain their existing behavior; a missing pair half is visible as missing',()=>{
 const s=character(),i=structuredClone(index);delete i.classes['CLASS-KNIGHT'].items['EQ-BATTLE-AXE'].shieldVariants;s.inventory.equipment[0].itemId='EQ-BATTLE-AXE';assert.equal(heroStance(s,i).consumerId,'CLASS-KNIGHT:EQ-BATTLE-AXE');
 i.classes['CLASS-KNIGHT'].items['EQ-BATTLE-AXE'].shieldVariants={};assert.equal(heroStance(s,i).missing,true);
 s.inventory.equipment[0].itemId='EQ-DAGGER';delete i.classes['CLASS-KNIGHT'].families.dagger.shieldVariants;assert.equal(heroStance(s,i).consumerId,'CLASS-KNIGHT:dagger');
 assert.equal(heroStance(s,null).loading,true);
});

test('every integrated pair retains source timing, valid per-frame anchors and independent clip files',async()=>{
 const manifests=new Set(Object.values(index.classes).flatMap(row=>[...Object.values(row.families),...Object.values(row.items)].flatMap(binding=>Object.values(binding.shieldVariants||{}).map(v=>v.manifest))).filter(file=>file.startsWith('shield-pairs/')));
 assert(manifests.size>0);
 for(const file of manifests){
  const target=JSON.parse(await readFile(new URL('../../dist/full/art/'+file,import.meta.url))),source=JSON.parse(await readFile(new URL('../../dist/full/art/'+target.provenance.sourceManifest.file,import.meta.url)));let count=0;const files=new Set;
  for(const [dir,actions] of Object.entries(source.directions))for(const [action,frames] of Object.entries(actions)){
   const generated=target.directions[dir][action];assert.deepEqual(generated.map(f=>f.duration),frames.map(f=>f.duration),file+':'+dir+':'+action);
   for(const frame of generated){assert(frame.atlas.startsWith(file.slice(0,file.lastIndexOf('/')+1)));assert.equal(frame.anchor.length,2);assert(frame.anchor.every(Number.isFinite));files.add(frame.atlas)}count+=generated.length;
  }
  for(const clip of files)await readFile(new URL('../../dist/full/art/'+clip,import.meta.url));assert.equal(count,336,file);assert.equal(files.size,48,file);assert.equal(target.clipCount,48,file);
 }
});

test('switching full-body halves never reuses the prior shield texture while a new clip loads',()=>{
 const s=character(),without=heroStance(s,index);s.equipped.shield='fixture-shield';const withShield=heroStance(s,index),draws=[],ctx={globalAlpha:1,drawImage:(...args)=>draws.push(args)},r=new FullRenderer({getContext:()=>ctx,getBoundingClientRect:()=>({width:600,height:320})});
 r.actorIndex={[without.consumerId]:without,[withShield.consumerId]:withShield};r.actorSpecs.set(without.consumerId,bare);r.actorSpecs.set(withShield.consumerId,old);r.screen=()=>({x:300,y:200});r.warmActorClips=()=>{};r.loadClip=()=>{};
 const pose={direction:'S',state:'idle',started:0,renderX:0,renderY:0};r.actorState=()=>pose;
 const a={id:'fixture',x:0,y:0,hp:1},oldImage={},newImage={},oldFile=old.directions.S.idle[0].atlas,newFile=bare.directions.S.idle[0].atlas;
 r.images.set(oldFile,oldImage);assert.equal(r.actor(a,withShield.consumerId,10),true);assert.equal(draws.at(-1)[0],oldImage);
 assert.equal(r.actor(a,without.consumerId,20),false);assert.equal(draws.length,1,'old full-body shield frame must not leak across variants');
 r.images.set(newFile,newImage);assert.equal(r.actor(a,without.consumerId,30),true);assert.equal(draws.at(-1)[0],newImage);assert.equal(pose.lastRenderedFrame.consumerId,without.consumerId);
 assert.equal(r.actor(a,withShield.consumerId,40),true);assert.equal(draws.at(-1)[0],oldImage);
});

test('new paired manifest emits from its measured hand while retaining the legacy emitter fallback',()=>{
 const id='CLASS-KNIGHT:dagger:without-shield',animations=new Map([['hero',{consumerId:id,manifest:'new-manifest',bodyHeight:92}]]),specs=new Map([[id,bare]]),e={sourceActorId:'hero',from:{x:0,y:0},to:{x:1,y:1},castId:'fixture'};
 const p=projectileLaunchPoint(e,animations,specs);assert.equal(p.measured,true);assert.equal(p.dx,bare.emitters.cast.S.point[0]-96);assert.equal(p.dy,bare.emitters.cast.S.point[1]-150);
 const fallback=projectileLaunchPoint(e,animations,new Map([[id,{baseHeight:92}]]),{[id]:{cast:{S:{point:[100,80],anchor:[96,150]}}}});assert.equal(fallback.dx,4);assert.equal(fallback.dy,-70);
});

test('a packing translation and equal frame-anchor offset preserve the world position',()=>{
 const draws=[],r=new FullRenderer({getContext:()=>({globalAlpha:1,drawImage:(...args)=>draws.push(args)}),getBoundingClientRect:()=>({width:600,height:320})}),id='CLASS-KNIGHT:dagger:without-shield',spec=structuredClone(bare),pose={direction:'S',state:'idle',started:0,renderX:0,renderY:0};
 r.actorSpecs.set(id,spec);r.actorIndex={[id]:{manifest:'fixture'}};r.screen=()=>({x:300,y:200});r.actorState=()=>pose;r.warmActorClips=()=>{};r.loadClip=()=>{};
 const frame=spec.directions.S.idle[0];r.images.set(frame.atlas,{});const actor={id:'fixture',x:0,y:0,hp:1};assert.equal(r.actor(actor,id,10),true);const before=draws.at(-1),offset=[17,-11];
 frame.anchor=frame.anchor.map((n,i)=>n+offset[i]);assert.equal(r.actor(actor,id,20),true);const after=draws.at(-1),scale=72/spec.baseHeight*r.scale;
 assert.deepEqual(pose.lastRenderedFrame.anchor,frame.anchor);assert(Math.abs(after[5]+offset[0]*scale-before[5])<1e-9);assert(Math.abs(after[6]+offset[1]*scale-before[6])<1e-9);
});
