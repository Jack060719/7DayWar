import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,ensureWorld,command,validate} from '../../dist/full/engine.mjs';
import {nearbyUnits,nearbyLoot} from '../../dist/full/nearby-interactions.mjs';
import {mapNPCs,PETS} from '../../dist/full/data.mjs';
import {geometry,walkable,lineOfSight} from '../../dist/full/world.mjs';

function fixture(){const s=createGame('knight','Nearby',undefined,81),n=mapNPCs(s.player.map)[0];Object.assign(s.player,{x:n.position_tiles[0],y:n.position_tiles[1]});return s}
test('nearby selection includes live units in distance order without changing simulation or RNG',()=>{
 const s=fixture(),p=s.player,w=s.worlds[p.map];
 w.monsters=[{id:'near',type:'MON-GOBLIN',x:p.x,y:p.y,hp:10},{id:'far',type:'MON-WOLF',petType:'PET-WOLF',x:p.x+1,y:p.y,hp:10},{id:'dead',x:p.x,y:p.y,hp:0},{id:'captured',x:p.x,y:p.y,hp:5,captured:true},{id:'outside',x:p.x+30,y:p.y,hp:10}];
 s.pets=[{id:'pet',map:p.map,x:p.x,y:p.y,hp:5,active:true}];s.summons=[{id:'summon',map:p.map,x:p.x,y:p.y,hp:5}];
 const allies=[{id:'ally',map:p.map,x:p.x,y:p.y,hp:10},{id:'other-map',map:'MAP-REG-SILVER',x:p.x,y:p.y,hp:10}],before=JSON.stringify(s),rows=nearbyUnits(s,allies),ids=rows.map(hit=>hit.entity.id);
 for(const id of ['near','far','pet','summon','ally'])assert(ids.includes(id),id);assert(rows.some(hit=>hit.kind==='npc'));
 for(const id of ['dead','captured','outside','other-map'])assert(!ids.includes(id),id);assert(ids.indexOf('near')<ids.indexOf('far'));assert.equal(JSON.stringify(s),before);
});
test('selection respects blocked sight, blindness and current map',()=>{
 const s=fixture(),p=s.player,g=geometry(p.map);let blocked;
 for(let y=Math.max(0,p.y-8);y<=p.y+8&&!blocked;y++)for(let x=Math.max(0,p.x-8);x<=p.x+8;x++)if(walkable(g,x,y)&&!lineOfSight(g,p,{x,y})){blocked={x,y};break}
 assert(blocked);s.worlds[p.map].monsters=[{id:'blocked',hp:10,...blocked},{id:'distant',hp:10,x:p.x+3,y:p.y}];
 assert(!nearbyUnits(s).some(hit=>hit.entity.id==='blocked'));p.effects=[{group:'blind',until:1000,values:{visionRadius:1}}];assert(!nearbyUnits(s).some(hit=>hit.entity.id==='distant'));
 p.map='MAP-TOWN-GLUDIN';ensureWorld(s,p.map);assert(!nearbyUnits(s).some(hit=>hit.entity.id==='blocked'));
});
test('nearby loot uses one-cell range, excludes expiry and pays each pile only once after reopen',()=>{
 const s=createGame(),p=s.player,w=s.worlds[p.map];assert(command(s,{type:'drop',itemId:'ITEM-RED-POTION',count:2}).ok);const drop=w.ground[0],count=s.inventory.stacks['ITEM-RED-POTION'];
 assert.equal(nearbyLoot(s).length,1);p.x+=2;assert.equal(nearbyLoot(s).length,0);p.x-=1;assert.equal(nearbyLoot(s).length,1);
 const copy=JSON.parse(JSON.stringify(s));assert(command(copy,{type:'pickup',id:drop.id}).ok);assert.equal(copy.inventory.stacks['ITEM-RED-POTION'],count+2);assert(!command(copy,{type:'pickup',id:drop.id}).ok);assert.equal(nearbyLoot(copy).length,0);assert(validate(copy).ok);
 drop.expiresAt=s.clockMs+1;assert.equal(nearbyLoot(s).length,1);s.clockMs++;assert.equal(nearbyLoot(s).length,0);
});
test('overweight pickup is rejected and retains the ground item',()=>{
 const s=createGame();assert(command(s,{type:'drop',itemId:'ITEM-RED-POTION',count:1}).ok);s.inventory.stacks['ITEM-RED-POTION']=100000;const drop=nearbyLoot(s)[0],before=JSON.stringify(s);
 assert.match(command(s,{type:'pickup',id:drop.id}).error,/負重/);assert.equal(JSON.stringify(s),before);assert.equal(nearbyLoot(s)[0].id,drop.id);
});
test('silver wild companions exist in their authored habitats and are selectable after reopen',()=>{
 const s=createGame(),world=ensureWorld(s,'MAP-REG-SILVER'),wild=world.monsters.filter(m=>m.petType);assert.equal(wild.length,4);assert.deepEqual(wild.map(m=>m.petType),['PET-WOLF','PET-WOLF','PET-SHEPHERD','PET-SHEPHERD']);
 s.player.map=world.mapId;Object.assign(s.player,wild[0].origin);const before=JSON.stringify(s),rows=nearbyUnits(s);assert(rows.some(hit=>hit.entity.id===wild[0].id));assert.equal(JSON.stringify(s),before);
 const copy=JSON.parse(before);assert.equal(nearbyUnits(copy).find(hit=>hit.entity.id===wild[0].id).entity.petType,'PET-WOLF');assert(PETS[wild[0].petType].favorite_food_item_id);assert(validate(copy).ok);
});
