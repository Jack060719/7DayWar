import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,advance,validate,ensureWorld} from '../../dist/full/engine.mjs';
import {checksum,parseImport,decodeEnvelope} from '../../dist/full/storage.mjs';
const old=await import('../fixtures/stage2/full/engine.mjs');

for(const field of ['path','hpFraction','mpFraction','attackAt','moveAt','regenAt','foodAt','lastActionAt','cooldowns','effects','skills'])test('missing required player '+field+' is rejected without repair',()=>{
 const state=createGame(),before=structuredClone(state);delete state.player[field];const invalid=structuredClone(state);assert.equal(validate(state).ok,false);assert.deepEqual(state,invalid);assert.notDeepEqual(state,before);
});
test('required world and simulation collections cannot silently disappear',()=>{
 for(const mutate of [s=>delete s.worlds[s.player.map].hazards,s=>s.worlds[s.player.map].hazards={},s=>delete s.needsProcess,s=>delete s.nextAI]){const state=createGame();mutate(state);assert.equal(validate(state).ok,false);}
});
test('path, regeneration fractions and timer types have finite supported ranges',()=>{
 for(const [key,value] of [['path',{}],['path',[{x:-1,y:0}]],['hpFraction',-0.1],['hpFraction',1],['mpFraction','0'],['regenAt',-1],['cooldowns',{item:0.5}],['lastActionAt',-8001]]){const state=createGame();state.player[key]=value;assert.equal(validate(state).ok,false,key);}
});
test('known Stage2 saves and current state survive save/reopen and segmented regeneration exactly',()=>{
 for(const make of [old.createGame,createGame]){const state=make('knight','Synthetic',undefined,77);assert(validate(state).ok,validate(state).errors.join());const all=structuredClone(state),split=structuredClone(state);advance(all,24);advance(split,7.5);const reopened=JSON.parse(JSON.stringify(split));advance(reopened,16.5);assert(validate(reopened).ok,validate(reopened).errors.join());assert.deepEqual(reopened,all);}
 const state=createGame();ensureWorld(state,'MAP-REG-SILVER');assert(validate(state).ok);
});
test('checksummed incomplete imports are rejected before replacement',async()=>{
 const state=createGame();delete state.player.hpFraction;const stateJSON=JSON.stringify(state),raw=JSON.stringify({format:'ashen-covenant-v3',stateJSON,checksum:await checksum(stateJSON),resolvedAt:1000});await assert.rejects(parseImport(raw),/恢復小數/);
});
test('stored envelopes reject missing or invalid revision and wall time',async()=>{
 const stateJSON=JSON.stringify(createGame()),envelope={stateJSON,checksum:await checksum(stateJSON),revision:1,resolvedAt:1000};for(const mutate of [e=>delete e.revision,e=>e.revision=-1,e=>delete e.resolvedAt,e=>e.resolvedAt='1000']){const invalid=structuredClone(envelope);mutate(invalid);await assert.rejects(decodeEnvelope(invalid),/修訂或時間/);}assert.deepEqual((await decodeEnvelope(envelope)).state,JSON.parse(stateJSON));
});

test('optional last combat time supports room rebasing and rejects unsafe timestamps',()=>{
 const legacy=old.createGame();assert.equal(legacy.player.lastCombatAt,undefined);assert(validate(legacy).ok);
 for(const value of [0,-8000,Number.MAX_SAFE_INTEGER]){const state=createGame();state.player.lastCombatAt=value;const before=structuredClone(state);assert(validate(state).ok,validate(state).errors.join());assert.deepEqual(state,before);}
 for(const value of [0.5,NaN,Infinity,Number.MAX_SAFE_INTEGER+1,'0',null]){const state=createGame();state.player.lastCombatAt=value;assert.equal(validate(state).ok,false,String(value));}
});
