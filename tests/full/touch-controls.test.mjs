import test from 'node:test';
import assert from 'node:assert/strict';
import {stickDirection,stickTarget,JoystickMovement,cameraZoom} from '../../dist/full/touch-controls.mjs';
import {createGame,command,advance} from '../../dist/full/engine.mjs';
import {geometry,walkable,canStep} from '../../dist/full/world.mjs';

function driver(state=createGame()){
 const actions=[],control=new JoystickMovement({state:()=>state,ready:()=>true,send:async action=>{actions.push(action);return command(state,action)}});
 return {state,actions,control};
}
test('screen-relative stick direction matches the isometric map and ignores the center dead zone',()=>{
 assert.deepEqual(stickDirection(40,0),{x:1,y:-1});assert.deepEqual(stickDirection(-40,0),{x:-1,y:1});
 assert.deepEqual(stickDirection(0,-40),{x:-1,y:-1});assert.deepEqual(stickDirection(0,40),{x:1,y:1});
 assert.deepEqual(stickDirection(32,16),{x:1,y:0});assert.equal(stickDirection(2,3),null);assert.equal(stickDirection(NaN,1),null);
});
test('stick motion respects terrain and cannot route around a blocked neighbor',()=>{
 const s=createGame(),g=geometry(s.player.map);let blocked;
 for(let y=1;y<g.height-1&&!blocked;y++)for(let x=1;x<g.width-1;x++)if(walkable(g,x,y)&&!canStep(g,{x,y},{x:x+1,y})){blocked={x,y};break}
 assert(blocked);Object.assign(s.player,blocked);const before=JSON.stringify(s);
 assert.equal(stickTarget(s,{x:1,y:0}),null);assert.equal(JSON.stringify(s),before);
});
test('holding moves through existing commands at engine speed; releasing clears the queued tile',async()=>{
 const {state:s,actions,control:c}=driver();s.auto.enabled=true;s.player.path=[{x:65,y:56}];
 c.start();c.turn(40,0);await c.tick();assert.equal(actions[0].type,'stopAuto');assert.equal(s.auto.enabled,false);
 await c.tick();assert.equal(s.player.path.length,1);advance(s,.001);const moved={x:s.player.x,y:s.player.y},count=actions.length;
 await c.tick();assert.equal(actions.length,count,'held direction must wait for the engine movement timer');
 advance(s,1);await c.tick();assert.equal(s.player.path.length,1);await c.stop();assert.equal(s.player.path.length,0);
 advance(s,1);assert.deepEqual({x:s.player.x,y:s.player.y},moved);assert(!c.active);
});
test('release while a move is saving waits and sends the stop last',async()=>{
 const s=createGame(),actions=[];let unblock;
 const c=new JoystickMovement({state:()=>s,ready:()=>true,send:async action=>{actions.push(action);const result=command(s,action);if(action.type==='move')await new Promise(resolve=>{unblock=resolve});return result}});
 c.start();c.turn(40,0);await c.tick();const moving=c.tick();assert(c.busy);const stopping=c.stop();unblock();await moving;await stopping;
 assert.equal(actions.at(-1).type,'stopAuto');assert.equal(s.player.path.length,0);assert.equal(c.owner,null);
 const p={x:s.player.x,y:s.player.y};advance(s,2);assert.deepEqual({x:s.player.x,y:s.player.y},p);
});
test('direction reversal replaces an unconsumed step and returning to center stops it',async()=>{
 const {state:s,control:c}=driver();c.start();c.turn(40,0);await c.tick();await c.tick();assert.deepEqual(s.player.path[0],{x:s.player.x+1,y:s.player.y-1});
 c.turn(-40,0);await c.tick();assert.deepEqual(s.player.path[0],{x:s.player.x-1,y:s.player.y+1});
 c.turn(0,0);await c.tick();assert.equal(s.player.path.length,0);await c.stop();
});
test('unavailable session defers stopping, and a new character never receives stale input',async()=>{
 let s=createGame(),ready=true;const actions=[],c=new JoystickMovement({state:()=>s,ready:()=>ready,send:async a=>{actions.push(a);return command(s,a)}});
 c.start();c.turn(40,0);await c.tick();await c.tick();ready=false;await c.stop();assert(c.needsStop);
 ready=true;await c.tick(false);assert.equal(s.player.path.length,0);
 c.start();c.turn(40,0);s=createGame('knight','other',undefined,9);s.auto.enabled=true;const count=actions.length;await c.tick();
 assert.equal(actions.length,count);assert.equal(s.auto.enabled,true);assert(!c.active);
});
test('camera preference accepts the supported range and safely defaults invalid saved values',()=>{
 assert.equal(cameraZoom(null),.9);assert.equal(cameraZoom('bad'),.9);assert.equal(cameraZoom('Infinity'),.9);
 assert.equal(cameraZoom('.6'),.6);assert.equal(cameraZoom(1.4),1.4);assert.equal(cameraZoom(.2),.6);assert.equal(cameraZoom(5),1.4);
});
