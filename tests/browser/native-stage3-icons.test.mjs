import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {launchTestBrowser,startTestServer} from '../helpers/browser.mjs';
const binary=process.env.BROWSER_BINARY,meta=JSON.parse(await readFile(new URL('../../docs/art/stage3-icons/pipeline-meta.json',import.meta.url),'utf8'));
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));

test('native browser decodes 47 Stage3 icons and renders their real 32px CSS bindings',{skip:!binary,timeout:45000},async t=>{
 const site=await startTestServer(),browser=await launchTestBrowser(binary,{disableSandbox:process.env.BROWSER_NO_SANDBOX==='1'}),page=await browser.page(),out=path.resolve('reports/native-stage3-icons');
 t.after(async()=>{page.close();await browser.close();await site.close()});await mkdir(out,{recursive:true});
 await page.command('Page.enable');await page.command('Emulation.setDeviceMetricsOverride',{width:1440,height:920,deviceScaleFactor:1,mobile:false});
 await page.command('Page.navigate',{url:site.url+'/full/data.mjs'});
 for(let i=0;i<100&&!await page.evaluate('document.readyState==="complete"&&location.pathname==="/full/data.mjs"');i++)await delay(50);
 const result=await page.evaluate('('+String(async function(meta){
  const {ICONS,iconHTML}=await import('/full/icons.mjs'),{ITEMS}=await import('/full/data.mjs');
  const sheet=document.createElement('link');sheet.rel='stylesheet';sheet.href='/full/app.css';document.head.append(sheet);await new Promise((resolve,reject)=>{sheet.onload=resolve;sheet.onerror=reject});
  document.body.innerHTML='';Object.assign(document.body.style,{display:'block',height:'auto',overflow:'auto',background:'#161b15',color:'#efdfbc',fontFamily:'sans-serif'});
  const root=document.createElement('div');root.style.cssText='display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:12px';document.body.append(root);
  const im=new Image;im.src='/full/art/'+meta.atlas.path;await im.decode();
  const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(im,0,0);
  const result=[],encodings=new Set;
  for(const f of meta.frames){
   const row=document.createElement('div');row.style.cssText='display:flex;align-items:center;gap:10px;min-height:60px;padding:4px;border:1px solid #5a5540';row.innerHTML=iconHTML(f.id);const label=document.createElement('span');label.textContent=ITEMS[f.id].name_zh;label.style.cssText='font-size:15px;line-height:20px';row.append(label);root.append(row);
   const icon=row.querySelector('.entity-icon'),style=getComputedStyle(icon),bounds=icon.getBoundingClientRect(),[x,y,w,h]=ICONS[f.id].rect,d=ctx.getImageData(x,y,w,h).data;
   let alphaPixels=0,edgePixels=0,visibleMagentaPixels=0,magentaAlphaMax=0;
   for(let n=0;n<d.length;n+=4){if(!d[n+3])continue;alphaPixels++;const px=n/4%w,py=Math.floor(n/4/w);if(px===0||py===0||px===w-1||py===h-1)edgePixels++;if(d[n]>180&&d[n+2]>180&&d[n+1]<100){magentaAlphaMax=Math.max(magentaAlphaMax,d[n+3]);if(d[n+3]>=16)visibleMagentaPixels++;}}
   const frame=document.createElement('canvas');frame.width=w;frame.height=h;frame.getContext('2d').putImageData(ctx.getImageData(x,y,w,h),0,0);encodings.add(frame.toDataURL());
   result.push({id:f.id,width:bounds.width,height:bounds.height,contentWidth:style.width,contentHeight:style.height,borderWidth:style.borderLeftWidth,background:style.backgroundImage,backgroundPosition:style.backgroundPosition,backgroundSize:style.backgroundSize,alphaPixels,edgePixels,visibleMagentaPixels,magentaAlphaMax});
  }
  await document.fonts.ready;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  return{atlasWidth:im.width,atlasHeight:im.height,uniqueCells:encodings.size,icons:result};
 })+')('+JSON.stringify(meta)+')');
 assert.deepEqual([result.atlasWidth,result.atlasHeight],[1024,192]);assert.equal(result.uniqueCells,47);assert.equal(result.icons.length,47);
 for(const row of result.icons){const f=meta.frames.find(f=>f.id===row.id);assert.deepEqual([row.contentWidth,row.contentHeight],['32px','32px'],row.id);assert.deepEqual([row.width,row.height],[34,34],row.id);assert.equal(row.borderWidth,'1px');assert.equal(row.backgroundSize,'512px auto');assert.ok(row.background.endsWith('/full/art/icons/stage3-items.webp")'));assert.equal(row.backgroundPosition,(-f.rect[0]/2)+'px '+(-f.rect[1]/2)+'px');assert.ok(row.alphaPixels>0);assert.equal(row.edgePixels,0);assert.equal(row.visibleMagentaPixels,0)}
 const shot=await page.command('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});await writeFile(path.join(out,'gallery-32.png'),Buffer.from(shot.data,'base64'));
 await writeFile(path.join(out,'result.json'),JSON.stringify({node:process.version,browser:await page.command('Browser.getVersion'),rendering:'headless Chromium; disable-gpu/in-process-gpu; isolated profile; not a phone',...result},null,2)+'\n');
});
