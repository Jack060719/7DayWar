import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {launchTestBrowser} from './browser.mjs';
import {shieldComponents} from './shield-components.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url)),sha=bytes=>createHash('sha256').update(bytes).digest('hex');
if(process.argv.length<5)throw Error('Usage: reinsert-shield-edit.mjs <contract.json> <edited.png> <new-raw.png>');
const contract=JSON.parse(await readFile(path.resolve(root,process.argv[2]),'utf8')),rawPath=path.resolve(root,contract.raw),output=path.resolve(root,process.argv[4]);
if(output===rawPath||!output.startsWith(path.join(root,'docs/art/shield-pairs')+path.sep))throw Error('Write a new raw under shield-pairs; preserve the original');
const raw=await readFile(rawPath),edited=await readFile(path.resolve(root,process.argv[3]));
if(sha(raw)!==contract.rawSHA256)throw Error('Original raw changed after the edit guide was prepared');
const browser=await launchTestBrowser(process.env.BROWSER_BINARY,{disableSandbox:process.env.BROWSER_NO_SANDBOX==='1'});let page;
try{
 page=await browser.page();const result=await page.evaluate('('+async function({rawUrl,editedUrl,contract},extract){
  async function load(url){const image=new Image;image.src=url;await image.decode();return image}
  const raw=await load(rawUrl),edited=await load(editedUrl),canvas=document.createElement('canvas');canvas.width=raw.width;canvas.height=raw.height;const ctx=canvas.getContext('2d');ctx.drawImage(raw,0,0);const original=ctx.getImageData(0,0,raw.width,raw.height),out=new Uint8ClampedArray(original.data),allowed=new Uint8Array(raw.width*raw.height);
  const size=contract.guideSize||[contract.size,contract.size];
  if(!size.every(Number.isFinite)||Math.abs(edited.width/size[0]-edited.height/size[1])>.005)throw Error('Edited canvas changed aspect ratio; cannot restore it without distortion');
  const normalized=document.createElement('canvas');normalized.width=size[0];normalized.height=size[1];const nc=normalized.getContext('2d');nc.imageSmoothingQuality='high';nc.drawImage(edited,0,0,...size);const normalizedPixels=nc.getImageData(0,0,...size).data;
  const mappings=[];
  if(contract.schema==='lineage-shield-direction-edit-v1'){
   const source=extract(original.data,raw.width,raw.height,contract.rows,contract.columns),replacement=extract(normalizedPixels,...size,contract.guideRows||Math.ceil(contract.frames.length/2),contract.guideColumns||2);
   if(replacement.frames.length!==contract.frames.length)throw Error('Edited frame count changed');
   for(const [i,frame] of contract.frames.entries()){
    const part=replacement.frames[i],[px,py,pw,ph]=part.crop,mask=document.createElement('canvas');mask.width=pw;mask.height=ph;const mc=mask.getContext('2d'),id=mc.createImageData(pw,ph);
    for(let y=Math.max(0,py);y<Math.min(size[1],py+ph);y++)for(let x=Math.max(0,px);x<Math.min(size[0],px+pw);x++){
     const at=y*size[0]+x;if(replacement.labels[at]===i)id.data.set(normalizedPixels.subarray(at*4,at*4+4),((y-py)*pw+x-px)*4);
    }
    mc.putImageData(id,0,0);const layer=document.createElement('canvas');layer.width=raw.width;layer.height=raw.height;const lc=layer.getContext('2d');lc.imageSmoothingQuality='high';
    const dx=frame.sourceCrop[0]+(px-frame.guideRect[0]-frame.translation[0])/frame.scale,dy=frame.sourceCrop[1]+(py-frame.guideRect[1]-frame.translation[1])/frame.scale;lc.drawImage(mask,dx,dy,pw/frame.scale,ph/frame.scale);
    const pixels=lc.getImageData(0,0,raw.width,raw.height).data;
    for(let at=0;at<allowed.length;at++){
     if(pixels[at*4+3]&&source.labels[at]!==frame.bodyIndex)throw Error('Edited '+frame.direction+':'+frame.column+' leaves its original frame region');
     if(source.labels[at]===frame.bodyIndex){allowed[at]=1;out.set(pixels.subarray(at*4,at*4+4),at*4)}
    }
    mappings.push({direction:frame.direction,column:frame.column,scale:1/frame.scale,translation:[dx,dy],sourceCrop:frame.sourceCrop,guideRect:frame.guideRect});
   }
  }else{
   const [x,y,w,h]=contract.sourceCrop,px=contract.padX,py=contract.padY;
   if(![x,y,w,h,px,py,contract.size].every(Number.isFinite))throw Error('Invalid single-frame edit contract');
   const margin=Math.ceil(Math.max(px,py,size[0]-px-w,size[1]-py-h))+2,inverse=document.createElement('canvas');inverse.width=w+margin*2;inverse.height=h+margin*2;const ic=inverse.getContext('2d');ic.imageSmoothingQuality='high';ic.drawImage(normalized,margin-px,margin-py);const inversePixels=ic.getImageData(0,0,inverse.width,inverse.height).data;
   let outside=0;for(let yy=0;yy<inverse.height;yy++)for(let xx=0;xx<inverse.width;xx++)if(inversePixels[(yy*inverse.width+xx)*4+3]&&(xx<margin||xx>=margin+w||yy<margin||yy>=margin+h))outside++;
   if(outside)throw Error('Edited frame has '+outside+' nonzero-alpha pixels outside its original crop');
   const cropPixels=ic.getImageData(margin,margin,w,h).data;
   for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++){const at=(y+yy)*raw.width+x+xx,sourceAt=yy*w+xx;allowed[at]=1;out.set(cropPixels.subarray(sourceAt*4,sourceAt*4+4),at*4)}
   mappings.push({sourceCrop:contract.sourceCrop,padding:[px,py],normalizedSize:size});
  }
  let outsideChangedPixels=0,changedPixels=0;
  for(let at=0;at<allowed.length;at++){let changed=false;for(let c=0;c<4;c++)if(out[at*4+c]!==original.data[at*4+c])changed=true;if(changed){changedPixels++;if(!allowed[at])outsideChangedPixels++}}
  if(outsideChangedPixels)throw Error('An unselected raw pixel changed');
  ctx.putImageData(new ImageData(out,raw.width,raw.height),0,0);
  return{png:canvas.toDataURL('image/png').split(',')[1],rawSize:[raw.width,raw.height],editedSize:[edited.width,edited.height],normalizedSize:size,outsideChangedPixels,changedPixels,mappings};
 }.toString()+')('+JSON.stringify({rawUrl:'data:image/png;base64,'+raw.toString('base64'),editedUrl:'data:image/png;base64,'+edited.toString('base64'),contract})+',('+shieldComponents.toString()+'))');
 const bytes=Buffer.from(result.png,'base64');delete result.png;await writeFile(output,bytes);
 await writeFile(output.replace(/\.png$/i,'')+'.reinsert.json',JSON.stringify({schema:'lineage-shield-reinsert-v1',status:'pending-semantic-and-geometry-review',raw:{file:contract.raw,sha256:sha(raw)},edit:{file:process.argv[3],sha256:sha(edited)},contract:process.argv[2],output:{file:path.relative(root,output).replaceAll('\\','/'),sha256:sha(bytes)},method:'Restore the full edited guide canvas at a single proportional scale, then apply each recorded inverse transform. No body bounding-box fitting. Unselected source pixels remain identical in the decoded RGBA buffer.',...result},null,2)+'\n');console.log(JSON.stringify({file:path.relative(root,output).replaceAll('\\','/'),outsideChangedPixels:result.outsideChangedPixels,changedPixels:result.changedPixels,mappings:result.mappings.length}));
}finally{page?.close();await browser.close();}
