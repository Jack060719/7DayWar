import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,ensureWorld,command,advance,validate} from '../../dist/full/engine.mjs';
import {QUESTS,NPCS,MAPS} from '../../dist/full/data.mjs';
import {availableQuests,acceptQuest} from '../../dist/full/quests.mjs';
import {questDestination,questRouteStep} from '../../dist/full/quest-navigation.mjs';
import {geometry,nearestWalkable} from '../../dist/full/world.mjs';
import {equipmentName} from '../../dist/full/item-presentation.mjs';
import {CoopRoom} from '../../dist/full/coop-engine.mjs';

function at(s,mapId,point){ensureWorld(s,mapId);Object.assign(s.player,{map:mapId,...nearestWalkable(geometry(mapId),point),path:[],targetId:null})}
function npc(s,id){const n=NPCS[id];at(s,n.map_id,{x:n.position_tiles[0],y:n.position_tiles[1]})}

test('quest markers reflect level, class, prerequisites, acceptance and completion',()=>{
 const s=createGame();
 assert.deepEqual(availableQuests(s).map(q=>q.id),['QUEST-ROAD-01','QUEST-PATROL-TALKING']);
 assert(!availableQuests(s).some(q=>q.start_npc_id==='NPC-SILVER-WARDEN'));
 assert(acceptQuest(s,'QUEST-ROAD-01','NPC-TALKING-WARDEN').ok);
 assert(!availableQuests(s).some(q=>q.id==='QUEST-ROAD-01'));
 s.quests.completed.push('QUEST-ROAD-01');delete s.quests.active['QUEST-ROAD-01'];
 assert(!availableQuests(s).some(q=>q.id==='QUEST-ROAD-01'));
 s.player.level=15;
 assert(availableQuests(s).some(q=>q.id==='QUEST-CLASS-KNIGHT-15'));
 s.player.classId='mage';assert(!availableQuests(s).some(q=>q.id==='QUEST-CLASS-KNIGHT-15'));
});

test('real movement reaches a quest giver and accepted survey targets skip visited landmarks',()=>{
 const s=createGame();npc(s,'NPC-TALKING-WARDEN');s.player.x-=7;
 const route=questRouteStep(s,'QUEST-ROAD-01');assert.equal(route.command.type,'move');
 assert(command(s,route.command).ok);advance(s,10);
 assert.equal(questRouteStep(s,'QUEST-ROAD-01').arrived.npcId,'NPC-TALKING-WARDEN');
 assert(command(s,{type:'acceptQuest',questId:'QUEST-ROAD-01',npcId:'NPC-TALKING-WARDEN'}).ok);
 const step=QUESTS['QUEST-ROAD-01'].steps[1];at(s,step.map_id,{x:MAPS[step.map_id].landmarks[0].tile_x,y:MAPS[step.map_id].landmarks[0].tile_y});
 const target=questDestination(s,'QUEST-ROAD-01');assert.equal(target.kind,'landmark');
 assert(command(s,{type:'survey',landmarkId:target.landmarkId}).ok);
 assert.notEqual(questDestination(s,'QUEST-ROAD-01').landmarkId,target.landmarkId);
 assert(validate(s).ok);
 const restored=JSON.parse(JSON.stringify(s));assert.deepEqual(questDestination(restored,'QUEST-ROAD-01'),questDestination(s,'QUEST-ROAD-01'));
 assert.equal(questDestination(s,'missing'),null);
});

test('cross-map navigation uses real entrances and pauses before paid ship travel',()=>{
 const s=createGame();let ship;
 for(let hop=0;hop<30;hop++){
  const next=questRouteStep(s,'QUEST-ROAD-01');assert(!next.error,next.error);
  if(next.transport){ship=next.transport;break}
  if(next.arrived)break;
  const result=command(s,next.command);assert(result.ok,result.error);
  if(next.command.type==='move'){Object.assign(s.player,s.player.path.at(-1));s.player.path=[]}
 }
 assert.equal(ship,'CON-034');const before=s.player.gold;
 assert.equal(questRouteStep(s,'QUEST-ROAD-01').transport,ship);assert.equal(s.player.gold,before);assert(!s.player.voyage);
 s.player.gold=0;assert.equal(command(s,{type:'travel',connectionId:ship}).ok,false);
});

