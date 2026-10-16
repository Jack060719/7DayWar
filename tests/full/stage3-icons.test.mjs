import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {ITEMS} from '../../dist/full/data.mjs';
import {ICONS,iconHTML} from '../../dist/full/icons.mjs';
const art=new URL('../../dist/full/art/',import.meta.url),sources=new URL('../../docs/art/stage3-icons/',import.meta.url);
const meta=JSON.parse(await readFile(new URL('pipeline-meta.json',sources),'utf8'));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');

test('all catalog items have an icon; the 47 Stage3 items have individual occupied atlas cells',()=>{
 assert.equal(meta.frames.length,47);
 const ids=new Set(meta.frames.map(f=>f.id)),rects=new Set;
 assert.equal(ids.size,47);
 assert.equal(meta.frames.filter(f=>ITEMS[f.id]?.family==='form_contract').length,21);
 assert.equal(meta.frames.filter(f=>f.id.startsWith('ITEM-FUSION-')).length,12);
 assert.equal(meta.frames.filter(f=>f.id.startsWith('EQ-')).length,11);
 assert.equal(meta.frames.filter(f=>!f.id.startsWith('EQ-')&&!f.id.startsWith('ITEM-FUSION-')&&ITEMS[f.id]?.family!=='form_contract').length,3);
 for(const id of Object.keys(ITEMS))assert.ok(iconHTML(id),'Missing catalog icon: '+id);
 for(const f of meta.frames){
  assert.ok(ITEMS[f.id],f.id);assert.deepEqual(ICONS[f.id],{atlas:meta.atlas.path,rect:f.rect});
  const [x,y,w,h]=f.rect;assert.deepEqual([w,h],[64,64]);assert.ok(x>=0&&y>=0&&x+w<=meta.atlas.width&&y+h<=meta.atlas.height);
  assert.equal(x%64,0);assert.equal(y%64,0);rects.add(f.rect.join(','));
  assert.ok(iconHTML(f.id).includes('background-position:'+(-x/2)+'px '+(-y/2)+'px'));
  const decoded=meta.decodedAtlas.find(row=>row.id===f.id);assert.ok(decoded.alphaPixels>0);assert.ok(decoded.transparentPixels>0);assert.equal(decoded.edgePixels,0);assert.equal(decoded.visibleMagentaPixels,0);
 }
 assert.equal(rects.size,47);
 assert.equal(ICONS['EQ-DAGGER'].atlas,'icons/equipment-and-skills.webp');
 assert.equal(iconHTML('NOT-A-CATALOG-ITEM'),'');
});

test('generated source, original Boss portraits and runtime atlas match recorded provenance',async()=>{
 for(const f of meta.sources)assert.equal(hash(await readFile(new URL(f.path,sources))),f.sha256,f.path);
 for(const f of meta.bossSources)assert.equal(hash(await readFile(new URL(f.atlas,art))),f.sha256,f.id);
 const atlas=await readFile(new URL(meta.atlas.path,art));assert.equal(atlas.length,meta.atlas.bytes);assert.equal(hash(atlas),meta.atlas.sha256);
 assert.equal(atlas.toString('ascii',0,4),'RIFF');assert.equal(atlas.toString('ascii',8,12),'WEBP');
 assert.ok((await readFile(new URL('prompts-used.md',sources),'utf8')).includes('Original designs'));
 for(const f of meta.frames){const png=await readFile(new URL('frames/'+f.id+'.png',sources));assert.equal(png.readUInt32BE(16),64);assert.equal(png.readUInt32BE(20),64)}
 for(const f of meta.rawCells){assert.ok(f.alphaPixels>0);assert.equal(f.edgePixels,0)}
});
