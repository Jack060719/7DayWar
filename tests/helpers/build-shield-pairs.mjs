import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {launchTestBrowser, startTestServer} from './browser.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url)),art=path.join(root,'dist/full/art');
const directions=['S','SW','W','NW','N','NE','E','SE'];
const actions=['idle','walk','attack','hit','death','cast'];
const families={knight:['sword','dagger','mace','spear','axe','unarmed'],elf:['sword','dagger','mace','spear','unarmed'],mage:['staff','dagger','mace','unarmed']};
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');

// This reconstructs reference sheets from accepted runtime cells. It creates no art.
async function compose({url,rows,cell}){
 const grid=document.createElement('canvas');grid.width=rows[0].length*cell;grid.height=rows.length*cell;
 const target=grid.getContext('2d'),scratch=document.createElement('canvas');scratch.width=scratch.height=cell;
 const ctx=scratch.getContext('2d',{willReadFrequently:true}),images=new Map,frames=[];
 for(const row of rows)for(const frame of row)if(!images.has(frame.atlas)){
  const image=new Image;image.src=url+'/full/art/'+frame.atlas;await image.decode();images.set(frame.atlas,image);
 }
 for(let row=0;row<rows.length;row++)for(let column=0;column<rows[row].length;column++){
  const frame=rows[row][column],rect=frame.rect;
  if(rect[2]!==cell||rect[3]!==cell)throw Error('Reference cell is not 192 by 192');
  ctx.clearRect(0,0,cell,cell);ctx.drawImage(images.get(frame.atlas),...rect,0,0,cell,cell);
  const pixels=ctx.getImageData(0,0,cell,cell),data=pixels.data,seen=new Uint8Array(cell*cell),components=[];
  for(let start=0;start<seen.length;start++){
   if(seen[start]||data[start*4+3]===0)continue;
   const indices=[start];seen[start]=1;let minX=cell,minY=cell,maxX=0,maxY=0;
   for(let index=0;index<indices.length;index++){
    const at=indices[index],x=at%cell,y=Math.floor(at/cell);minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
     const nx=x+dx,ny=y+dy,next=ny*cell+nx;
     if(nx<0||ny<0||nx>=cell||ny>=cell||seen[next]||data[next*4+3]===0)continue;
     seen[next]=1;indices.push(next);
    }
   }
   components.push({indices,bbox:[minX,minY,maxX-minX+1,maxY-minY+1]});
  }
  if(!components.length)throw Error('Empty reference frame');
  const main=components.reduce((best,c)=>c.indices.length>best.indices.length?c:best),removed=[];
  for(const component of components){
   // Only detached horizontal lines: never crop, scale, or erase connected body pixels.
   if(component===main||component.bbox[3]>2||component.bbox[2]<8)continue;
   for(const at of component.indices)data.fill(0,at*4,at*4+4);
   removed.push({bbox:component.bbox,pixels:component.indices.length});
  }
  ctx.putImageData(pixels,0,0);target.drawImage(scratch,column*cell,row*cell);
  let edgePixels=0;for(let n=0;n<cell;n++)for(const at of [n,(cell-1)*cell+n,n*cell,n*cell+cell-1])if(data[at*4+3])edgePixels++;
  frames.push({row,column,mainBBox:main.bbox,components:components.length,removed,edgePixels});
 }
 return{png:grid.toDataURL('image/png').split(',')[1],width:grid.width,height:grid.height,frames};
}

async function main(){
 const [selection='knight-dagger',action='idle']=process.argv.slice(2),index=JSON.parse(await readFile(path.join(art,'stance-index.json'),'utf8'));
 const choices=Object.entries(families).flatMap(([classId,values])=>values.map(family=>({classId,family,key:classId+'-'+family})));
 const selected=selection==='--all'?choices:choices.filter(row=>row.key===selection);
 if(!selected.length||!actions.includes(action)&&action!=='all')throw Error('Usage: build-shield-pairs.mjs <class-family|--all> <idle|walk|attack|hit|death|cast|all>');
 const server=await startTestServer(),browser=await launchTestBrowser(process.env.BROWSER_BINARY,{disableSandbox:process.env.BROWSER_NO_SANDBOX==='1'});
 let page;
 try{
  page=await browser.page();await page.command('Page.navigate',{url:server.url+'/full/art/stance-index.json'});
  for(const choice of selected){
   const binding=index.classes['CLASS-'+choice.classId.toUpperCase()],manifestPath=choice.family==='axe'?binding.items['EQ-BATTLE-AXE'].manifest:binding.families[choice.family].manifest;
   const manifestBytes=await readFile(path.join(art,manifestPath)),manifest=JSON.parse(manifestBytes);
   for(const name of action==='all'?actions:[action]){
    const rows=directions.map(direction=>manifest.directions[direction][name]);
    if(rows.some(row=>row.length!==rows[0].length))throw Error('Direction frame counts differ');
    const sourceClips=await Promise.all([...new Set(rows.flat().map(frame=>frame.atlas))].map(async file=>({file,sha256:sha(await readFile(path.join(art,file)))})));
    const result=await page.evaluate('('+compose.toString()+')('+JSON.stringify({url:server.url,rows,cell:192})+')');
    const output=path.join(root,'docs/art/shield-pairs/inputs',choice.key);await mkdir(output,{recursive:true});
    const bytes=Buffer.from(result.png,'base64');await writeFile(path.join(output,name+'.png'),bytes);
    const record={schema:'lineage-shield-reference-v1',purpose:'Reference only; not newly generated artwork or runtime acceptance',class:choice.classId,family:choice.family,action:name,sourceManifest:{file:manifestPath,sha256:sha(manifestBytes)},sourceClips,directions,columns:rows[0].length,cell:[192,192],width:result.width,height:result.height,baseHeight:manifest.baseHeight,anchor:manifest.anchor,frames:rows,processing:{tool:'isolated Chromium Canvas; Python sprite helper unavailable',resize:false,translation:false,cleanup:'8-connected alpha components; remove only non-largest detached horizontal lines with width >= 8 and height <= 2 pixels'},qa:result.frames,output:{file:name+'.png',sha256:sha(bytes)}};
    await writeFile(path.join(output,name+'.json'),JSON.stringify(record,null,2)+'\n');
    console.log(JSON.stringify({file:path.relative(root,path.join(output,name+'.png')).replaceAll('\\','/'),sha256:sha(bytes),width:result.width,height:result.height,frames:result.frames.length,removedLines:result.frames.reduce((sum,frame)=>sum+frame.removed.length,0),edgeFrames:result.frames.filter(frame=>frame.edgePixels).length}));
   }
  }
 }finally{page?.close();await browser.close();await server.close();}
}
await main();
