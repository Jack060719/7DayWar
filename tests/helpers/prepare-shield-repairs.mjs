import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {launchTestBrowser} from './browser.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url)),base='docs/art/shield-pairs/';
const qa=JSON.parse(await readFile(path.join(root,base,'processed/knight-dagger-v5-trial/idle/qa.json'),'utf8'));
const raw=await readFile(path.join(root,qa.raw.file)),directions=['W','NE','E','SE'],scale=384/qa.rawCell[0];
const browser=await launchTestBrowser(process.env.BROWSER_BINARY,{disableSandbox:process.env.BROWSER_NO_SANDBOX==='1'});let page;
try{
 page=await browser.page();const results=await page.evaluate('('+async function({data,qa,directions,scale}){
  const image=new Image;image.src=data;await image.decode();const results=[];
  for(const direction of directions){
   const canvas=document.createElement('canvas');canvas.width=768;canvas.height=1152;const ctx=canvas.getContext('2d');ctx.imageSmoothingQuality='high';const frames=[];
   for(const frame of qa.frames.filter(f=>f.direction===direction)){
    const [cx,cy,cw,ch]=frame.sourceCrop,rawFoot=[(frame.sourceFeet[0]-frame.translation[0])/qa.scale,(frame.sourceFeet[1]-frame.translation[1])/qa.scale],translation=[192-rawFoot[0]*scale,300-rawFoot[1]*scale],column=frame.column%2,row=Math.floor(frame.column/2);
    const cell=document.createElement('canvas');cell.width=cell.height=384;const cc=cell.getContext('2d');cc.imageSmoothingQuality='high';cc.drawImage(image,cx,cy,cw,ch,...translation,cw*scale,ch*scale);const pixels=cc.getImageData(0,0,384,384).data;let edge=0;
    const edgeSamples=[];for(let y=0;y<384;y++)for(let x=0;x<384;x++)if(pixels[(y*384+x)*4+3]>0&&(x===0||y===0||x===383||y===383)){edge++;if(edgeSamples.length<12)edgeSamples.push([x,y,pixels[(y*384+x)*4+3]])}
    if(edge)throw Error(direction+' '+frame.column+' reaches a repair guide edge '+JSON.stringify({edgeSamples,crop:frame.sourceCrop,rawFoot,translation}));ctx.drawImage(cell,column*384,row*384);frames.push({frame:frame.column,sourceCrop:frame.sourceCrop,rawFootInCrop:rawFoot,translation,guideRect:[column*384,row*384,384,384],edgePixels:edge});
   }
   results.push({direction,frames,png:canvas.toDataURL('image/png').split(',')[1]});
  }
  return results;
 }.toString()+')('+JSON.stringify({data:'data:image/png;base64,'+raw.toString('base64'),qa,directions,scale})+')');
 for(const result of results){
  const stem=path.join(root,base,'inputs/knight-dagger/idle-'+result.direction+'-v5-2x3'),bytes=Buffer.from(result.png,'base64');await writeFile(stem+'.png',bytes);
  await writeFile(stem+'.json',JSON.stringify({schema:'lineage-shield-direction-repair-reference-v1',purpose:'Localized image edit reference only; no runtime integration or semantic acceptance',raw:qa.raw,sourceGeometryQA:base+'processed/knight-dagger-v5-trial/idle/qa.json',direction:result.direction,columns:2,rows:3,cell:[384,384],footAnchor:[192,300],uniformRawToGuideScale:scale,rawReferenceCell:qa.rawCell,futureNativeScale:'Retain the v5 idle profile; native scale = 0.7766575529733424 * 181 / generatedCellWidth. Generated height must preserve the same cell ratio.',method:'Whole raw-body seam crops from v5. Identical scale for every frame; translation alone places the lower-foot centroid and bottom on [192,300]. No per-frame resizing, silhouette edits, or shield erasure.',frames:result.frames,output:{file:path.basename(stem)+'.png',sha256:createHash('sha256').update(bytes).digest('hex')}},null,2)+'\n');
 }
 console.log(JSON.stringify({files:results.map(r=>base+'inputs/knight-dagger/idle-'+r.direction+'-v5-2x3.png'),scale,frames:24,edgePixels:0}));
}finally{page?.close();await browser.close();}
