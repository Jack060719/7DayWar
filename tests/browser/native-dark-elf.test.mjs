import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {launchTestBrowser,startTestServer} from '../helpers/browser.mjs';
const binary=process.env.BROWSER_BINARY;
test('native Canvas decodes dark elf clips and draws wild/form actors with inherited arrows',{skip:!binary,timeout:60000},async t=>{
 const site=await startTestServer(),browser=await launchTestBrowser(binary,{disableSandbox:process.env.BROWSER_NO_SANDBOX==='1'}),page=await browser.page();
 t.after(async()=>{page.close();await browser.close();await site.close()});
 await page.command('Page.enable');await page.command('Emulation.setDeviceMetricsOverride',{width:1000,height:640,deviceScaleFactor:1,mobile:false});await page.command('Page.navigate',{url:site.url+'/full/data.mjs'});
 for(let i=0;i<100&&!await page.evaluate('document.readyState==="complete"&&location.pathname==="/full/data.mjs"');i++)await new Promise(r=>setTimeout(r,30));
 const result=await page.evaluate('('+String(async function(){
 const spec=await(await fetch('/full/art/aux-humanoid-staging/actors/fi-dark-elf/fi-dark-elf-runtime.json')).json();
 const {NONHERO_ARROW_EMITTERS}=await import('/full/nonhero-arrow-emitters.mjs'),markers=NONHERO_ARROW_EMITTERS['aux-humanoid-staging/actors/fi-dark-elf/fi-dark-elf-runtime.json'].attack;
 const directions=['S','SW','W','NW','N','NE','E','SE'],result={sheets:{},clips:[]};
 for(const action of['idle','walk','attack','hit','death']){
  const canvas=document.createElement('canvas');canvas.width=1280;canvas.height=8*164+36;const c=canvas.getContext('2d',{willReadFrequently:true});c.fillStyle='#28312d';c.fillRect(0,0,canvas.width,canvas.height);c.font='16px sans-serif';c.fillStyle='white';c.fillText(action+' — existing FI dark elf body (150px baseline)',8,23);
  for(const[di,d]of directions.entries()){
   const clip=spec.directions[d][action],im=new Image();im.src='/full/art/'+clip[0].atlas;await im.decode();c.fillStyle='white';c.fillText(d,5,di*164+118);
   const pixel=document.createElement('canvas');pixel.width=192;pixel.height=192;const pc=pixel.getContext('2d',{willReadFrequently:true});let edge=0,empty=0;
   for(const[fi,f]of clip.entries()){
    const x=64+fi*150,y=36+di*164; c.fillStyle=fi%2?'#394139':'#222d27';c.fillRect(x,y,144,144);c.strokeStyle='#557364';c.beginPath();c.moveTo(x,y+112.5);c.lineTo(x+144,y+112.5);c.stroke();c.drawImage(im,...f.rect,x,y,144,144);if(action==='attack'&&fi===markers[d].frameIndex){c.strokeStyle='#e6b44f';c.beginPath();c.arc(x+markers[d].point[0]*.75,y+markers[d].point[1]*.75,4,0,Math.PI*2);c.stroke()}c.fillStyle='#ccc';c.fillText(String(fi),x+3,y+159);
    pc.clearRect(0,0,192,192);pc.drawImage(im,...f.rect,0,0,192,192);const data=pc.getImageData(0,0,192,192).data;let opaque=0;for(let i=0;i<data.length;i+=4){if(data[i+3]<16)continue;opaque++;const n=i/4,px=n%192,py=Math.floor(n/192);if(px===0||py===0||px===191||py===191)edge++;}if(!opaque)empty++;
   }
   result.clips.push({direction:d,action,frames:clip.length,empty,edge});
  }
  result.sheets[action]=canvas.toDataURL('image/png').split(',')[1];
 }
 return result;
})+')()');

 assert.equal(result.clips.length,40);assert.equal(result.clips.reduce((n,c)=>n+c.frames,0),272);for(const clip of result.clips){assert.equal(clip.empty,0,clip.action+clip.direction);assert.equal(clip.edge,0,clip.action+clip.direction)}
 await mkdir('reports/dark-elf',{recursive:true});for(const[action,data]of Object.entries(result.sheets))await writeFile('reports/dark-elf/'+action+'.png',Buffer.from(data,'base64'));delete result.sheets;
 const scene=await page.evaluate('('+String(async function(){
  const {createGame,command}=await import('/full/engine.mjs'),{recordFormKill}=await import('/full/form-progress.mjs'),{FullRenderer,projectileLaunchPoint}=await import('/full/renderer.mjs');
  document.body.innerHTML='<canvas style="display:block;width:1000px;height:640px"></canvas>';document.body.style.margin='0';
  const s=createGame('knight','暗黑精靈變身（合成）',undefined,135);s.player.x=59;s.player.y=52;s.inventory.stacks['ITEM-POLYMORPH-SCROLL']=1;for(let i=0;i<300;i++)recordFormKill(s,'MON-DARK-ELF');const used=command(s,{type:'useItem',itemId:'ITEM-POLYMORPH-SCROLL',formId:'MON-DARK-ELF'});if(!used.ok)throw Error(used.error);
  const m={...structuredClone(s.player),id:'qa-wild-dark-elf',name:'暗黑精靈（野怪合成）',type:'MON-DARK-ELF',x:61,y:50,effects:[],path:[],targetId:'hero',maxHp:100,hp:100};s.worlds[s.player.map].monsters=[m];s.player.targetId=m.id;s.player.path=[];
  const r=new FullRenderer(document.querySelector('canvas'));await r.load();await r.loadActor('MON-DARK-ELF');for(const direction of Object.values(r.actorSpecs.get('MON-DARK-ELF').directions))await r.loadClip(direction.attack[0].atlas);
  for(let i=0;i<200;i++){r.draw(s,performance.now());if(r.terrain.has(s.player.map)&&r.animations.get('hero')?.lastRenderedFrame&&r.animations.get(m.id)?.lastRenderedFrame&&r.loadingClips.size===0)break;await new Promise(resolve=>setTimeout(resolve,25))}
  let at=performance.now();r.draw(s,at);const idle=document.querySelector('canvas').toDataURL().split(',')[1],frames={hero:r.animations.get('hero')?.lastRenderedFrame,wild:r.animations.get(m.id)?.lastRenderedFrame},stateBefore=JSON.stringify(s),arrows=[];
  for(const source of[m,s.player]){
   const target=source===m?s.player:m,from={x:source.x,y:source.y},to={x:target.x,y:target.y},attackId='qa-'+source.id,attack={type:'actorAttack',kind:'weapon',actorId:source.id,actorType:source.type,from,to,projectile:true,mapId:s.player.map,intervalMs:650,attackId},visual={type:'visual',phase:'flight',assetId:'ASSET-PROJECTILE-ARROW',sourceActorId:source.id,targetActorId:target.id,from,to,mapId:s.player.map,durationMs:250,attackId};
   at+=700;r.draw(s,at);const timing=r.contactTiming(attack,s);r.notice([attack,visual],s,at);r.draw(s,at+timing.release+45);const fx=r.effects.find(e=>e.attackId===attackId),origin=fx&&r.flightOrigin(fx);arrows.push({sourceId:source.id,timing,origin,frame:r.animations.get(source.id)?.lastRenderedFrame});
  }
  const arrow=document.querySelector('canvas').toDataURL().split(',')[1];return{idle,arrow,frames,arrows,unchanged:JSON.stringify(s)===stateBefore,missing:[...r.missing].filter(id=>id.includes('DARK-ELF')),height:r.actorHeight('MON-DARK-ELF')};
 })+')()');
 assert.equal(scene.unchanged,true);assert.equal(scene.height,72);assert.deepEqual(scene.missing,[]);for(const frame of Object.values(scene.frames)){assert.equal(frame.consumerId,'MON-DARK-ELF');assert.equal(frame.action,'idle')};for(const row of scene.arrows){assert(row.timing.release>0);assert.equal(row.origin.measured,true);assert.equal(row.frame.consumerId,'MON-DARK-ELF');assert.equal(row.frame.action,'attack')}
 for(const key of['idle','arrow']){await writeFile('reports/dark-elf/scene-'+key+'.png',Buffer.from(scene[key],'base64'));delete scene[key]}
 await writeFile('reports/dark-elf/result.json',JSON.stringify({node:process.version,browser:await page.command('Browser.getVersion'),scope:'Synthetic state, actual Canvas/FullRenderer; desktop headless Chromium, not a phone; source file provenance not re-audited',...result,scene},null,2));
});
