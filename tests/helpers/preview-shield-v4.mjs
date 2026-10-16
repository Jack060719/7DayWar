import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {launchTestBrowser} from './browser.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url)),base=path.join(root,'docs/art/shield-pairs');
const report=JSON.parse(await readFile(path.join(base,'reviews/knight-dagger-component-review.json'),'utf8'));
const selected=[report.results[0],report.results.find(r=>r.file.endsWith('idle-without-shield-v4.png'))];
for(const row of selected)row.data='data:image/png;base64,'+(await readFile(path.join(base,row.file))).toString('base64');
const browser=await launchTestBrowser(process.env.BROWSER_BINARY,{disableSandbox:process.env.BROWSER_NO_SANDBOX==='1'});let page;
try{
 page=await browser.page();const previews=await page.evaluate('('+async function(selected){
  const images=await Promise.all(selected.map(async row=>{const image=new Image;image.src=row.data;await image.decode();return image})),directions=['S','SW','W','NW','N','NE','E','SE'],previews=[];
  function draw(ctx,direction,frame,x,y){
   for(let side=0;side<2;side++){
    const r=selected[side].frames[direction*6+frame].bbox,scale=side?2*selected[0].heightStats.mean/selected[1].heightStats.mean:2,left=x+side*256;
    ctx.fillStyle='#fff';ctx.font='14px sans-serif';ctx.fillText(directions[direction]+' '+(frame+1)+' '+(side?'v4':'reference'),left+8,y+20);
    ctx.drawImage(images[side],...r,left+128-r[2]*scale/2,y+254-r[3]*scale,r[2]*scale,r[3]*scale);
   }
  }
  for(let direction=0;direction<8;direction++){
   const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=840;const ctx=canvas.getContext('2d');ctx.fillStyle='#627584';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.imageSmoothingEnabled=false;
   for(let frame=0;frame<6;frame++)draw(ctx,direction,frame,(frame%2)*512,Math.floor(frame/2)*280);
   previews.push({name:'knight-dagger-idle-v4-'+directions[direction],png:canvas.toDataURL('image/png').split(',')[1]});
  }
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=1120;const ctx=canvas.getContext('2d');ctx.fillStyle='#627584';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.imageSmoothingEnabled=false;
  for(let direction=0;direction<8;direction++)draw(ctx,direction,0,(direction%2)*512,Math.floor(direction/2)*280);
  previews.push({name:'knight-dagger-idle-v4-directions',png:canvas.toDataURL('image/png').split(',')[1]});return previews;
 }.toString()+')('+JSON.stringify(selected)+')');
 for(const preview of previews)await writeFile(path.join(base,'reviews',preview.name+'.png'),Buffer.from(preview.png,'base64'));
 console.log(JSON.stringify({files:previews.map(p=>'docs/art/shield-pairs/reviews/'+p.name+'.png'),method:'Semantic review only: entire v4 uses one preview scale ratio versus reference. Bbox bottom-center registration is a review layout, not final anatomical feet anchoring or an accepted profile.'}));
}finally{page?.close();await browser.close();}
