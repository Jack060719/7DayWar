import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {launchTestBrowser} from './browser.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
const direction=process.argv[2]||'SW',sourceRow=['S','SW','W','NW','N','NE','E','SE'].indexOf(direction);
if(sourceRow<0)throw Error('Choose S, SW, W, NW, N, NE, E, or SE');
const sourceFiles=['docs/art/shield-pairs/inputs/knight-dagger/idle.png','docs/art/shield-pairs/inputs/knight-unarmed/idle.png'];
const targets=['docs/art/shield-pairs/inputs/knight-dagger/idle-'+direction+'-2x3.png','docs/art/shield-pairs/inputs/knight-unarmed/idle-'+direction+'-reference.png'];
const sources=await Promise.all(sourceFiles.map(async file=>{const bytes=await readFile(path.join(root,file));return{file,sha256:createHash('sha256').update(bytes).digest('hex'),data:'data:image/png;base64,'+bytes.toString('base64')}}));
const browser=await launchTestBrowser(process.env.BROWSER_BINARY,{disableSandbox:process.env.BROWSER_NO_SANDBOX==='1'});let page;
try{
 page=await browser.page();
 const results=await page.evaluate('('+async function({sources,sourceRow}){
  const results=[];
  for(let index=0;index<sources.length;index++){
   const image=new Image;image.src=sources[index].data;await image.decode();
   const canvas=document.createElement('canvas');canvas.width=index?384:768;canvas.height=index?384:1152;
   const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
   for(let frame=0;frame<(index?1:6);frame++)ctx.drawImage(image,frame*192,sourceRow*192,192,192,(frame%2)*384,Math.floor(frame/2)*384,384,384);
   results.push(canvas.toDataURL('image/png').split(',')[1]);
  }
  return results;
 }.toString()+')('+JSON.stringify({sources,sourceRow})+')');
 for(let index=0;index<results.length;index++){
  const bytes=Buffer.from(results[index],'base64'),sha256=createHash('sha256').update(bytes).digest('hex');await writeFile(path.join(root,targets[index]),bytes);
  const metadata={schema:'lineage-shield-direction-reference-v1',source:{file:sources[index].file,sha256:sources[index].sha256},output:{file:targets[index],sha256},direction,sourceCell:[192,192],outputCell:[384,384],sourceRow,sourceFrames:index?[0]:[0,1,2,3,4,5],rows:index?1:3,columns:index?1:2,scale:2,filter:'nearest-neighbor',anchor:[192,300],processing:'Uniform 2x only; original per-cell character placement and alpha retained; no creative edits'};
  await writeFile(path.join(root,targets[index].replace(/\.png$/,'.json')),JSON.stringify(metadata,null,2)+'\n');console.log(JSON.stringify(metadata.output));
 }
}finally{page?.close();await browser.close();}
