import {SKILL_BEHAVIORS} from './skill-behaviors.mjs';

// Approved P1 trial policy. Counts are decimal strings, not a capped rank.
export const MASTERY_VERSION=1;
export function masteryDirection(id){
 const b=SKILL_BEHAVIORS[id];if(!b)return null;
 if(b.operations.some(o=>o.op==='damage'||o.op==='weapon_attack'))return'damage';
 if(b.operations.some(o=>o.op==='heal'&&o.mode!=='full_hp'&&o.amount?.mode!=='full'))return'heal';
 if(b.operations.some(o=>o.op==='apply_buff'&&o.durationSeconds>0)||b.operations.some(o=>o.op==='polymorph')&&b.durationSeconds>0)return'duration';
 return'mp';
}
export function masteryInfo(s,id){
 const b=SKILL_BEHAVIORS[id];if(!b)return null;
 const count=s.player.skillMastery?.successes[id]||'0',n=Number(count),direction=masteryDirection(id);
 const fraction=1-20/(n+20),bonus=(direction==='mp'?.1:.2)*fraction;
 const mp=direction==='mp'&&b.costs.mp>0?Math.max(1,Math.ceil(b.costs.mp*(1-bonus))):b.costs.mp;
 return{count,direction,bonus,multiplier:1+bonus,chance:.1/(1+n/10),mp,baseMp:b.costs.mp};
}
export function skillBehavior(s,id){
 const base=SKILL_BEHAVIORS[id];if(!base)return null;
 const m=masteryInfo(s,id);if(m.count==='0')return base;
 if(m.direction==='mp')return{...base,costs:{...base.costs,mp:m.mp}};
 if(m.direction==='duration')return{...base,durationSeconds:base.durationSeconds*m.multiplier,operations:base.operations.map(o=>o.op==='apply_buff'&&o.durationSeconds>0?{...o,durationSeconds:o.durationSeconds*m.multiplier}:o)};
 return base;
}
export function validateSkillMastery(s){
 const m=s.player?.skillMastery,errors=[];
 if(m===undefined)return{ok:true,errors};
 if(!m||Array.isArray(m)||m.version!==MASTERY_VERSION||!m.successes||typeof m.successes!=='object'||Array.isArray(m.successes)||Object.keys(m).some(k=>!['version','successes'].includes(k)))return{ok:false,errors:['技能突破紀錄格式無效']};
 for(const[id,n]of Object.entries(m.successes))if(!Object.hasOwn(SKILL_BEHAVIORS,id)||!s.player.skills?.includes(id)||typeof n!=='string'||!/^(0|[1-9]\d*)$/.test(n))errors.push('技能突破次數或技能參照無效');
 return{ok:!errors.length,errors};
}
export function recordMasterySuccess(s,id){
 s.player.skillMastery??={version:MASTERY_VERSION,successes:{}};
 s.player.skillMastery.successes[id]=(BigInt(s.player.skillMastery.successes[id]||'0')+1n).toString();
 return masteryInfo(s,id);
}
