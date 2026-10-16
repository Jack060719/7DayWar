import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {performance} from 'node:perf_hooks';
import {createGame,ensureWorld,validate} from '../../dist/full/engine.mjs';
import {geometry,nearestWalkable} from '../../dist/full/world.mjs';
import {refreshFieldCamps} from '../../dist/full/world-camps.mjs';
import {addXP,xpAtLevel,stats} from '../../dist/full/rules.mjs';
import * as rosterAPI from '../../dist/full/roster.mjs';
const roomFile=new URL('../../dist/full/coop-engine.mjs',import.meta.url),engineFile=new URL('../../dist/full/engine.mjs',import.meta.url);
function inspect(file,extra){return fs.readFileSync(file,'utf8').replace(/from\s*(['"])(\.\/[^'"]+)\1/g,(_,q,p)=>'from '+JSON.stringify(new URL(p,file).href))+extra}
let source=inspect(roomFile,'').replace('get memberIds()','probe(){return {members:this.#members,worlds:this.#worlds}} get memberIds()');
const {createRoom}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const {spawnMonster}=await import('data:text/javascript;base64,'+Buffer.from(inspect(engineFile,'\nexport{spawnMonster};')).toString('base64'));

test('ten split-map players and persisted exploration keep each display snapshot below the unchanged four MiB cap',()=>{
 const room=createRoom(54),maps=['MAP-REG-TALKING','MAP-REG-GLUDIN','MAP-REG-ELF','MAP-REG-WINDAWOOD','MAP-REG-DRAGON','MAP-REG-HEINE','MAP-REG-FIRE','MAP-REG-OREN','MAP-REG-ADEN','MAP-REG-TWILIGHT'];
 const born=performance.now();
 for(let i=0;i<10;i++){const original=createGame('knight','Capacity '+i,undefined,600+i);addXP(original,xpAtLevel(50));original.player.hp=stats(original).maxHp;assert(room.addMember(String(i),original).ok);const state=room.probe().members.get(String(i)).state;state.player.map=maps[i];ensureWorld(state,maps[i]);Object.assign(state.player,nearestWalkable(geometry(maps[i]),{x:200,y:200}));refreshFieldCamps(state,[],(map,binding,index,viewers)=>spawnMonster(state,map,binding,index,viewers),{centers:[state.player]});}
 const entryMs=performance.now()-born,tickStart=performance.now();room.advance(.25);const tick250Ms=performance.now()-tickStart,warmStart=performance.now();room.advance(1);const warm1000Ms=performance.now()-warmStart;
 const first=room.memberIds.map(id=>({id,bytes:Buffer.byteLength(JSON.stringify(room.networkView(id)))}));
 const exploreStart=performance.now();
 for(const {state} of room.probe().members.values()){
  const g=geometry(state.player.map);for(let y=80;y<g.height;y+=120)for(let x=80;x<g.width;x+=120){const point=nearestWalkable(g,{x,y});refreshFieldCamps(state,[state.player],(map,binding,index,viewers)=>spawnMonster(state,map,binding,index,viewers),{centers:[point]});}
 }
 for(const {state} of room.probe().members.values())refreshFieldCamps(state,[state.player],(map,binding,index,viewers)=>spawnMonster(state,map,binding,index,viewers));
 const explorationMs=performance.now()-exploreStart,snapshotStart=performance.now(),after=room.memberIds.map(id=>{const view=room.networkView(id);const checked=validate(view.state);assert(checked.ok,checked.errors.join());return{id,bytes:Buffer.byteLength(JSON.stringify(view)),visibleActors:view.state.worlds[view.state.player.map].monsters.length}}),snapshotAllMs=performance.now()-snapshotStart;
 for(const row of [...first,...after])assert(row.bytes<4*1024*1024,JSON.stringify(row));
 const metrics={kind:'Node synthetic capacity; no browser render or phone FPS',node:process.version,platform:process.platform,playerCount:10,mapCount:10,entryMs,tick250Ms,warm1000Ms,explorationMs,snapshotAllMs,first,after,ledgerBytes:Buffer.byteLength(JSON.stringify(Object.values(room.probe().worlds).map(w=>w.fieldCamps))),dormantCount:Object.values(room.probe().worlds).reduce((n,w)=>n+Object.keys(w.fieldCamps?.dormant||{}).length*3,0),authorityActorCount:Object.values(room.probe().worlds).reduce((n,w)=>n+w.monsters.length,0),authorityWorldBytes:Buffer.byteLength(JSON.stringify(room.probe().worlds))};
 fs.mkdirSync(new URL('../../reports/stage3-capacity/',import.meta.url),{recursive:true});fs.writeFileSync(new URL('../../reports/stage3-capacity/camps.json',import.meta.url),JSON.stringify(metrics,null,2)+'\n');
 const solo=createGame('knight','Long exploration local',undefined,10001);solo.worlds=structuredClone(room.probe().worlds);for(const world of Object.values(solo.worlds))world.ground=[];solo.nextId=room.nextId;const roster=rosterAPI.fromSolo(solo);for(let i=1;i<4;i++)assert(rosterAPI.createMember(roster,{name:'Local '+i,seed:10001+i}).ok);const localStart=performance.now();rosterAPI.advance(roster,.1);const initialHibernateMs=performance.now()-localStart,warmLocalStart=performance.now();rosterAPI.advance(roster,.1);const advance100Ms=performance.now()-warmLocalStart,viewStart=performance.now();const localView=rosterAPI.roomView(roster),roomViewMs=performance.now()-viewStart;assert.equal(localView.players.length,3);
 const steady=[];for(let i=0;i<10;i++){const at=performance.now();rosterAPI.advance(roster,.1);const advanced=performance.now();rosterAPI.roomView(roster);steady.push({advanceMs:advanced-at,viewMs:performance.now()-advanced})}
 for(let i=0;i<4;i++){const member=roster.simulation.members[i];member.state.player.map=maps[i];Object.assign(member.state.player,nearestWalkable(geometry(maps[i]),{x:200,y:200}));member.state.worlds[maps[i]]??={ground:[]};member.state.needsProcess=true}
 const wakeStart=performance.now();rosterAPI.advance(roster,.1);const wakeFourMapsMs=performance.now()-wakeStart,activeFourMaps=[];
 for(let i=0;i<10;i++){const at=performance.now();rosterAPI.advance(roster,.1);const advanced=performance.now();rosterAPI.roomView(roster);activeFourMaps.push({advanceMs:advanced-at,viewMs:performance.now()-advanced})}
 fs.writeFileSync(new URL('../../reports/stage3-capacity/local-four-history.json',import.meta.url),JSON.stringify({kind:'Node synthetic local roster, not phone FPS',node:process.version,initialHibernateMs,advance100Ms,roomViewMs,steady,wakeFourMapsMs,activeFourMaps,rosterBytes:Buffer.byteLength(JSON.stringify(roster))},null,2)+'\n');
});

for(const count of [2,3])test(count+' same-map family players have a measured warm simulation and snapshot cost',()=>{
 const room=createRoom(70+count),map='MAP-REG-GLUDIN';
 for(let i=0;i<count;i++){const original=createGame('knight','Typical '+i,undefined,700+i);addXP(original,xpAtLevel(50));original.player.hp=stats(original).maxHp;assert(room.addMember(String(i),original).ok)}
 const born=performance.now(),states=[...room.probe().members.values()].map(member=>member.state);for(const state of states){ensureWorld(state,map);state.player.map=map;Object.assign(state.player,nearestWalkable(geometry(map),{x:200,y:200}))}refreshFieldCamps(states[0],[],(map,binding,index,viewers)=>spawnMonster(states[0],map,binding,index,viewers),{centers:[states[0].player]});const entryMs=performance.now()-born;
 room.advance(.25);const start=performance.now();room.advance(1);const warm1000Ms=performance.now()-start,snapshot=performance.now(),views=room.memberIds.map(id=>room.networkView(id)),snapshotAllMs=performance.now()-snapshot,commandStart=performance.now();assert(!room.command('0',{type:'configureAuto',settings:{hpThreshold:-1}}).ok);const failedCommandMs=performance.now()-commandStart;
 for(const view of views)assert(validate(view.state).ok,validate(view.state).errors.join());const report={kind:'Node synthetic same-map family capacity, not phone FPS',node:process.version,platform:process.platform,count,map,entryMs,warm1000Ms,snapshotAllMs,failedCommandMs,snapshotBytes:views.map(view=>Buffer.byteLength(JSON.stringify(view))),authorityActorCount:room.probe().worlds[map].monsters.length};fs.writeFileSync(new URL('../../reports/stage3-capacity/camps-'+count+'-same-map.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
});
