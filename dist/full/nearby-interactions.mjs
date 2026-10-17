import {MAPS,mapNPCs} from './data.mjs';
import {distance,geometry,lineOfSight} from './world.mjs';
import {effectValues} from './rules.mjs';

// Display-only queries: selecting a unit never starts combat or consumes RNG.
export function nearbyUnits(state,allies=[]){
 const p=state.player,g=geometry(p.map),fx=effectValues(state),range=Math.min(8,fx.visionRadius||(MAPS[p.map].kind==='dungeon_floor'?Math.max(6,fx.lightRadius||0):8));
 const alive=a=>a.hp>0&&!a.dead&&!a.captured;
 const rows=[
  ...(state.worlds[p.map]?.monsters||[]).filter(alive).map(entity=>({kind:'monster',entity})),
  ...mapNPCs(p.map).map(n=>({kind:'npc',entity:{...n,x:n.position_tiles[0],y:n.position_tiles[1]}})),
  ...state.pets.filter(a=>a.active&&a.map===p.map&&alive(a)).map(entity=>({kind:'pet',entity})),
  ...state.summons.filter(a=>a.map===p.map&&alive(a)).map(entity=>({kind:'summon',entity})),
  ...allies.filter(a=>a.map===p.map&&alive(a)).map(entity=>({kind:'ally',entity}))
 ];
 return rows.filter(({entity:a})=>distance(p,a)<=range&&lineOfSight(g,p,a)).sort((a,b)=>distance(p,a.entity)-distance(p,b.entity)||a.entity.id.localeCompare(b.entity.id));
}
export function nearbyLoot(state){
 return (state.worlds[state.player.map]?.ground||[]).filter(d=>distance(state.player,d)<=1&&(!d.expiresAt||d.expiresAt>state.clockMs));
}
