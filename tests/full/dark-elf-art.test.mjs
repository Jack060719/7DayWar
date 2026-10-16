import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createGame,command,validate} from '../../dist/full/engine.mjs';
import {canUseForm,recordFormKill,formDefinition} from '../../dist/full/form-progress.mjs';
import {heroStance} from '../../dist/full/stances.mjs';
import {NONHERO_ARROW_EMITTERS} from '../../dist/full/nonhero-arrow-emitters.mjs';
const art=new URL('../../dist/full/art/',import.meta.url),manifest=JSON.parse(await readFile(new URL('manifest.json',art),'utf8'));
test('dark elf reuses the original FI archer complete body and existing release markers',async()=>{
 const binding=manifest.actors['MON-DARK-ELF'];assert.equal(binding.manifest,manifest.actors['MON-FI-DARK-ELF'].manifest);assert.equal(binding.reuseOf,'MON-FI-DARK-ELF');assert.equal(binding.status,'source-reviewed-candidate');
 const body=JSON.parse(await readFile(new URL(binding.manifest,art),'utf8'));assert.equal(body.assetId,'ASSET-BODY-MON-FI-DARK-ELF');assert.equal(body.baseHeight,92);assert.deepEqual(body.anchor,[96,150]);
 for(const direction of['S','SW','W','NW','N','NE','E','SE']){for(const action of['idle','walk','attack','hit','death']){const frames=body.directions[direction][action];assert(frames.length);for(const frame of frames)assert((await readFile(new URL(frame.atlas,art))).length)}const contact=body.contacts.attack[direction],arrow=NONHERO_ARROW_EMITTERS[binding.manifest].attack[direction];assert.equal(contact.frameIndex,arrow.frameIndex);assert(contact.frameIndex<body.directions[direction].attack.length);assert(arrow.point.every(Number.isFinite));}
});
test('earned dark elf form consumes one scroll and survives save JSON with its real render binding',()=>{
 const s=createGame('knight','合成暗黑精靈',undefined,132),rng=s.rng;s.inventory.stacks['ITEM-POLYMORPH-SCROLL']=2;
 assert(!canUseForm(s,'MON-DARK-ELF'));for(let i=0;i<300;i++)recordFormKill(s,'MON-DARK-ELF');assert.equal(s.rng,rng);assert(canUseForm(s,'MON-DARK-ELF'));assert.equal(formDefinition('MON-DARK-ELF').activationAvailable,true);
 const result=command(s,{type:'useItem',itemId:'ITEM-POLYMORPH-SCROLL',formId:'MON-DARK-ELF'});assert(result.ok,result.error);assert.equal(s.inventory.stacks['ITEM-POLYMORPH-SCROLL'],1);const copy=JSON.parse(JSON.stringify(s));assert(validate(copy).ok);assert.equal(heroStance(copy).consumerId,'MON-DARK-ELF');assert(manifest.actors[heroStance(copy).consumerId]);
});
