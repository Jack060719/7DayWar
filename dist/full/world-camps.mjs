// Approved Stage3 trial camps. Grid slots are derived, only activated life cycles are saved.
import {MAPS,MONSTERS,isTown} from './data.mjs';
import {geometry,canStep,walkable,distance,findPath} from './world.mjs';
import {visibleCell,SILVER_MAP} from './silver-camps.mjs';

export function habitatSpacing(mapId){
  if(isTown(mapId)||mapId===SILVER_MAP)return null;
  if(mapId.includes('TALKING')||mapId==='MAP-DUN-GLUDIN-F01')return 11;
  if(/DRAGON|FIRE|WIND$|TWILIGHT|FORGOTTEN|TOI|VALAKAS|LINDVIOR/.test(mapId))return 6;
  const floor=/F([0-9]+)$/.exec(mapId);return floor&&Number(floor[1])>3?6:8;
}
export const nearFieldCamp=(viewer,cell,buffer=19)=>visibleCell(viewer,{x:cell.x-Math.sign(cell.x-viewer.x)*Math.min(buffer,Math.abs(cell.x-viewer.x)),y:cell.y-Math.sign(cell.y-viewer.y)*Math.min(buffer,Math.abs(cell.y-viewer.y))});
const reachableCache=new Map;
function reachable(mapId,g){
  if(reachableCache.has(mapId))return reachableCache.get(mapId);
  const reached=new Uint8Array(g.mask.length),queue=new Int32Array(g.mask.length);let head=0,tail=0;
  for(const a of MAPS[mapId].anchors||[]){const i=a.tile_y*g.width+a.tile_x;if(walkable(g,a.tile_x,a.tile_y)&&!reached[i]){reached[i]=1;queue[tail++]=i}}
  while(head<tail){const i=queue[head++],a={x:i%g.width,y:Math.floor(i/g.width)};for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const b={x:a.x+dx,y:a.y+dy},j=b.y*g.width+b.x;if(walkable(g,b.x,b.y)&&!reached[j]&&canStep(g,a,b)){reached[j]=1;queue[tail++]=j}}}
  if(reachableCache.size>=10)reachableCache.delete(reachableCache.keys().next().value);reachableCache.set(mapId,reached);return reached;
}
export function fieldCampAt(mapId,gx,gy){
  const spacing=habitatSpacing(mapId);if(!spacing)return null;
  const g=geometry(mapId),x=gx*spacing+Math.floor(spacing/2),y=gy*spacing+Math.floor(spacing/2),point={x,y};
  if(!walkable(g,x,y)||!reachable(mapId,g)[y*g.width+x])return null;
  if((MAPS[mapId].anchors||[]).some(a=>distance(point,{x:a.tile_x,y:a.tile_y})<4))return null;
  const neighbors=[];for(const [dx,dy] of [[1,0],[0,1],[-1,0],[0,-1]]){const cell={x:x+dx,y:y+dy};if(canStep(g,point,cell))neighbors.push(cell)}
  if(neighbors.length<2)return null;
  const bindings=MAPS[mapId].inhabitant_assignment?.spawn_bindings?.filter(b=>!MONSTERS[b.monster_id].boss&&!MONSTERS[b.monster_id].pet_tameable&&!MONSTERS[b.monster_id].pet_species_id)||[];
  if(!bindings.length)return null;
  const binding=bindings[Math.abs(gx*31+gy*17)%bindings.length],id=mapId+':'+gx+':'+gy;
  return {id,binding,slots:[point,neighbors[0],neighbors[1]],patrol:[neighbors[1],point,neighbors[0]],point};
}
export function enableFieldCamps(world){if(habitatSpacing(world.mapId)&&!world.fieldCamps)world.fieldCamps={revision:1,cycles:{}}}
const derivedKeys=['id','slot','origin','fieldCampId','fieldCampSlot','fieldGeneration','fieldRole','patrol','patrolIndex','x','y'];
function campBase(template,camp,cycle,slot){return {...structuredClone(template),id:cycle.monsterIds[slot],slot,x:camp.slots[slot].x,y:camp.slots[slot].y,origin:{...camp.slots[slot]},fieldCampId:camp.id,fieldCampSlot:slot,fieldGeneration:cycle.generation,fieldRole:slot===2?'patrol':'guard',...(slot===2?{patrol:structuredClone(camp.patrol),patrolIndex:0}:{})}}
function packCamp(ledger,camp,cycle,rows){
 ledger.templates??={};ledger.dormant??={};ledger.templateOrder??=Object.keys(ledger.templates);
 ledger.dormant[camp.id]=JSON.stringify({cycle,actors:rows.map((row,slot)=>{
  const key=row.type+'|'+(row.definitionProfile||'')+'|'+(row.elite?1:0),actor=JSON.parse(JSON.stringify(row));
  if(!ledger.templates[key]){ledger.templates[key]={...actor};for(const field of derivedKeys)delete ledger.templates[key][field]}
  const base=campBase(ledger.templates[key],camp,cycle,slot),changes=Object.fromEntries(Object.entries(actor).filter(([field,value])=>JSON.stringify(value)!==JSON.stringify(base[field]))),removed=Object.keys(base).filter(field=>!(field in actor));
  if(!ledger.templateOrder.includes(key))ledger.templateOrder.push(key);return [ledger.templateOrder.indexOf(key),changes,removed];
 })});delete ledger.cycles[camp.id];
}
export function fieldCampMonsterIds(world){
 const ledger=world.fieldCamps;if(!ledger)return [];
 const ids=Object.values(ledger.cycles).flatMap(cycle=>cycle.monsterIds);
 for(const packed of Object.values(ledger.dormant||{})){const saved=typeof packed==='string'?JSON.parse(packed):packed;if(saved.cycle)ids.push(...saved.cycle.monsterIds)}
 return ids;
}
export function dormantFieldActors(world){
 const ledger=world.fieldCamps;if(!ledger?.dormant)return [];
 return Object.entries(ledger.dormant).flatMap(([id,packed])=>{
  const saved=typeof packed==='string'?JSON.parse(packed):packed,records=saved.actors||saved;
  const cycle=saved.cycle||ledger.cycles[id],camp=fieldCampAt(world.mapId,cycle.gx,cycle.gy);
  return records.map(([reference,changes,removed],slot)=>{
   const key=typeof reference==='number'?ledger.templateOrder?.[reference]:reference;
   if(!ledger.templates[key]||records.length!==3||!changes||typeof changes!=='object'||Array.isArray(changes)||!Array.isArray(removed))throw Error('休眠營地資料不完整');
   const actor={...campBase(ledger.templates[key],camp,cycle,slot),...changes};for(const field of removed)delete actor[field];return actor;
  });
 });
}
function wakeCamp(world,id){const ledger=world.fieldCamps,records=ledger.dormant?.[id];if(!records)return;const saved=typeof records==='string'?JSON.parse(records):records;if(saved.cycle)ledger.cycles[id]=saved.cycle;const subset={...world,fieldCamps:{...ledger,dormant:{[id]:records}}};world.monsters.push(...dormantFieldActors(subset));delete ledger.dormant[id]}
export function refreshFieldCamps(s,viewers,spawn,{mapId=s.player.map,centers=viewers}={}){
  const world=s.worlds[mapId],ledger=world?.fieldCamps,spacing=habitatSpacing(mapId);if(!ledger||!spacing)return;
  const actors=new Map(world.monsters.map(m=>[m.id,m])),activeIds=new Set(world.monsters.filter(m=>m.fieldCampId).map(m=>m.fieldCampId));
  for(const id of activeIds){
    const cycle=ledger.cycles[id];
    if(cycle.clearedAt!==null)continue;
    const rows=cycle.monsterIds.map(id=>actors.get(id));
    if(rows.every(m=>m&&m.hp<=0&&!m.captured)&&cycle.clearedAt===null){cycle.clearedAt=s.clockMs;cycle.nextSpawnAt=Math.max(s.clockMs+90000,...rows.map(m=>m.respawnAt||0))}
  }
  if(!centers.length&&!activeIds.size)return;
  const candidates=new Map,g=geometry(mapId);
  // Conservative renderer viewport plus one camp spacing and eight cells of walking buffer.
  for(const viewer of centers)for(let gy=Math.max(0,Math.floor((viewer.y-152)/spacing));gy<=Math.min(Math.floor((g.height-1)/spacing),Math.ceil((viewer.y+152)/spacing));gy++)for(let gx=Math.max(0,Math.floor((viewer.x-152)/spacing));gx<=Math.min(Math.floor((g.width-1)/spacing),Math.ceil((viewer.x+152)/spacing));gx++){
    const point={x:gx*spacing+Math.floor(spacing/2),y:gy*spacing+Math.floor(spacing/2)};
    if(nearFieldCamp(viewer,point,spacing+8))candidates.set(gx+','+gy,{gx,gy});
  }
  const activeCampIds=new Set([...candidates.values()].map(({gx,gy})=>mapId+':'+gx+':'+gy)),sleepIds=new Set;
  for(const id of activeIds){
    const cycle=ledger.cycles[id],rows=cycle.monsterIds.map(actorId=>actors.get(actorId));
    if(!activeCampIds.has(id)&&rows.every(monster=>monster&&monster.hp>0&&!monster.effects?.length&&!monster.monsterCast&&!viewers.some(viewer=>viewer.id===monster.targetId||nearFieldCamp(viewer,monster,spacing+8)))){const camp=fieldCampAt(mapId,cycle.gx,cycle.gy);packCamp(ledger,camp,cycle,rows);for(const row of rows)sleepIds.add(row.id)}
  }
  if(sleepIds.size)world.monsters=world.monsters.filter(monster=>!sleepIds.has(monster.id));
  const waking=[...activeCampIds].filter(id=>ledger.dormant?.[id]);
  for(const id of waking)wakeCamp(world,id);
  if(waking.length)world.monsters.sort((a,b)=>!a.fieldCampId&&!b.fieldCampId?0:!a.fieldCampId?-1:!b.fieldCampId?1:BigInt(a.id.slice(1))<BigInt(b.id.slice(1))?-1:1);
  const legacy=world.monsters.filter(m=>!m.fieldCampId&&m.hp>0);
  for(const {gx,gy} of [...candidates.values()].sort((a,b)=>a.gy-b.gy||a.gx-b.gx)){
    const id=mapId+':'+gx+':'+gy,cycle=ledger.cycles[id];
    if(cycle&&(cycle.nextSpawnAt===null||cycle.nextSpawnAt>s.clockMs))continue;
    const camp=fieldCampAt(mapId,gx,gy);if(!camp||viewers.some(viewer=>camp.slots.some(cell=>visibleCell(viewer,cell))))continue;
    if(!cycle&&legacy.some(monster=>distance(monster,camp.point)<spacing))continue;
    const generation=cycle?cycle.generation+1:0,rows=camp.slots.map((cell,index)=>spawn(mapId,{...camp.binding,fixedCell:cell},index,viewers));
    if(rows.some(monster=>!monster))throw Error('營地合法槽生成失敗');
    for(let index=0;index<rows.length;index++)Object.assign(rows[index],{fieldCampId:id,fieldCampSlot:index,fieldGeneration:generation,fieldRole:index===2?'patrol':'guard',...(index===2?{patrol:camp.patrol,patrolIndex:0}:{})});
    if(cycle){const retired=new Set(cycle.monsterIds);world.monsters=world.monsters.filter(m=>!retired.has(m.id))}
    world.monsters.push(...rows);ledger.cycles[id]={gx,gy,generation,monsterIds:rows.map(m=>m.id),clearedAt:null,nextSpawnAt:null};
  }
}
export function fieldPatrol(s,monster){
  if(monster.fieldRole!=='patrol'||monster.path.length||!monster.patrol?.length)return;
  monster.patrolIndex=((monster.patrolIndex||0)+1)%monster.patrol.length;
  monster.path=findPath(geometry(s.player.map),monster,monster.patrol[monster.patrolIndex])||[];
}

