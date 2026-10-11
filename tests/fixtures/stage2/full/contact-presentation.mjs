// Cosmetics only. Never writes a game state or calls a combat operation.
export function contactOffset(sequence,marker,intervalMs){if(!sequence?.length||!Number.isInteger(marker?.frameIndex)||!sequence[marker.frameIndex])return null;const total=sequence.reduce((n,f)=>n+f.duration,0);if(!(total>0))return null;return Math.max(0,Math.min(650,sequence.slice(0,marker.frameIndex).reduce((n,f)=>n+f.duration,0)/total*Math.max(120,Math.min(650,intervalMs||650))))}
export class ContactPresentation{
 constructor({limit=96,maxDelay=650,maxGap=1000}={}){this.limit=limit;this.maxDelay=maxDelay;this.maxGap=maxGap;this.queue=[];this.seen=new Map;this.map=null;this.last=null}
 reset(map=null){this.queue=[];this.seen.clear();this.map=map;this.last=null}
 sync(now,map){if(this.map!==map||(this.last!==null&&(now<this.last||now-this.last>this.maxGap)))this.reset(map);this.last=now}
 push(events,now,map,resolve){this.sync(now,map);const ready=[],groups=new Map,duplicates=new Set,key=e=>e.presentationGroupId||e.attackId||e.castId;for(const e of events)if(e.type==='skill'&&e.presentationGroupId||!e.presentationGroupId&&((e.type==='actorAttack'&&e.attackId)||(e.type==='actorCast'&&e.castId))){const id=key(e);if(this.seen.has(id))duplicates.add(id);else{groups.set(id,{event:e,timing:resolve(e)});this.seen.set(id,now)}}while(this.seen.size>256)this.seen.delete(this.seen.keys().next().value);
  for(const e of events){if(key(e)&&duplicates.has(key(e)))continue;const group=groups.get(key(e));if(group?.event.mapId&&group.event.mapId!==map)continue;let delay=0;if(group?.timing&&e.type!=='actorAttack'&&e.type!=='actorCast'&&e.type!=='skill'&&e.type!=='leap'){const timing=group.timing;if(e.type==='visual'&&e.phase==='flight')delay=timing.release||0;else if(['hit','miss','kill','death','petDeath','summonDeath'].includes(e.type)||e.type==='visual')delay=timing.contact||0}delay=Math.max(0,Math.min(this.maxDelay,delay));if(delay){if(this.queue.length>=this.limit)ready.push({...this.queue.shift().event,presentationAt:now});this.queue.push({event:{...e},at:now+delay,map})}else ready.push({...e,presentationAt:now})}
  this.queue.sort((a,b)=>a.at-b.at);return ready;
 }
 drain(now,map){this.sync(now,map);const ready=[];while(this.queue.length&&this.queue[0].at<=now){const row=this.queue.shift();if(row.map===map&&now-row.at<=this.maxGap)ready.push({...row.event,presentationAt:row.at})}return ready}
 holdGroundUntil(id){let at=0;for(const row of this.queue)if(row.event.type==='kill'&&row.event.groundItemIds?.includes(id))at=Math.max(at,row.at);return at}
 holdUntil(id){let at=0;for(const row of this.queue)if(row.event.type==='hit'&&row.event.targetId===id)at=Math.max(at,row.at);return at}
}
