import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {launchTestBrowser,startTestServer} from '../helpers/browser.mjs';
const binary=process.env.BROWSER_BINARY,reportDir=path.resolve(process.env.BROWSER_REPORT_DIR||'reports/native-shield-pairs');
const pairs=[['knight','unarmed'],['knight','dagger'],['knight','sword'],['knight','mace'],['knight','spear'],['knight','axe'],['elf','unarmed'],['elf','dagger'],['elf','sword'],['elf','mace'],['elf','spear'],['mage','unarmed'],['mage','dagger'],['mage','mace'],['mage','staff']];

test('one native session covers all 15 shield pairs and one landscape scene',{skip:!binary,timeout:180000},async t=>{
 const site=await startTestServer(),browser=await launchTestBrowser(binary,{disableSandbox:process.env.BROWSER_NO_SANDBOX==='1'}),page=await browser.page();
 t.after(async()=>{page.close();await browser.close();await site.close()});await mkdir(reportDir,{recursive:true});
 await page.command('Page.enable');await page.command('Emulation.setDeviceMetricsOverride',{width:844,height:390,deviceScaleFactor:1,mobile:false});
 await page.command('Page.navigate',{url:site.url+'/full/design-disclosure.json'});
 const until=Date.now()+10000;while(!await page.evaluate('location.pathname==="/full/design-disclosure.json" && document.readyState==="complete"')){if(Date.now()>until)throw Error('Fixture page did not load');await new Promise(r=>setTimeout(r,50))}
 const version=await page.command('Browser.getVersion');
 await page.evaluate('('+async function(){
  const {FullRenderer}=await import('/full/renderer.mjs'),{heroStance}=await import('/full/stances.mjs'),{createGame,command}=await import('/full/engine.mjs'),{grantGear}=await import('/full/rules.mjs'),{ITEMS}=await import('/full/data.mjs'),index=await(await fetch('/full/art/stance-index.json')).json();
  const check=(v,m)=>{if(!v)throw Error(m)},same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),dirs=['S','SW','W','NW','N','NE','E','SE'],actions=['idle','walk','attack','hit','death','cast'];
  function act(s,c){const r=command(s,c);check(r.ok,r.error||'Equipment command failed')}
  function fixture(classId,family,name='Shield fixture'){
   const s=createGame(classId,name,undefined,84);act(s,{type:'unequip',slot:'weapon'});
   if(family!=='unarmed'){
    const item=family==='axe'?ITEMS['EQ-BATTLE-AXE']:Object.values(ITEMS).find(i=>i.slot==='weapon'&&i.family===family&&!i.two_handed&&i.class_restrictions.includes(classId)&&i.min_level<=1);
    check(item,'No fixture weapon '+classId+':'+family);const e=grantGear(s,item.id);e.identified=true;act(s,{type:'equip',uid:e.uid});
   }
   const shield=grantGear(s,'EQ-SMALL-SHIELD');shield.identified=true;return{s,shieldUid:shield.uid};
  }
  document.body.innerHTML='';document.body.style.cssText='margin:0;background:#161b20;overflow:hidden';
  const canvas=document.createElement('canvas');canvas.style.cssText='width:384px;height:192px;position:absolute;left:-1000px';document.body.append(canvas);
  const r=new FullRenderer(canvas);r.scale=1;r.actorIndex={};let pose;r.screen=()=>({x:192,y:150});r.actorState=()=>pose;r.warmActorClips=()=>{};
  const sceneCanvas=document.createElement('canvas');sceneCanvas.style.cssText='width:844px;height:390px';document.body.append(sceneCanvas);
  const scene=new FullRenderer(sceneCanvas);await scene.load();const initial=fixture('knight','dagger').s;scene.map=initial.player.map;await scene.loadMap(initial.player.map);scene.snap(initial);scene.warmActorClips=()=>{};
  async function load(renderer,binding){
   check(binding.manifest&&!binding.missing,'Unintegrated '+binding.consumerId);renderer.actorIndex[binding.consumerId]={manifest:binding.manifest};await renderer.loadActor(binding.consumerId);check(renderer.actorSpecs.has(binding.consumerId),'Manifest failed '+binding.manifest);
  }
  function releaseBodies(renderer,bindings){
   for(const binding of bindings){
    const spec=renderer.actorSpecs.get(binding.consumerId),files=new Set(Object.values(spec?.directions||{}).flatMap(actions=>Object.values(actions).flatMap(frames=>frames.map(f=>f.atlas||spec.atlas))));
    for(const file of files){renderer.images.delete(file);renderer.clipUsage.delete(file)}
    renderer.actorSpecs.delete(binding.consumerId);delete renderer.actorIndex[binding.consumerId];
   }
   renderer.animations.clear();renderer.lastState=null;renderer.preparedHero=null;renderer.setRoomPlayers([]);
  }
  async function sceneCheck(s,peers){
   const expected=[heroStance(s,index),...peers.map(p=>heroStance(p,index))];
   for(const b of expected){await load(scene,b);const spec=scene.actorSpecs.get(b.consumerId);await scene.loadClip(spec.directions.S.idle[0].atlas||spec.atlas)}
   scene.setRoomPlayers(peers);scene.snap(s);const ids=[s.player.id,...peers.map(p=>p.player.id)];
   for(let n=0;n<20;n++){scene.draw(s,performance.now());if(ids.every((id,i)=>scene.animations.get(id)?.lastRenderedFrame?.consumerId===expected[i].consumerId))return expected.map(b=>b.consumerId);await new Promise(resolve=>setTimeout(resolve,25))}
   throw Error('Stale or unloaded hero/family peer '+expected.map(b=>b.consumerId));
  }
  window.shieldFixture={async pair(classId,family){
   const {s,shieldUid}=fixture(classId,family),without=heroStance(s,index);act(s,{type:'equip',uid:shieldUid});const withShield=heroStance(s,index);
   check(without.consumerId.endsWith(':without-shield')&&withShield.consumerId.endsWith(':with-shield'),'Pair not bound '+classId+':'+family);check(without.manifest!==withShield.manifest,'Pair shares body '+family);
   const bindings=[withShield,without],before=JSON.stringify(s),actor={id:'fixture',x:0,y:0,hp:1};for(const b of bindings)await load(r,b);let frameCount=0,clipCount=0;
   for(const action of actions)for(const direction of dirs)for(const binding of bindings){
    const spec=r.actorSpecs.get(binding.consumerId),seq=spec.directions[direction]?.[action];check(seq?.length,'Missing action '+binding.consumerId+':'+direction+':'+action);
    const length=seq.reduce((n,f)=>n+f.duration,0);let elapsed=0;
    for(const file of new Set(seq.map(f=>f.atlas||spec.atlas))){await r.loadClip(file);check(r.images.has(file),'Clip failed '+file);clipCount++}
    for(let f=0;f<seq.length;f++){
     const frame=seq[f],file=frame.atlas||spec.atlas,im=r.images.get(file),rect=frame.rect;
     check(rect[0]>=0&&rect[1]>=0&&rect[0]+rect[2]<=im.naturalWidth&&rect[1]+rect[3]<=im.naturalHeight,'Frame outside decoded clip '+file);
     const time=elapsed+frame.duration/2,window=action==='cast'?650:action==='hit'?220:length;pose={direction,state:action,started:0,renderX:0,renderY:0,attackDuration:length};
     check(r.actor(actor,binding.consumerId,time/length*window),'Draw failed '+file);check(pose.lastRenderedFrame.frameIndex===f&&same(pose.lastRenderedFrame.anchor,frame.anchor||spec.anchor),'Wrong frame/anchor '+file+':'+f);elapsed+=frame.duration;frameCount++;
    }
   }
   check(JSON.stringify(s)===before,'Presentation mutated state');
   const oldSpec=r.actorSpecs.get(withShield.consumerId),newSpec=r.actorSpecs.get(without.consumerId),oldFile=oldSpec.directions.S.idle[0].atlas||oldSpec.atlas,newFile=newSpec.directions.S.idle[0].atlas||newSpec.atlas;
   await r.loadClip(oldFile);pose={direction:'S',state:'idle',started:0,renderX:0,renderY:0};check(r.actor(actor,withShield.consumerId,10),'Old half failed');r.images.delete(newFile);r.clipUsage.delete(newFile);
   const realLoad=r.loadClip;r.loadClip=()=>{};const stale=r.actor(actor,without.consumerId,20);r.loadClip=realLoad;check(!stale,'Old texture leaked while loading');await r.loadClip(newFile);check(r.actor(actor,without.consumerId,30),'New half did not recover');
   const peer=structuredClone(s);peer.player.id='fixture-peer';peer.player.name='家庭測試角色';peer.player.x+=2;act(peer,{type:'unequip',slot:'shield'});
   const first=await sceneCheck(s,[peer]);act(s,{type:'unequip',slot:'shield'});act(peer,{type:'equip',uid:shieldUid});const second=await sceneCheck(s,[peer]);
   check(first[0]===withShield.consumerId&&first[1]===without.consumerId&&second[0]===without.consumerId&&second[1]===withShield.consumerId,'Equipment swap disagrees with scene');
   releaseBodies(r,bindings);releaseBodies(scene,bindings);r.images.clear();r.clipUsage.clear();pose=null;
   return{classId,family,frameCount,clipCount,manifests:bindings.map(b=>b.manifest),sceneBefore:first,sceneAfter:second,staleTextureReused:stale,frameAnchorsVerified:true};
  },async finish(){
   const {s}=fixture('knight','axe','騎士・無盾'),e=fixture('elf','sword','妖精・持盾'),m=fixture('mage','staff','法師・持盾');
   act(e.s,{type:'equip',uid:e.shieldUid});act(m.s,{type:'equip',uid:m.shieldUid});e.s.player.id='final-elf';m.s.player.id='final-mage';e.s.player.x=s.player.x-2;m.s.player.x=s.player.x+2;e.s.player.y=m.s.player.y=s.player.y;
   const consumers=await sceneCheck(s,[e.s,m.s]);for(let n=0;n<8;n++){scene.draw(s,performance.now());await new Promise(resolve=>setTimeout(resolve,25))}
   return{consumers,png:sceneCanvas.toDataURL('image/png').split(',')[1],missing:[...r.missing],failedClips:[...r.failedClips.keys()],failedActors:[...r.failedActors.keys()],sceneFailedClips:[...scene.failedClips.keys()]};
  }};
 }.toString()+')()');
 const results=[];for(const pair of pairs)results.push(await page.evaluate('shieldFixture.pair('+pair.map(v=>JSON.stringify(v)).join(',')+')'));
 const final=await page.evaluate('shieldFixture.finish()');assert.equal(results.length,15);assert.equal(results.reduce((n,r)=>n+r.frameCount,0),10080);
 for(const key of ['missing','failedClips','failedActors','sceneFailedClips'])assert.deepEqual(final[key],[],key);
 await writeFile(path.join(reportDir,'integrated-landscape.png'),Buffer.from(final.png,'base64'));delete final.png;
 await writeFile(path.join(reportDir,'result.json'),JSON.stringify({browser:version.product,viewport:[844,390],pairs:results,...final,scope:'One desktop Chromium session: engine equip/unequip commands, all paired frames through FullRenderer.actor, and synthetic family peers through FullRenderer.draw. One landscape image. No equipment-panel clicking, live RTC, Android/iPhone or sustained FPS claim.'},null,2)+'\n');
});
