import test from 'node:test';
import assert from 'node:assert/strict';
import {shieldComponents} from '../helpers/shield-components.mjs';

test('complete body labels preserve pixels across curved transparent row gaps and faint bridges',()=>{
 const width=100,height=130,data=new Uint8ClampedArray(width*height*4),paint=(x,y,a)=>{data[(y*width+x)*4+3]=a};
 for(let y=10;y<40;y++)for(let x=20;x<40;x++)paint(x,y,255);
 for(let y=35;y<75;y++)for(let x=50;x<65;x++)paint(x,y,255);
 // Bboxes overlap vertically; a faint background bridge must not merge the bodies.
 for(let x=40;x<50;x++)paint(x,37,3);
 paint(18,20,1);paint(68,55,2);
 const before=data.slice(),result=shieldComponents(data,width,height,2,1);
 assert.deepEqual(data,before);assert.equal(result.frames.length,2);
 assert.equal(result.nonzeroPixels,1212);assert.equal(result.assignedPixels,1212);
 for(let y=10;y<40;y++)for(let x=20;x<40;x++)assert.equal(result.labels[y*width+x],0);
 for(let y=35;y<75;y++)for(let x=50;x<65;x++)assert.equal(result.labels[y*width+x],1);
 assert.equal(result.labels[20*width+18],0);assert.equal(result.labels[55*width+68],1);
 assert.deepEqual(result.frames.map(f=>f.edgePixels),[0,0]);
});

test('component extraction preserves a real outer edge failure and rejects merged opaque bodies',()=>{
 const width=100,height=80,data=new Uint8ClampedArray(width*height*4);
 for(let y=0;y<30;y++)for(let x=20;x<40;x++)data[(y*width+x)*4+3]=255;
 const result=shieldComponents(data,width,height,1,1);assert.equal(result.frames[0].edgePixels,20);
 assert.throws(()=>shieldComponents(data,width,height,2,1),/Expected 2 complete body/);
});

test('higher identity threshold preserves every faint bridge pixel and alpha-16 bounds',()=>{
 const width=100,height=90,data=new Uint8ClampedArray(width*height*4);
 for(let y=10;y<40;y++)for(let x=10;x<30;x++)data[(y*width+x)*4+3]=255;
 for(let y=10;y<40;y++)for(let x=50;x<70;x++)data[(y*width+x)*4+3]=255;
 for(let x=30;x<50;x++)data[(25*width+x)*4+3]=24;
 data[(25*width)*4+3]=20;
 const before=data.slice();assert.throws(()=>shieldComponents(data,width,height,1,2),/Expected 2 complete body/);
 const result=shieldComponents(data,width,height,1,2,32);
 assert.deepEqual(data,before);assert.equal(result.nonzeroPixels,1221);assert.equal(result.assignedPixels,1221);
 assert.equal(result.frames[0].bbox[0],0);assert.equal(result.frames[0].edgePixels,1);
 for(let x=30;x<50;x++)assert.ok(result.labels[25*width+x]===0||result.labels[25*width+x]===1);
});
