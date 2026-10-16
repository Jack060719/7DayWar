import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {launchTestBrowser} from './browser.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url)),dir=path.resolve(root,process.argv[2]);
if(!dir.startsWith(path.join(root,'docs/art/shield-pairs/processed')+path.sep))throw Error('Review only staged shield assets');
const qa=JSON.parse(await readFile(path.join(dir,'qa.json'),'utf8')),reference=JSON.parse(await readFile(path.resolve(root,qa.source.file),'utf8'));
const manifest=JSON.parse(await readFile(path.join(dir,'manifest.json'),'utf8'));
const source=path.join(path.dirname(path.resolve(root,qa.source.file)),reference.output.file);
const png=bytes=>'data:image/png;base64,'+bytes.toString('base64');
const data={source:png(await readFile(source)),sheet:png(await readFile(path.join(dir,'sheet-transparent.png'))),reference,clips:[]};
if(qa.cleanup)data.cleanup={raw:png(await readFile(path.resolve(root,qa.raw.file))),cleaned:png(await readFile(path.join(dir,'cleaned-raw.png'))),expectedRemoved:qa.cleanup.removedPixels+(qa.cleanup.backgroundBranches?.pixels||0)};
for(let row=0;row<8;row++){
 const direction=reference.directions[row],frames=manifest.directions[direction][reference.action];
 if(frames.length!==reference.columns||frames.some((f,i)=>f.duration!==reference.frames[row][i].duration))throw Error('Source frame count or durations changed');
 data.clips.push({direction,png:png(await readFile(path.join(dir,'clips',reference.action+'-'+direction+'.png'))),webp:'data:image/webp;base64,'+(await readFile(path.join(dir,'clips',reference.action+'-'+direction+'.webp'))).toString('base64')});
}
const browser=await launchTestBrowser(process.env.BROWSER_BINARY,{disableSandbox:process.env.BROWSER_NO_SANDBOX==='1'});let page;
try{
 page=await browser.page();const result=await page.evaluate('('+async function(data){
  async function load(url){const image=new Image;image.src=url;await image.decode();return image}
  function pixels(image){const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const ctx=c.getContext('2d');ctx.drawImage(image,0,0);return ctx.getImageData(0,0,c.width,c.height).data}
  const source=await load(data.source),sheet=await load(data.sheet),results=[],previews=[];let cleanupReview;
  if(data.cleanup){
   const raw=await load(data.cleanup.raw),cleaned=await load(data.cleanup.cleaned),a=pixels(raw),b=pixels(cleaned);if(raw.width!==cleaned.width||raw.height!==cleaned.height)throw Error('Cleanup changed raw dimensions');
   let removedAlpha1=0,protectedAlpha2Pixels=0,changedProtectedPixels=0,unexpectedAlphaChanges=0;
   for(let i=0;i<a.length;i+=4){if(a[i+3]>=2){protectedAlpha2Pixels++;if(a[i]!==b[i]||a[i+1]!==b[i+1]||a[i+2]!==b[i+2]||a[i+3]!==b[i+3])changedProtectedPixels++}if(a[i+3]===1&&b[i+3]===0)removedAlpha1++;else if(a[i+3]!==b[i+3])unexpectedAlphaChanges++}
   cleanupReview={protectedAlpha2Pixels,changedProtectedPixels,removedAlpha1,expectedRemoved:data.cleanup.expectedRemoved,unexpectedAlphaChanges};
   if(changedProtectedPixels||unexpectedAlphaChanges||removedAlpha1!==data.cleanup.expectedRemoved)throw Error('Cleanup altered protected pixels or differs from its removal log');
  }
  for(let row=0;row<8;row++){
   const entry=data.clips[row],[png,webp]=await Promise.all([load(entry.png),load(entry.webp)]),a=pixels(png),b=pixels(webp);let alphaMismatches=0,maxAlphaDelta=0,rgbSum=0,rgbN=0,edgePixels=0;
   if(png.width!==data.reference.columns*192||webp.width!==png.width||png.height!==192||webp.height!==192)throw Error('Decoded strip dimensions differ');
   for(let i=0;i<a.length;i+=4){const delta=Math.abs(a[i+3]-b[i+3]);if(delta)alphaMismatches++;maxAlphaDelta=Math.max(maxAlphaDelta,delta);if(a[i+3]>=16){for(let c=0;c<3;c++){rgbSum+=Math.abs(a[i+c]-b[i+c]);rgbN++}}const x=(i/4)%png.width,y=Math.floor(i/4/png.width);if(b[i+3]>0&&(x%192===0||x%192===191||y===0||y===191))edgePixels++;}
   results.push({direction:entry.direction,width:webp.width,height:webp.height,alphaMismatches,maxAlphaDelta,meanVisibleRGBDelta:rgbSum/rgbN,edgePixels});
   const canvas=document.createElement('canvas');canvas.width=1536;canvas.height=Math.ceil(data.reference.columns/2)*384;const ctx=canvas.getContext('2d');ctx.fillStyle='#697c86';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.imageSmoothingEnabled=false;
   for(let frame=0;frame<data.reference.columns;frame++)for(let side=0;side<2;side++){
    const x=(frame%2)*768+side*384,y=Math.floor(frame/2)*384;ctx.drawImage(side?sheet:source,frame*192,row*192,192,192,x,y,384,384);ctx.fillStyle='#fff';ctx.font='bold 20px sans-serif';ctx.fillText(entry.direction+' '+(frame+1)+' '+(side?'generated':'reference'),x+10,y+26);
   }
   previews.push({direction:entry.direction,png:canvas.toDataURL('image/png').split(',')[1]});
  }
  const whole=document.createElement('canvas');whole.width=sheet.width;whole.height=sheet.height;const wholeCtx=whole.getContext('2d');wholeCtx.fillStyle='#697c86';wholeCtx.fillRect(0,0,whole.width,whole.height);wholeCtx.drawImage(sheet,0,0);
  return{results,previews,cleanupReview,whole:whole.toDataURL('image/png').split(',')[1]};
 }.toString()+')('+JSON.stringify(data)+')');
 for(const preview of result.previews)await writeFile(path.join(dir,'review-'+preview.direction+'.png'),Buffer.from(preview.png,'base64'));
 await writeFile(path.join(dir,'whole-action-gray-preview.png'),Buffer.from(result.whole,'base64'));
 const summary={schema:'lineage-shield-codec-review-v1',method:'Native Chromium decodes staged PNG and WebP independently; review images use unchanged 192 cells at 2x nearest-neighbor, showing source beside generated. No rescaling or registration beyond the staging profile.',durationsPreserved:true,clips:result.results,footErrorMax:qa.frames.reduce((acc,f)=>[Math.max(acc[0],Math.abs(f.footError[0])),Math.max(acc[1],Math.abs(f.footError[1]))],[0,0]),semanticStatus:'pending-human-image-review'};
 if(result.cleanupReview)summary.cleanupReview=result.cleanupReview;
 await writeFile(path.join(dir,'codec-review.json'),JSON.stringify(summary,null,2)+'\n');
 const failures=result.results.filter(c=>c.maxAlphaDelta||c.edgePixels);console.log(JSON.stringify({dir:path.relative(root,dir),clips:8,failures:failures.length,footErrorMax:summary.footErrorMax,maximumMeanVisibleRGBDelta:Math.max(...result.results.map(c=>c.meanVisibleRGBDelta))}));if(failures.length)process.exitCode=1;
}finally{page?.close();await browser.close();}
