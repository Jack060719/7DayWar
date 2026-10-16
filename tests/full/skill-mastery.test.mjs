import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,command,validate,advance} from '../../dist/full/engine.mjs';
import {addXP,xpAtLevel,stats,random} from '../../dist/full/rules.mjs';
import {SKILLS,NPCS} from '../../dist/full/data.mjs';
import {SKILL_BEHAVIORS} from '../../dist/full/skill-behaviors.mjs';
import {masteryInfo,skillBehavior,validateSkillMastery} from '../../dist/full/skill-mastery.mjs';
import {learningLocation} from '../../dist/full/skill-learning.mjs';
import {beginSkill,finishSkill} from '../../dist/full/skills.mjs';
import {geometry,walkable,findPath} from '../../dist/full/world.mjs';

function mage(id='SKILL-G01-04'){
 const s=createGame('mage','突破測試',undefined,61);addXP(s,xpAtLevel(60));
 Object.assign(s.player,{x:55,y:54,hp:stats(s).maxHp,mp:stats(s).maxMp});
 s.inventory.stacks[SKILLS[id].book_id]=3;return s;
}
const json=s=>JSON.parse(JSON.stringify(s));
function mastery(s,id,n){if(!s.player.skills.includes(id))s.player.skills.push(id);s.player.skillMastery={version:1,successes:{[id]:String(n)}};}

