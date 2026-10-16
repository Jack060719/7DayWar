import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {launchTestBrowser} from './browser.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
const files=['inputs/knight-dagger/idle-SW-2x3.png','raw/knight-dagger/idle-SW-without-shield-v2.png','raw/knight-dagger/idle-SW-without-shield-v3.png'];
const sources=await Promise.all(files.map(async file=>({file,data:'data:image/png;base64,'+(await readFile(path.join(root,'docs/art/shield-pairs',file))).toString('base64')})));
const browser=await launchTestBrowser(process.env.BROWSER_BINARY,{disableSandbox:process.env.BROWSER_NO_SANDBOX==='1'});let page;
try{
 page=await browser.page();const result=await page.evaluate('('+async function(sources){
  const results=[],images=[];
  for(const source of sources){
   const image=new Image;image.src=source.data;await image.decode();images.push(image);
   const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
   const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);const rgba=ctx.getImageData(0,0,image.width,image.height).data;
   const frames=[],size=image.width/2;let clear=0;for(let n=3;n<rgba.length;n+=4)if(rgba[n]===0)clear++;
   for(let row=0;row<3;row++)for(let column=0;column<2;column++){
    let left=size,top=size,right=-1,bottom=-1,count=0,edge=0;
    for(let y=0;y<size;y++)for(let x=0;x<size;x++)if(rgba[((row*size+y)*image.width+column*size+x)*4+3]>=16){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);count++;if(!x||!y||x===size-1||y===size-1)edge++;}
    frames.push({row,column,bbox:[left,top,right-left+1,bottom-top+1],normalizedBBox:[left,top,right-left+1,bottom-top+1].map(n=>n*192/size),normalizedBottomCenter:[(left+right+1)/2*192/size,(bottom+1)*192/size],pixels:count,edgePixels:edge});
   }
   const heights=frames.map(f=>f.normalizedBBox[3]),mean=heights.reduce((a,b)=>a+b)/6,cv=Math.sqrt(heights.reduce((n,v)=>n+(v-mean)**2,0)/6)/mean;
   results.push({file:source.file,width:image.width,height:image.height,cell:size,clearPixels:clear,totalPixels:image.width*image.height,normalizedHeight:{mean,cv},samples:[[0,0],[.235,.235],[.352,.313],[.50,.88]].map(([nx,ny])=>{const x=Math.round(nx*size),y=Math.round(ny*size);return{x,y,rgba:Array.from(rgba.slice((y*image.width+x)*4,(y*image.width+x)*4+4))}}),frames});
  }
  const preview=document.createElement('canvas');preview.width=1152;preview.height=420;const ctx=preview.getContext('2d');ctx.fillStyle='#627584';ctx.fillRect(0,0,preview.width,preview.height);ctx.imageSmoothingEnabled=false;
  for(let i=0;i<3;i++){ctx.fillStyle='#fff';ctx.font='16px sans-serif';ctx.fillText(['reference native alpha','v2 native alpha','v3 native alpha'][i],i*384+10,22);const size=images[i].width/2;ctx.drawImage(images[i],0,0,size,size,i*384,30,384,384);}
  return{results,png:preview.toDataURL('image/png').split(',')[1]};
 }.toString()+')('+JSON.stringify(sources)+')');
 const base=path.join(root,'docs/art/shield-pairs/reviews/knight-dagger-idle-SW-v2-v3');await writeFile(base+'.png',Buffer.from(result.png,'base64'));delete result.png;await writeFile(base+'.json',JSON.stringify({method:'Native Canvas alpha >=16; equal 2x3 cells; bbox and bottom-center proxy normalized to 192px; preview uniform cell scale only, no frame alignment or alpha cleanup',...result},null,2)+'\n');console.log(JSON.stringify(result));
}finally{page?.close();await browser.close();}
