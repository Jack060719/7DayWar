import {PORTALS} from './portals.mjs';
import {ROOM_MAPS} from './dungeon-rooms.mjs';
import {geometry,walkable,nearestWalkable} from './world.mjs';
import {structureCell,STRUCTURES,LAYOUT_REVISION} from './structures.mjs';
export {LAYOUT_REVISION};
// Only repair cells newly occupied by this authored settlement. Never discard objects.
export function prepareLayoutMigration(state){
 if((state.layoutRevision||0)>=LAYOUT_REVISION)return null;
 const next=structuredClone(state),maps=new Set([...STRUCTURES.map(b=>b.mapId),...ROOM_MAPS,...PORTALS.map(p=>p.mapId)]),moved=[];
 function relocate(a,map,label){if(!maps.has(map))return;const g=geometry(map);if(!walkable(g,a.x,a.y)){const before={x:a.x,y:a.y},p=nearestWalkable(g,a);if(!p)throw Error('城鎮配置更新找不到安全位置');Object.assign(a,p);moved.push({label,before,after:p})}if(Array.isArray(a.path))a.path=[]}
 relocate(next.player,next.player.map,'角色');for(const a of next.pets)relocate(a,a.map,'寵物');for(const a of next.summons)relocate(a,a.map,'召喚物');for(const a of next.player.memories||[])relocate(a,a.mapId,'傳送記憶');for(const map of maps){const w=next.worlds[map];if(w){for(const a of w.monsters){relocate(a,map,'怪物');if(a.origin)relocate(a.origin,map,'怪物原點');delete a.pathGoal;delete a.pathAt}for(const a of w.ground)relocate(a,map,'地面物品')}}
 next.layoutRevision=LAYOUT_REVISION;return{state:next,moved,notice:moved.length?`地圖配置已更新，${moved.length} 個位於新障礙內的位置已移至最近可通行處。物品與進度完整保留，更新前存檔已封存。`:null};
}
