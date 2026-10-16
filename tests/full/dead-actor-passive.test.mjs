import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,ensureWorld,advance,validate} from '../../dist/full/engine.mjs';

function fixture(type, mapId) {
  const s=createGame('knight','Poison',undefined,91);
  s.player.map=mapId;
  const w=ensureWorld(s,mapId),m=w.monsters.find(actor=>actor.type===type);
  assert(m);
  w.monsters=[m];
  delete w.campRevision;
  delete w.campCycles;
  delete m.campId;
  delete m.campSlotId;
  Object.assign(s.player,m.origin);
  Object.assign(m,{hp:1,targetId:'hero',nextAI:250,attackAt:250,path:[]});
  m.effects=[{id:'poison',group:'poison',values:{},started:0,until:1000,tickAt:250,tickEvery:250,tickDamage:1,strength:1}];
  s.auto.enabled=true;
  s.nextAI=10000;
  return {s,m};
}

for (const [type,mapId] of [['MON-ATUBA','MAP-REG-ELF'],['MON-BLACK-KNIGHT','MAP-REG-SILVER']]) {
  test(type+' stops all actions after fatal passive damage and rewards once',()=>{
    const {s,m}=fixture(type,mapId),potions=m.healingPotions,position={x:m.x,y:m.y};
    const result=advance(s,.25);
    assert.equal(m.hp,0);
    assert.equal(m.healingPotions,potions);
    assert.deepEqual({x:m.x,y:m.y},position);
    assert.equal(result.events.filter(event=>event.type==='kill'&&event.targetId===m.id).length,1);
    assert(!result.events.some(event=>event.actorId===m.id||event.sourceId===m.id));
    assert.equal(m.attackAt,250);
    assert.equal(m.nextAI,250);
    assert.equal(s.summary.kills,'1');
    const summary=structuredClone(s.summary),ground=structuredClone(s.worlds[mapId].ground),rng=s.rng;
    const restored=JSON.parse(JSON.stringify(s));
    restored.needsProcess=true;
    const repeated=advance(restored,.75);
    assert.deepEqual(restored.summary,summary);
    assert.deepEqual(restored.worlds[mapId].ground,ground);
    assert.equal(restored.rng,rng);
    assert(!repeated.events.some(event=>event.type==='kill'||event.actorId===m.id||event.sourceId===m.id));
    assert(validate(restored).ok,validate(restored).errors.join());
  });

  test(type+' poison death is identical across saved, segmented and offline simulation',()=>{
    const {s}=fixture(type,mapId);
    advance(s,.125);
    const online=structuredClone(s),saved=JSON.parse(JSON.stringify(s));
    const expected=advance(online,.875);
    const first=advance(saved,.125,{offline:true});
    const resumed=JSON.parse(JSON.stringify(saved));
    const second=advance(resumed,.75,{offline:true});
    assert.deepEqual(JSON.parse(JSON.stringify(online)),resumed);
    assert.deepEqual(expected.events,[...first.events,...second.events]);
    assert.equal(resumed.worlds[mapId].monsters[0].hp,0);
    assert.equal(resumed.summary.kills,'1');
  });
}