export function validateFieldCamps(world){
  const errors=[],check=(ok,message)=>{if(!ok)errors.push(message)},int=n=>Number.isSafeInteger(n)&&n>=0;
  if(!world.fieldCamps){if(world.monsters.some(m=>m.fieldCampId))errors.push('營地怪缺少周期帳本');return errors}
  try{
    check(world.fieldCamps.revision===1&&!!habitatSpacing(world.mapId),'全圖營地版本或地區');
    const ledger=world.fieldCamps,cycles={...ledger.cycles},plain=value=>value&&typeof value==='object'&&!Array.isArray(value),safeKey=key=>typeof key==='string'&&!['__proto__','prototype','constructor'].includes(key);
    check(plain(ledger.cycles),'營地周期格式');
    if(ledger.templates!==undefined)check(plain(ledger.templates),'休眠模板格式');
    if(ledger.dormant!==undefined)check(plain(ledger.dormant),'休眠營地格式');
    if(ledger.templateOrder!==undefined)check(Array.isArray(ledger.templateOrder)&&new Set(ledger.templateOrder).size===ledger.templateOrder.length&&ledger.templateOrder.every(key=>typeof key==='string'&&!!ledger.templates?.[key]),'休眠模板索引');
    for(const [key,template] of Object.entries(ledger.templates||{}))check(plain(template)&&MONSTERS[template.type]&&key===template.type+'|'+(template.definitionProfile||'')+'|'+(template.elite?1:0)&&derivedKeys.every(field=>!(field in template)),'休眠模板内容');
    for(const [id,packed] of Object.entries(ledger.dormant||{})){
      const saved=typeof packed==='string'?JSON.parse(packed):packed,records=saved.actors||saved;if(saved.cycle){check(!cycles[id],'重複活躍與休眠周期');cycles[id]=saved.cycle}
      check(!!cycles[id]&&Array.isArray(records)&&records.length===3,'休眠營地成員');
      for(const record of records){check(Array.isArray(record)&&record.length===3&&(typeof record[0]==='string'&&!!ledger.templates?.[record[0]]||int(record[0])&&!!ledger.templates?.[ledger.templateOrder?.[record[0]]])&&plain(record[1])&&Array.isArray(record[2]),'休眠營地差異格式');const changes=record[1],removed=record[2];check(Object.keys(changes).every(safeKey)&&removed.every(safeKey)&&new Set(removed).size===removed.length&&!removed.some(key=>key in changes),'休眠營地差異欄位');}
    }
    const allActors=[...world.monsters,...dormantFieldActors(world)],byId=new Map(allActors.map(actor=>[actor.id,actor])),ids=new Set;
    check(byId.size===allActors.length,'重複活躍與休眠營地個體');
    check(dormantFieldActors(world).every(actor=>actor.hp>0&&!actor.effects?.length&&!actor.monsterCast),'休眠個體仍有即時戰鬥或狀態');
    for(const [id,cycle] of Object.entries(cycles)){
      check(int(cycle.gx)&&int(cycle.gy)&&int(cycle.generation)&&id===world.mapId+':'+cycle.gx+':'+cycle.gy,'營地槽位或世代');
      const camp=fieldCampAt(world.mapId,cycle.gx,cycle.gy);check(!!camp,'營地位於非合法棲地');
      check(cycle.clearedAt===null&&cycle.nextSpawnAt===null||int(cycle.clearedAt)&&int(cycle.nextSpawnAt)&&cycle.nextSpawnAt>=cycle.clearedAt+90000,'營地重生期限');
      check(Array.isArray(cycle.monsterIds)&&cycle.monsterIds.length===3,'營地成員數');
      cycle.monsterIds.forEach((actorId,slot)=>{
        check(!ids.has(actorId),'重複營地成員');ids.add(actorId);
        const monster=byId.get(actorId);
        check(!!monster&&monster.fieldCampId===id&&monster.fieldCampSlot===slot&&monster.fieldGeneration===cycle.generation&&monster.fieldRole===(slot===2?'patrol':'guard'),'營地成員紀錄');
        if(monster&&camp)check(monster.type===camp.binding.monster_id&&monster.populationId===camp.binding.population_id&&monster.origin.x===camp.slots[slot].x&&monster.origin.y===camp.slots[slot].y,'營地棲地或原點');
      });
    }
    check(allActors.filter(m=>m.fieldCampId).every(m=>ids.has(m.id)),'未登錄營地怪');
  }catch{errors.push('全圖營地結構不完整')}
  return errors;
}
