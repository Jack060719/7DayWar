import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {launchTestBrowser,startTestServer} from '../helpers/browser.mjs';
const binary=process.env.BROWSER_BINARY;
test('native elemental overlay uses original eight-way clips, four colors and identification/equip gates',{skip:!binary,timeout:60000},async t=>{
 const site=await startTestServer(),browser=await launchTestBrowser(binary,{disableSandbox:process.env.BROWSER_NO_SANDBOX==='1'}),page=await browser.page();t.after(async()=>{page.close();await browser.close();await site.close()});
 await page.command('Page.enable');await page.command('Page.navigate',{url:site.url+'/full/data.mjs'});for(let i=0;i<100&&!await page.evaluate('document.readyState==="complete"&&location.pathname==="/full/data.mjs"');i++)await new Promise(r=>setTimeout(r,25));
 const result=await page.evaluate('('+String(async function(){
  const {createGame,command}=await import('/full/engine.mjs'),{FullRenderer}=await import('/full/renderer.mjs'),{heroStance}=await import('/full/stances.mjs'),{ITEMS}=await import('/full/data.mjs'),{equippedEnchantment}=await import('/full/enchantment-visuals.mjs');
  document.body.innerHTML='<canvas style="width:1120px;height:790px"></canvas>';const cv=document.querySelector('canvas'),r=new FullRenderer(cv);await r.load();r.scale=1;const s=createGame('knight','元素驗收',undefined,32),weapon=s.inventory.equipment.find(e=>e.uid===s.equipped.weapon),armor=s.inventory.equipment.find(e=>ITEMS[e.itemId]?.slot==='armor');if(!armor)throw Error('factory armor missing');s.equipped.armor=armor.uid;weapon.identified=armor.identified=true;
  const stance=heroStance(s,r.stanceIndex);r.actorIndex[stance.consumerId]={manifest:stance.manifest};await r.loadActor(stance.consumerId);const spec=r.actorSpecs.get(stance.consumerId),directions=['S','SW','W','NW','N','NE','E','SE'];for(const d of directions)await r.loadClip(spec.directions[d].idle[0].atlas);
  const c=r.ctx;c.fillStyle='#29332e';c.fillRect(0,0,cv.width,cv.height);c.font='14px sans-serif';c.fillStyle='#eee';c.fillText('Original knight dagger · equipped element accents · idle 8 directions',10,22);
  const rows=[],states=['none','fire','water','wind','earth'];r.screen=(x,y)=>({x,y});r.clockMs=0;
  for(const[ri,kind]of states.entries())for(const[di,d]of directions.entries()){
   if(kind==='none'){delete weapon.enchantment;delete armor.enchantment}else weapon.enchantment=armor.enchantment={version:1,element:{kind,count:'10'}};
   const x=di*140+70,y=ri*148+140,a={...s.player,id:'qa-'+kind+'-'+d,x,y,path:[],consumerId:stance.consumerId};r.actorState(a,1000).direction=d;const before=JSON.stringify(s);r.actor(a,stance.consumerId,1000,72);r.drawEquipmentElements(a,s,1000,72);if(before!==JSON.stringify(s))throw Error('render mutated state');const frame=r.animations.get(a.id).lastRenderedFrame;rows.push({kind,direction:d,drawnDirection:frame?.direction,action:frame?.action,manifest:stance.manifest});c.fillStyle='#ddd';c.fillText(kind+' · '+d,x-48,y+23);
  }
  const grid=cv.toDataURL().split(',')[1],probe={...s.player,id:'probe',x:70,y:130,path:[]};r.screen=(x,y)=>({x,y});r.actorState(probe,1000).direction='S';function pixels(){c.clearRect(0,0,140,160);r.drawEquipmentElements(probe,s,1000,72);return Array.from(c.getImageData(0,0,140,160).data).filter((v,i)=>i%4!==3&&v>0).length}
  weapon.enchantment=armor.enchantment={version:1,element:{kind:'fire',count:'1'}};const equipped=pixels();weapon.identified=armor.identified=false;const unidentified=pixels();weapon.identified=armor.identified=true;const unequipWeapon=command(s,{type:'unequip',slot:'weapon'}),unequipArmor=command(s,{type:'unequip',slot:'armor'});if(!unequipWeapon.ok||!unequipArmor.ok)throw Error('unequip command failed');const unequipped=pixels();command(s,{type:'equip',uid:weapon.uid});const restored=equippedEnchantment(s);
  return{grid,rows,equipped,unidentified,unequipped,restored,unchangedDuringAllDraws:true,filter:c.filter,globalAlpha:c.globalAlpha,scope:'one original knight dagger idle body, four element colors, eight directions; generic directional accent, not per-weapon pixel attachment'};
 })+')()');
 assert.equal(result.rows.length,40);assert(result.rows.every(row=>row.drawnDirection===row.direction&&row.action==='idle'));assert(result.equipped>0);assert.equal(result.unidentified,0);assert.equal(result.unequipped,0);assert.equal(result.restored.weapon,'fire');assert.deepEqual(result.restored.armor,[]);assert.equal(result.filter,'none');assert.equal(result.globalAlpha,1);
 await mkdir('reports/native-enchantment-visuals',{recursive:true});await writeFile('reports/native-enchantment-visuals/eight-directions.png',Buffer.from(result.grid,'base64'));delete result.grid;await writeFile('reports/native-enchantment-visuals/result.json',JSON.stringify({node:process.version,browser:await page.command('Browser.getVersion'),syntheticOnly:true,phone:false,...result},null,2)+'\n');
});
