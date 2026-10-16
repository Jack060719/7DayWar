
import test from 'node:test';import assert from 'node:assert/strict';
import {createGame,validate} from '../../dist/full/engine.mjs';
import {uid} from '../../dist/full/rules.mjs';
import {PET_RANGES,PET_ATTRIBUTES,PET_NATURE_EFFECTS,createWildTraits,validatePetV4,attributeQuality,petStatsV4,natureModifiers,advancePetV4,petV4Death,breedingError,stagePetBreed,commitPetBreed,previewLegacyPet,commitLegacyPet,petBagTransfer,petBagWeight,petAuraModifiers} from '../../dist/full/pets-v4.mjs';
function pet(s,type='PET-WOLF'){const id=uid(s,'pet'),p={id,sourceId:'wild:'+id,collarUid:uid(s,'collar'),collarInBag:true,type,name:'Synthetic',level:45,x:s.player.x,y:s.player.y,map:s.player.map,hp:1,mp:0,food:100,foodAt:60000,mpRegenAt:8000,magicAt:0,v4At:s.clockMs,xp:'0',active:false,dead:false,aptitudes:{hp:100,attack:100,defense:100,speed:100},effects:[],attackAt:0,moveAt:0,path:[],mode:'defend',v4:createWildTraits(s,type,s.id+':'+id)};const st=petStatsV4(p);p.hp=st.maxHp;p.mp=st.maxMp;s.pets.push(p);return p;}
const plainNature={type:'common',quality:'white',positive:['meleeHit'],negative:[]};
test('all eleven species generate independent saved attributes inside their ranges without UI rerolls',()=>{
 for(const type of Object.keys(PET_RANGES)){const s=createGame('knight','Wild',undefined,12),seen=new Set;for(let n=0;n<32;n++){const traits=createWildTraits(s,type,'lineage-'+n);assert(validatePetV4({type,v4:traits}).ok);for(const key of PET_ATTRIBUTES){const[min,max]=PET_RANGES[type][key];assert(traits.birth[key]>=min*10000&&traits.birth[key]<=max*10000)}seen.add(JSON.stringify(traits.birth));const p={type,level:1,v4:traits},before=JSON.stringify(p),rng=s.rng;assert.deepEqual(petStatsV4(p),petStatsV4(JSON.parse(before)));assert.equal(JSON.stringify(p),before);assert.equal(s.rng,rng);}assert(seen.size>1);}
});
test('white blue orange boundaries and wolf HP follow the approved base formula',()=>{
 const s=createGame(),p=pet(s);p.level=1;p.v4.nature=structuredClone(plainNature);
 for(const [value,hp,quality] of [[8,44,'white'],[12,55,'blue'],[16,66,'orange']]){p.v4.birth.VIT=value*10000;assert.equal(attributeQuality(p.type,'VIT',p.v4.birth.VIT),quality);assert.equal(petStatsV4(p).maxHp,hp);}
 p.level=50;p.v4.birth.STR=180000;assert(petStatsV4(p).attributes.STR.value>18);p.v4.birth.STR=179999;assert(petStatsV4(p).attributes.STR.value<=18);
});
test('nature multipliers affect deltas and ancestral modifiers add instead of multiply',()=>{
 const s=createGame(),p=pet(s);p.v4.nature={type:'single',quality:'orange',positive:['meleeAttack'],negative:['moveSpeed']};p.v4.ancestorNature={type:'common',quality:'white',positive:['meleeAttack'],negative:[]};const modifiers=natureModifiers(p.v4);assert.equal(modifiers.meleeAttack,.06);assert(Math.abs(modifiers.moveSpeed+.028)<1e-12);assert.equal(Object.keys(PET_NATURE_EFFECTS).length,14);
});
test('loyalty and fractional recovery are identical in segments, and hunger or storage pauses them',()=>{
 const s=createGame(),p=pet(s,'PET-CAT');p.active=true;p.level=1;p.hp=1;p.mp=0;p.v4.birth.VIT=130000;p.v4.nature=structuredClone(plainNature);const split=structuredClone(p),whole=structuredClone(p);advancePetV4(whole,12345);for(const ms of [1,111,4567,7666])advancePetV4(split,ms);assert.deepEqual(split,whole);
 advancePetV4(p,60000000);assert.equal(p.v4.loyalty,100);p.food=19;const before=p.v4.loyaltyMs;advancePetV4(p,600000);assert.equal(p.v4.loyalty,100);assert.equal(p.v4.loyaltyMs,before);p.food=0;const starving=structuredClone(p);advancePetV4(p,600000);assert.deepEqual(p,starving);p.food=100;p.active=false;const stored=structuredClone(p);advancePetV4(p,600000);assert.deepEqual(p,stored);petV4Death(p);assert.equal(p.v4.loyalty,94);
});
test('breeding reserves one result, survives reopening and commits only once without another RNG draw',()=>{
 const s=createGame('knight','Breed',undefined,41),first=pet(s),second=pet(s);first.v4.sex='male';second.v4.sex='female';for(const key of PET_ATTRIBUTES){first.v4.birth[key]=200000;second.v4.birth[key]=200000;}
 const staged=stagePetBreed(s,{firstId:first.id,secondId:second.id});assert(staged.ok);assert.equal(first.v4.breedingUsed,0);assert(validate(s).ok,validate(s).errors.join());const pending=structuredClone(s.petBreeding.pending),rng=s.rng,again=stagePetBreed(s,{firstId:second.id,secondId:first.id});assert.equal(again.transactionId,staged.transactionId);assert.equal(again.duplicate,true);assert.equal(s.rng,rng);
 const reopened=JSON.parse(JSON.stringify(s));for(const state of [s,reopened]){const result=commitPetBreed(state,{transactionId:staged.transactionId});assert(result.ok);assert.equal(state.pets.length,3);assert.equal(state.pets[0].v4.breedingUsed,1);assert.deepEqual(state.pets[2],pending.child);assert.equal(state.rng,rng);const committed=structuredClone(state);assert.equal(commitPetBreed(state,{transactionId:staged.transactionId}).duplicate,true);assert.deepEqual(state,committed);assert(validate(state).ok,validate(state).errors.join());for(const value of Object.values(state.pets[2].v4.birth))assert(value>=180000&&value<=220000);}
 assert.deepEqual(reopened,JSON.parse(JSON.stringify(s)));
});
test('breeding gates 30 and 45, two lifetime uses and close relatives without applying CHA',()=>{
 const s=createGame(),a=pet(s),b=pet(s);a.v4.sex='male';b.v4.sex='female';a.level=29;assert.match(breedingError(a,b),/次數/);a.level=30;assert.equal(breedingError(a,b),null);a.v4.breedingUsed=1;assert.match(breedingError(a,b),/次數/);a.level=45;assert.equal(breedingError(a,b),null);a.v4.breedingUsed=2;assert.match(breedingError(a,b),/次數/);a.v4.breedingUsed=0;a.v4.lineage.parents=[{id:b.v4.lineage.id,natures:[structuredClone(plainNature)]}];assert.match(breedingError(a,b),/父母/);a.v4.lineage.parents=[{id:'shared',natures:[structuredClone(plainNature)]}];b.v4.lineage.parents=structuredClone(a.v4.lineage.parents);assert.match(breedingError(a,b),/兄弟/);
 a.v4.lineage.parents=[];b.v4.lineage.parents=[];const copy=structuredClone(s);copy.player.creationStats.CHA+=100;stagePetBreed(s,{firstId:a.id,secondId:b.id});stagePetBreed(copy,{firstId:a.id,secondId:b.id});assert.deepEqual(copy.petBreeding,s.petBreeding);assert.equal(copy.rng,s.rng);
});
test('birth ancestry uses only recorded parent and grandparent natures, with both fixed-branch outcomes',()=>{
 let ancestral=0,ordinary=0;for(let seed=1;seed<=128;seed++){const s=createGame('knight','Ancestry',undefined,seed),a=pet(s),b=pet(s);a.v4.sex='male';b.v4.sex='female';a.v4.nature=structuredClone(plainNature);b.v4.nature=structuredClone(plainNature);stagePetBreed(s,{firstId:a.id,secondId:b.id});const child=s.petBreeding.pending.child;if(child.v4.ancestorNature){ancestral++;assert.deepEqual(child.v4.ancestorNature,plainNature)}else ordinary++;assert.equal(child.v4.lineage.grandparents.length,0);}assert(ancestral>0&&ordinary>0);
});
test('legacy preview is cancellable and deterministic; explicit upgrade keeps identity and does not consume RNG',()=>{
 const s=createGame(),p=pet(s);delete p.v4;delete p.v4At;const before=structuredClone(p),rng=s.rng,preview=previewLegacyPet(p,{sex:'female',effect:'meleeHit'});assert(preview.ok);assert.deepEqual(p,before);assert.equal(s.rng,rng);assert.deepEqual(preview.before,Object.fromEntries(Object.keys(preview.before).map(key=>[key,preview.after[key]])));assert(commitLegacyPet(s,{petId:p.id,sex:'female',effect:'meleeHit'}).ok);assert.equal(p.id,before.id);assert.equal(p.collarUid,before.collarUid);assert.equal(p.sourceId,before.sourceId);assert.equal(s.rng,rng);const accepted=structuredClone(s);assert.equal(commitLegacyPet(s,{petId:p.id,sex:'male',effect:'magicAttack'}).ok,false);assert.deepEqual(s,accepted);assert(validate(s).ok,validate(s).errors.join());
});
test('pet bag keeps item identities, refuses collars and equipped gear and rejects overweight transfers',()=>{
 const s=createGame(),p=pet(s);assert(petBagTransfer(s,{petId:p.id,direction:'deposit',itemId:'ITEM-RED-POTION',count:1}).ok);assert.equal(p.v4.bag.stacks['ITEM-RED-POTION'],1);assert(petBagWeight(p)>0);assert(petBagTransfer(s,{petId:p.id,direction:'withdraw',itemId:'ITEM-RED-POTION',count:1}).ok);
 for(const action of [{itemId:'ITEM-PET-COLLAR'},{uid:s.equipped.weapon},{itemId:'ITEM-RED-POTION',count:100}]){const before=structuredClone(s),result=petBagTransfer(s,{petId:p.id,direction:'deposit',...action});assert.equal(result.ok,false);assert.deepEqual(s,before);}
 assert(validate(s).ok,validate(s).errors.join());
});
test('auras require eligible orange pets within five cells and never stack duplicate providers',()=>{
 const s=createGame(),p=pet(s);p.level=1;p.active=true;for(const key of PET_ATTRIBUTES)p.v4.birth[key]=PET_RANGES[p.type][key][1]*10000;const expected={physical:1.01,magic:1.01,attackSpeed:1.01,moveSpeed:1.01,mr:1,maxHp:1.01};assert.deepEqual(petAuraModifiers(s),expected);const second=pet(s);second.level=1;second.active=true;second.v4.birth=structuredClone(p.v4.birth);assert.deepEqual(petAuraModifiers(s),expected);p.food=0;second.x=s.player.x+6;assert.equal(petAuraModifiers(s).physical,1);
});
test('invalid v4 data, breeding ledgers and duplicated bag UIDs are rejected by the full save validator',()=>{
 const s=createGame(),p=pet(s);for(const mutate of [copy=>copy.pets[0].v4.version=2,copy=>copy.pets[0].v4=null,copy=>copy.pets[0].v4.loyalty=1001,copy=>copy.pets[0].v4.nature.positive=['unknown'],copy=>copy.pets[0].v4.bag.equipment.push(copy.inventory.equipment[0])]){const copy=structuredClone(s);mutate(copy);assert.equal(validate(copy).ok,false);}
});

