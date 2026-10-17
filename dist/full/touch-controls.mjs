import {unproject,geometry,canStep} from './world.mjs';

export function stickDirection(dx,dy){
 if(!Number.isFinite(dx)||!Number.isFinite(dy)||Math.hypot(dx,dy)<10)return null;
 const p=unproject(dx,dy),largest=Math.max(Math.abs(p.x),Math.abs(p.y));
 return {x:Math.round(p.x/largest)||0,y:Math.round(p.y/largest)||0};
}
export function stickTarget(state,direction){
 const p=state.player,target={x:p.x+direction.x,y:p.y+direction.y};
 return canStep(geometry(p.map),p,target)?target:null;
}
export const VIEW_ZOOM_KEY='7daywar.view-zoom.v1';
export function cameraZoom(value){const n=Number(value);return Number.isFinite(n)&&n>0?Math.max(.6,Math.min(1.4,n)):.9}

// Only one existing move command is in flight; holding a stick never becomes saved input.
export class JoystickMovement{
 constructor({state,ready,send}){Object.assign(this,{state,ready,send});this.active=false;this.direction=null;this.owner=null;this.needsStop=false;this.busy=false;this.pending=null;this.sentDirection=null}
 start(){const s=this.state();this.owner={id:s.id,map:s.player.map};this.active=true;this.direction=null;this.needsStop=true;this.sentDirection=null}
 turn(dx,dy){const next=stickDirection(dx,dy);if(!next&&this.direction)this.needsStop=true;this.direction=next}
 stop(){if(this.owner)this.needsStop=true;this.active=false;this.direction=null;return this.tick(false)}
 tick(allowMove=true){
  if(this.busy)return this.pending;
  const s=this.state();if(!this.owner||!s)return;
  if(s.id!==this.owner.id||s.player.map!==this.owner.map){this.owner=null;this.active=false;this.needsStop=false;return}
  if(!this.ready())return;
  if(s.player.death||s.player.voyage){this.active=false;this.direction=null;this.needsStop=true}
  let action;
  if(this.needsStop){this.needsStop=false;action={type:'stopAuto'}}
  else if(allowMove&&this.active&&this.direction){
   const changed=JSON.stringify(this.sentDirection)!==JSON.stringify(this.direction);
   if(s.player.path.length&&!changed||!s.player.path.length&&s.player.moveAt>s.clockMs)return;
   const target=stickTarget(s,this.direction);if(!target&&!s.player.path.length)return;
   action=target?{type:'move',...target}:{type:'stopAuto'};this.sentDirection={...this.direction};
  }else return;
  this.busy=true;
  this.pending=(async()=>{try{const result=await this.send(action);if(!result?.ok){this.active=false;this.direction=null;this.needsStop=action.type==='move'}}finally{this.busy=false;if(!this.active&&!this.needsStop)this.owner=null;else if(this.needsStop)await this.tick(false)}})();
  return this.pending;
 }
}