test('all authored steps resolve targets without changing RNG or quest progress',()=>{
 const s=createGame();s.player.level=60;
 for(const q of Object.values(QUESTS))for(let index=0;index<q.steps.length;index++){
  s.quests.active={[q.id]:{step:index,count:0,landmarks:[]}};
  const step=q.steps[index],mapId=step.map_id||step.population_ref||NPCS[step.npc_id||q.end_npc_id].map_id;
  at(s,mapId,{x:MAPS[mapId].geometry.width_tiles>>1,y:MAPS[mapId].geometry.height_tiles>>1});
  const before=JSON.stringify(s),target=questDestination(s,q.id);
  assert(target,q.id+':'+index);assert(MAPS[target.mapId]);
  assert.equal(JSON.stringify(s),before);
 }
});

test('kill targets use eligible populations; reporting returns to the correct NPC',()=>{
 const s=createGame(),id='QUEST-ROAD-01',q=QUESTS[id];s.quests.active[id]={step:2,count:0,landmarks:[]};at(s,'MAP-REG-TALKING',{x:100,y:100});
 const target=questDestination(s,id);assert.equal(target.kind,'kill');
 assert(s.worlds[target.mapId].monsters.some(m=>m.x===target.x&&m.y===target.y&&q.steps[2].target_population_ids.includes(m.populationId)));
 s.quests.active[id].step=3;assert.equal(questDestination(s,id).npcId,q.end_npc_id);
});

test('equipment pickup reports only a successful acquisition, preserves identification and cannot repeat',()=>{
 const s=createGame(),gear=s.inventory.equipment.find(e=>!Object.values(s.equipped).includes(e.uid))||s.inventory.equipment[0];
 for(const slot of Object.keys(s.equipped))delete s.equipped[slot];gear.identified=false;
 assert(command(s,{type:'drop',uid:gear.uid}).ok);const drop=s.worlds[s.player.map].ground.find(d=>d.gear?.uid===gear.uid);
 const result=command(s,{type:'pickup',id:drop.id}),notices=result.events.filter(e=>e.type==='equipmentPickup');
 assert(result.ok);assert.equal(notices.length,1);assert.equal(notices[0].actorId,'hero');assert.match(equipmentName(notices[0].gear),/^未鑑定/);
 assert.equal(command(s,{type:'pickup',id:drop.id}).events.length,0);
 assert(command(s,{type:'drop',uid:gear.uid}).ok);const failedDrop=s.worlds[s.player.map].ground.find(d=>d.gear?.uid===gear.uid);s.player.x+=10;
 assert.equal(command(s,{type:'pickup',id:failedDrop.id}).events.length,0);
});

test('local party pickup events identify the recipient for each viewer',()=>{
 const s=createGame(),peer=createGame('knight','Peer',undefined,99);for(const slot of Object.keys(s.equipped))delete s.equipped[slot];
 const gear=s.inventory.equipment[0];command(s,{type:'drop',uid:gear.uid});
 const room=new CoopRoom(7,{mode:'local'});assert(room.addMember('one',s).ok);assert(room.addMember('two',peer).ok);
 const ownDrop=room.view('one').state.worlds[s.player.map].ground.find(d=>d.gear?.itemId===gear.itemId);
 const result=room.command('one',{type:'pickup',id:ownDrop.id});assert(result.ok,result.error);
 assert.equal(room.eventsFor('one',result.events).find(e=>e.type==='equipmentPickup').actorId,'hero');
 assert.notEqual(room.eventsFor('two',result.events).find(e=>e.type==='equipmentPickup').actorId,'hero');
});

test('automatic pickup emits the same notice; overburdened pickup emits none',()=>{
 const s=createGame();at(s,'MAP-REG-TALKING',{x:100,y:100});s.worlds[s.player.map].monsters=[];
 for(const slot of Object.keys(s.equipped))delete s.equipped[slot];const gear=s.inventory.equipment[0];command(s,{type:'drop',uid:gear.uid});
 Object.assign(s.auto,{enabled:true,phase:'LOOT',targetMap:s.player.map});
 assert.equal(advance(s,1).events.filter(e=>e.type==='equipmentPickup').length,1);
 command(s,{type:'stopAuto'});command(s,{type:'drop',uid:gear.uid});const d=s.worlds[s.player.map].ground.find(d=>d.gear?.uid===gear.uid);
 s.inventory.stacks['ITEM-MEAT']=100000;
 const failed=command(s,{type:'pickup',id:d.id});assert.equal(failed.ok,false);assert.deepEqual(failed.events,[]);assert(s.worlds[s.player.map].ground.some(item=>item.id===d.id));
});