import {petDetailsHTML,legacyPreviewHTML,petNatureText} from '../../dist/full/pet-presentation.mjs';
test('pet presentation exposes approved qualities and ancestry without mutating state or injecting item text',()=>{
 const state=createGame(),p=pet(state);p.v4.shiny=true;p.v4.ancestorNature=structuredClone(plainNature);p.v4.bag.stacks['<img src=x onerror=alert(1)>']=1;const before=structuredClone(state),html=petDetailsHTML(p);
 for(const text of ['STR','DEX','INT','MND','VIT','異色','先祖血脈','主個性','先祖副個性','忠誠','寵物背包'])assert(html.includes(text),text);assert(!html.includes('<img'));assert(html.includes('&lt;img'));assert.deepEqual(state,before);
 assert.equal(petNatureText({type:'single',quality:'orange',positive:['meleeAttack'],negative:['moveSpeed']}),'近戰傷害 +4%、移動速度 -2.8%');assert(!legacyPreviewHTML({ok:false,error:'<svg onload=alert(1)>'}).includes('<svg'));
 delete p.v4;const preview=previewLegacyPet(p,{sex:'male',effect:'meleeHit'}),rendered=legacyPreviewHTML(preview);assert(rendered.includes('這是預覽'));assert(rendered.includes('原本'));assert(rendered.includes('升級後'));assert(petDetailsHTML(p).includes('舊版寵物'));
});

import {addV4Pet} from '../helpers/pet-v4.mjs';
test('pure v4 saves do not require legacy aptitude shadows, but supplied shadows remain validated',()=>{
 const s=createGame('elf','Pure v4 schema',undefined,311),p=addV4Pet(s);assert.equal(p.aptitudes,undefined);assert(validate(s).ok,validate(s).errors.join(','));assert(validate(JSON.parse(JSON.stringify(s))).ok);
 for(const aptitudes of[null,{}, {hp:0,attack:100,defense:100,speed:100},{hp:100,attack:100,defense:100,speed:999}]){const bad=structuredClone(s);bad.pets[0].aptitudes=aptitudes;assert(!validate(bad).ok)}
 const legacy=structuredClone(s);delete legacy.pets[0].v4;delete legacy.pets[0].v4At;assert(!validate(legacy).ok);legacy.pets[0].aptitudes={hp:100,attack:100,defense:100,speed:100};assert(validate(legacy).ok,validate(legacy).errors.join(','));
});
