import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {FullRenderer,actorStatusOpacity} from '../../dist/full/renderer.mjs';
import {createGame} from '../../dist/full/engine.mjs';
import {createRoom} from '../../dist/full/coop-engine.mjs';
import {heroStance} from '../../dist/full/stances.mjs';

function fixture(){
  const room=createRoom(4),a=createGame('knight','自己',undefined,1),b=createGame('knight','家人',undefined,2);
  b.player.hp=12;
  room.addMember('a',a);room.addMember('b',b);
  const view=room.view('a'),labels=[],fills=[],drawn=[];
  const ctx={globalAlpha:1,setTransform(){},fillRect(...args){fills.push({color:this.fillStyle,args})},measureText:()=>({width:24})};
  const renderer=new FullRenderer({getContext:()=>ctx,getBoundingClientRect:()=>({width:800,height:450})});
  renderer.actorIndex=JSON.parse(fs.readFileSync(new URL('../../dist/full/art/manifest.json',import.meta.url))).actors;
  renderer.stanceIndex=JSON.parse(fs.readFileSync(new URL('../../dist/full/art/stance-index.json',import.meta.url)));
  renderer.setRoomPlayers(view.players);
  renderer.loadMap=()=>{};
  renderer.loadClip=()=>{};
  renderer.drawStructure=()=>{};
  renderer.drawEffects=()=>{};
  renderer.text=(text,...rest)=>labels.push({text,rest});
  renderer.actor=(actor,consumerId)=>{drawn.push({actor,consumerId});return true};
  return {room,view,renderer,labels,fills,drawn};
}

test('remote players use existing class/equipment art and show distinct name and HP without mutating state',()=>{
  const {view,renderer,labels,fills,drawn}=fixture(),before=JSON.stringify(view);
  renderer.draw(view.state,100);
  const peer=view.players[0],row=drawn.find(row=>row.actor.id===peer.player.id);
  assert(row);
  assert(row.actor.roomMember);
  assert.equal(row.consumerId,heroStance({...peer,clockMs:view.state.clockMs},renderer.stanceIndex).consumerId);
  assert(labels.some(label=>label.text==='家人'));
  assert(fills.some(fill=>fill.color==='#599b72'&&fill.args[2]===22));
  assert.equal(JSON.stringify(view),before);
  renderer.setRoomPlayers([]);
  drawn.length=0;
  renderer.draw(view.state,116);
  assert(!drawn.some(row=>row.actor.id===peer.player.id));
});

test('clicking a teammate overlapping a monster returns ally and never a hostile target',()=>{
  const {view,renderer}=fixture(),peer=view.players[0].player;
  view.state.worlds[view.state.player.map].monsters.push({id:'m-test',type:'MON-GOBLIN',hp:20,x:peer.x,y:peer.y});
  renderer.prepareCamera(view.state,0);
  const point=renderer.screen(peer.x,peer.y);
  const hit=renderer.hit(view.state,point.x,point.y-32*renderer.scale);
  assert.equal(hit.kind,'ally');
  assert.equal(hit.entity.id,peer.id);
});

test('remote cast release and weapon contact cues use the corresponding player animation',()=>{
  const {view,renderer}=fixture(),peer=view.players[0],actor=renderer.roomActors(view.state)[0];
  const binding=heroStance({...peer,clockMs:0},renderer.stanceIndex);
  const spec=JSON.parse(fs.readFileSync(new URL('../../dist/full/art/'+(binding.manifest||renderer.actorIndex[binding.consumerId].manifest),import.meta.url)));
  renderer.actorSpecs.set(binding.consumerId,spec);
  const event={kind:'weapon',actorId:actor.id,from:{x:actor.x,y:actor.y},to:{x:actor.x+1,y:actor.y-1},intervalMs:1000};
  assert.deepEqual(renderer.contactTiming(event,view.state),renderer.contactTiming({...event,actorId:'hero'},view.state));
  renderer.clockMs=0;
  actor.cast={kind:'skill',skillId:'SKILL-G01-01',targetId:'hero',endAt:500};
  const pose=renderer.actorState(actor,0);
  assert(pose.playerCast);
  renderer.animations.set('hero',{state:'idle'});
  renderer._presentEvents([{type:'skill',actorId:actor.id,skillId:'SKILL-G01-01'}],500);
  assert.equal(renderer.animations.get(actor.id).playerCast.completedAt,500);
  assert.equal(renderer.animations.get('hero').playerCast,undefined);
});

test('peers on other maps are excluded and invisible allies retain the existing translucency rule',()=>{
  const {view,renderer}=fixture(),actor=renderer.roomActors(view.state)[0];
  actor.effects=[{started:0,until:1000,values:{invisible:1}}];
  assert.equal(actorStatusOpacity(actor,0),.38);
  renderer.setRoomPlayers(view.players.map(peer=>({...peer,player:{...peer.player,map:'MAP-REG-ELF'}})));
  assert.deepEqual(renderer.roomActors(view.state),[]);
});
