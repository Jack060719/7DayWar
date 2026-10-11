export const playerSkillAction=id=>['SKILL-KNIGHT-01','SKILL-ELF-10','SKILL-DARKELF-14'].includes(id)?'attack':'cast';
export const CAST_RECOVERY_MS=250;
// The game's cast deadline stays authoritative. Source release markers affect pixels only.
export function playerCastClipTime(sequence,marker,phase,now){
 const total=sequence.reduce((n,f)=>n+f.duration,0);if(!(total>0)||!phase)return 0;
 const measured=Number.isInteger(marker?.frameIndex)&&sequence[marker.frameIndex],release=measured?sequence.slice(0,marker.frameIndex).reduce((n,f)=>n+f.duration,0):total;
 if(now<phase.releaseAt){const duration=Math.max(1,phase.releaseAt-phase.startAt),p=Math.max(0,Math.min(1,(now-phase.startAt)/duration));return Math.min(total-1,release*p)}
 const p=Math.max(0,Math.min(1,(now-phase.releaseAt)/CAST_RECOVERY_MS));return Math.min(total-1,release+(total-release)*p);
}
export function observePlayerCast(previous,cast,now,clockMs,castDurationMs){
 if(!cast||!Number.isFinite(cast.endAt)||typeof cast.skillId!=='string')return previous?.completedAt!==undefined&&now-previous.completedAt<CAST_RECOVERY_MS?previous:null;
 const key=cast.skillId+':'+cast.endAt;
 const remaining=Math.max(0,cast.endAt-clockMs);return{key,skillId:cast.skillId,action:playerSkillAction(cast.skillId),startAt:now-Math.max(0,castDurationMs-remaining),releaseAt:now+remaining};
}
export function finishPlayerCast(previous,skillId,now){
 if(previous?.skillId===skillId)return previous.completedAt!==undefined?previous:{...previous,releaseAt:now,completedAt:now};
 // If no windup was observed, display only the release/recovery, never replay a late windup.
 return{key:skillId+':unobserved:'+now,skillId,action:playerSkillAction(skillId),startAt:now,releaseAt:now,completedAt:now};
}
