import test from 'node:test';import assert from 'node:assert/strict';
import {createGame} from '../../dist/full/engine.mjs';
import {fromSolo,createMember,advance,validateRoster} from '../../dist/full/roster.mjs';
const turn=()=>new Promise(resolve=>setImmediate(resolve));
test('actual offline worker sends one full-roster checkpoint, waits for its ACK and resumes exactly from pause',async()=>{
 const oldSelf=globalThis.self,oldPerformance=globalThis.performance;let time=0;const messages=[];
 try{
  Object.defineProperty(globalThis,'performance',{configurable:true,value:{now:()=>time+=200}});
  globalThis.self={postMessage:message=>messages.push(structuredClone(message))};
  await import('../../dist/full/offline-worker.mjs?roster-backpressure');
  const roster=fromSolo(createGame('knight','One',undefined,912));assert(createMember(roster,{classId:'elf',name:'Two',seed:913}).ok);
  const input=structuredClone(roster),running=self.onmessage({data:{type:'simulate',roster:input,seconds:2,offline:true}});await turn();
  assert.equal(messages.length,1);const checkpoint=messages[0];assert.equal(checkpoint.type,'checkpoint');assert.equal(checkpoint.state,undefined);assert(validateRoster(checkpoint.roster).ok);assert.equal(checkpoint.roster.simulation.members.length,2);
  await self.onmessage({data:{type:'ack',checkpointId:checkpoint.checkpointId+999}});await turn();assert.equal(messages.length,1);
  await self.onmessage({data:{type:'pause'}});await self.onmessage({data:{type:'ack',checkpointId:checkpoint.checkpointId}});await running;
  assert.equal(messages.length,2);assert.equal(messages[1].type,'paused');assert.deepEqual(messages[1].roster,checkpoint.roster);
  const expected=structuredClone(roster);advance(expected,2,{offline:true});const resume=JSON.parse(JSON.stringify(checkpoint.roster)),start=messages.length;
  self.postMessage=message=>{messages.push(structuredClone(message));if(message.type==='checkpoint')queueMicrotask(()=>self.onmessage({data:{type:'ack',checkpointId:message.checkpointId}}));};
  await self.onmessage({data:{type:'simulate',roster:resume,seconds:2-checkpoint.processed,offline:true}});
  assert(messages.length>start);assert.equal(messages.at(-1).type,'done');assert.deepEqual(messages.at(-1).roster,expected);
 }finally{if(oldSelf===undefined)delete globalThis.self;else globalThis.self=oldSelf;Object.defineProperty(globalThis,'performance',{configurable:true,value:oldPerformance});}
});
