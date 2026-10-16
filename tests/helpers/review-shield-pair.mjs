import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {launchTestBrowser} from './browser.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
const files=['docs/art/shield-pairs/inputs/knight-dagger/idle.png','docs/art/shield-pairs/raw/knight-dagger/idle-without-shield-v1.png'];
const sources=await Promise.all(files.map(async file=>{const bytes=await readFile(path.join(root,file));return{file,sha256:createHash('sha256').update(bytes).digest('hex'),data:'data:image/png;base64,'+bytes.toString('base64')}}));

async function review(sources){
 const directions=['S','SW','W','NW','N','NE','E','SE'],results=[],images=[];
 for(const source of sources){
  const image=new Image;image.src=source.data;await image.decode();images.push(image);
  const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);
  const rgba=ctx.getImageData(0,0,image.width,image.height).data,frames=[];
  let transparent=0,opaque=0;for(let i=3;i<rgba.length;i+=4){if(rgba[i]===0)transparent++;if(rgba[i]===255)opaque++;}
  for(let row=0;row<8;row++)for(let column=0;column<6;column++){
   const x0=Math.round(column*image.width/6),x1=Math.round((column+1)*image.width/6),y0=Math.round(row*image.height/8),y1=Math.round((row+1)*image.height/8);
   let left=x1,top=y1,right=-1,bottom=-1,count=0,edgePixels=0;
   for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)if(rgba[(y*image.width+x)*4+3]>=16){
    left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);count++;
    if(x===x0||x===x1-1||y===y0||y===y1-1)edgePixels++;
   }
   const bbox=count?[left-x0,top-y0,right-left+1,bottom-top+1]:null;
   frames.push({direction:directions[row],column,cell:[x0,y0,x1-x0,y1-y0],bbox,normalizedBBox:bbox?.map(v=>v*192/(x1-x0)),bottomCenterProxy:bbox?[(left+right+1)/2-x0,bottom+1-y0]:null,normalizedBottomCenterProxy:bbox?[(left+right+1-2*x0)/2*192/(x1-x0),(bottom+1-y0)*192/(y1-y0)]:null,opaquePixels:count,edgePixels});
  }
  const heights=frames.filter(frame=>frame.bbox).map(frame=>frame.normalizedBBox[3]),mean=heights.reduce((n,v)=>n+v,0)/heights.length,cv=Math.sqrt(heights.reduce((n,v)=>n+(v-mean)**2,0)/heights.length)/mean;
  results.push({file:source.file,sha256:source.sha256,width:image.width,height:image.height,cell:[image.width/6,image.height/8],transparentPixels:transparent,opaquePixels:opaque,emptyFrames:frames.filter(frame=>!frame.bbox).length,edgeFrames:frames.filter(frame=>frame.edgePixels).length,normalizedHeight:{mean,cv,min:Math.min(...heights),max:Math.max(...heights)},frames});
 }
 const preview=document.createElement('canvas');preview.width=768;preview.height=4*412;
 const p=preview.getContext('2d');p.fillStyle='#24303a';p.fillRect(0,0,preview.width,preview.height);p.imageSmoothingEnabled=false;
 for(const [index,direction] of ['S','SW','N','E'].entries())for(let side=0;side<2;side++){
  const row=directions.indexOf(direction),image=images[side],frame=results[side].frames[row*6];
  p.fillStyle='#f7f0df';p.font='16px sans-serif';p.fillText(direction+' · '+(side?'generated native scale':'reference native scale'),side*384+8,index*412+20);
  p.drawImage(image,...frame.cell,side*384,index*412+28,frame.cell[2]*2,frame.cell[3]*2);
 }
 const comparisons=results[0].frames.map((original,index)=>{const generated=results[1].frames[index];return{direction:original.direction,column:original.column,heightRatio:generated.normalizedBBox?.[3]/original.normalizedBBox[3],bottomProxyDelta:generated.normalizedBottomCenterProxy?.map((v,i)=>v-original.normalizedBottomCenterProxy[i])}});
 return{results,comparisons,png:preview.toDataURL('image/png').split(',')[1]};
}

const browser=await launchTestBrowser(process.env.BROWSER_BINARY,{disableSandbox:process.env.BROWSER_NO_SANDBOX==='1'});let page;
try{
 page=await browser.page();const reviewed=await page.evaluate('('+review.toString()+')('+JSON.stringify(sources)+')');
 const directory=path.join(root,'docs/art/shield-pairs/reviews');await mkdir(directory,{recursive:true});
 await writeFile(path.join(directory,'knight-dagger-idle-v1-comparison.png'),Buffer.from(reviewed.png,'base64'));delete reviewed.png;
 await writeFile(path.join(directory,'knight-dagger-idle-v1.json'),JSON.stringify({schema:'lineage-shield-reference-review-v1',method:'Native Chromium Canvas, alpha >= 16; equal 8 rows by 6 columns; normalized measurements use 192 px cells. Bottom-center is a bounding-box proxy, not a measured anatomical foot anchor. Preview doubles actual pixels without registration or body resizing.',...reviewed},null,2)+'\n');
 console.log(JSON.stringify(reviewed.results.map(({frames,...result})=>result)));
}finally{page?.close();await browser.close();}