test('both shrine positions are walkable and reachable; first eligible book learns without RNG',()=>{
 const s=mage(),g=geometry(s.player.map),rng=s.rng,id='SKILL-G01-04';
 for(const npc of Object.values(NPCS).filter(n=>n.service==='skill_learning')){
  const point={x:npc.position_tiles[0],y:npc.position_tiles[1]};
  assert(walkable(g,point.x,point.y));assert(findPath(g,{x:64,y:64},point).length);
 }
 assert(command(s,{type:'learn',skillId:id}).ok);assert(s.player.skills.includes(id));
 assert.equal(s.inventory.stacks[SKILLS[id].book_id],2);assert.equal(s.rng,rng);assert.equal(masteryInfo(s,id).count,'0');
 assert(validate(s).ok,validate(s).errors.join(','));
});
test('wrong location, class, level, casting and missing book never consume resources or RNG',()=>{
 for(const mutate of [s=>{s.player.x=90;s.player.y=70},s=>{s.player.classId='knight';s.player.level=1},s=>{s.player.level=1},s=>{s.player.cast={kind:'skill'}},s=>{delete s.inventory.stacks['BOOK-G01-04']}]){
  const s=mage();mutate(s);const before=json(s);assert(!command(s,{type:'learn',skillId:'SKILL-G01-04'}).ok);assert.deepEqual(json(s),before);
 }
});
test('elf crystal requires the actual mother tree; darkelf technique has no location restriction',()=>{
 const s=createGame('elf','母樹',undefined,2),tree=NPCS['NPC-CANON-MOTHER-TREE'];
 assert(!learningLocation(s,'SKILL-ELF-01').ok);
 Object.assign(s.player,{map:tree.map_id,x:tree.position_tiles[0],y:tree.position_tiles[1]});
 assert(learningLocation(s,'SKILL-ELF-01').ok);assert(learningLocation(s,'SKILL-DARKELF-01').ok);
 s.player.x+=3;assert(!learningLocation(s,'SKILL-ELF-01').ok);
});
test('duplicate book success and failure consume one book and exactly one RNG draw',()=>{
 for(const want of [true,false]){
  const s=mage(),id='SKILL-G01-04';assert(command(s,{type:'learn',skillId:id}).ok);
  for(let candidate=1;;candidate++){const probe={rng:candidate};if((random(probe)<.1)===want){s.rng=candidate;break}}
  const expected={rng:s.rng};random(expected);const result=command(s,{type:'learn',skillId:id});
  assert(result.ok,result.error);assert.equal(result.mastery.success,want);assert.equal(s.rng,expected.rng);
  assert.equal(s.inventory.stacks[SKILLS[id].book_id],1);assert.equal(masteryInfo(s,id).count,want?'1':'0');
  assert(validate(s).ok,validate(s).errors.join(','));
 }
});
test('approved chance and diminishing gain curves have no rank cap',()=>{
 const s=mage(),id='SKILL-G01-04',gains=[];
 for(const n of [0,1,2,10,20,30,1000000]){mastery(s,id,n);const m=masteryInfo(s,id);assert(m.chance>0);assert(m.bonus<.2);gains.push(m.bonus)}
 assert(gains.every((n,i)=>!i||n>gains[i-1]));assert(gains[2]-gains[1]<gains[1]);
 mastery(s,id,10);assert.equal(masteryInfo(s,id).chance,.05);assert(Math.abs(masteryInfo(s,id).bonus-1/15)<1e-12);
 mastery(s,id,30);assert.equal(masteryInfo(s,id).chance,.025);
});
function runEffect(id,n){
 const s=mage(id);mastery(s,id,n);const target={id:'target',type:'MON-ORC',hp:1000,maxHp:1000,mp:0,effects:[],x:56,y:54};
 s.worlds[s.player.map].monsters=[target];const hits=[],heals=[];
 const st={mr:0,resistances:{}};
 const ctx={actorStats:()=>st,physicalChance:()=>1,damage:(t,amount)=>{hits.push(amount);return amount},heal:(t,amount)=>heals.push(amount),validForm:()=>true};
 const selected=SKILL_BEHAVIORS[id].target==='ally'?s.player.id:target.id;
 const cast={skillId:id,targetId:selected};finishSkill(s,cast,ctx);return{s,hits,heals};
}
test('damage and healing improve with the same damage dice draw, while debuff chance stays unchanged',()=>{
 for(const id of ['SKILL-G01-04','SKILL-G01-01']){
  const plain=runEffect(id,0),boosted=runEffect(id,20),a=id.endsWith('04')?'hits':'heals';
  assert(boosted[a][0]>plain[a][0]);assert.equal(plain.s.rng,boosted.s.rng);
 }
 const s=mage();for(const[id,b]of Object.entries(SKILL_BEHAVIORS).filter(([,b])=>b.operations.some(o=>o.op==='apply_status'))){mastery(s,id,20);assert.deepEqual(skillBehavior(s,id).operations.filter(o=>o.op==='apply_status'),b.operations.filter(o=>o.op==='apply_status'))}
});
test('buff duration grows, MP reduction is rounded up and never discounts HP, reagents or cooldown',()=>{
 const s=mage();mastery(s,'SKILL-G01-02',20);
 assert(Math.abs(skillBehavior(s,'SKILL-G01-02').operations[0].durationSeconds-1980)<1e-9);
 mastery(s,'SKILL-G02-01',100);const b=skillBehavior(s,'SKILL-G02-01'),base=SKILL_BEHAVIORS['SKILL-G02-01'];
 assert.equal(b.costs.mp,14);assert(b.costs.mp<base.costs.mp);assert.deepEqual(b.costs.reagents,base.costs.reagents);assert.equal(b.costs.hp,base.costs.hp);assert.equal(b.cooldownSeconds,base.cooldownSeconds);
 assert(beginSkill(s,{skillId:b.id,targetId:s.player.id},{allowedTeleport:()=>true}).ok);
 assert.equal(s.player.mp,stats(s).maxMp-b.costs.mp);
});
test('breakthrough ledger survives save/reopen and split offline advancement without rerolling',()=>{
 const s=mage();assert(command(s,{type:'learn',skillId:'SKILL-G01-04'}).ok);s.rng=1;
 assert(command(s,{type:'learn',skillId:'SKILL-G01-04'}).ok);const a=json(s),b=json(s);
 advance(a,20,{offline:true});advance(b,7,{offline:true});const reopened=json(b);advance(reopened,13,{offline:true});
 assert.deepEqual(json(a),json(reopened));assert.equal(a.player.skillMastery.successes['SKILL-G01-04'],'1');
});
test('malformed or unlearned mastery is rejected; a legacy save without ledger stays valid',()=>{
 const s=mage();assert(validate(s).ok);
 for(const successes of [{'SKILL-G01-04':'1'},{invalid:'1'},{'SKILL-G01-04':-1},{'SKILL-G01-04':'01'}]){const bad=json(s);bad.player.skillMastery={version:1,successes};assert(!validate(bad).ok)}
 s.player.skills.push('SKILL-G01-04');s.player.skillMastery={version:1,successes:{'SKILL-G01-04':'99999999999999999999'}};assert(validateSkillMastery(s).ok);
});
