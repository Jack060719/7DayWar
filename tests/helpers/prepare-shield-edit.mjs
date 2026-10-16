import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {launchTestBrowser} from './browser.mjs';
import {shieldComponents} from './shield-components.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url)),dir=path.resolve(root,process.argv[2]),direction=process.argv[3],rawJob=process.argv.includes('--raw-job'),padding=Number(process.argv.find(value=>value.startsWith('--padding='))?.split('=')[1]||0),frameArgument=process.argv.slice(4).find(value=>!value.startsWith('--')),selectedColumn=frameArgument===undefined?null:Number(frameArgument);
if(![0,64,128].includes(padding))throw Error('Guide padding must be 0, 64 or 128, with the same raw scale');
if(!rawJob&&!dir.startsWith(path.join(root,'docs/art/shield-pairs/processed')+path.sep))throw Error('Expected a staged action directory');
const job=rawJob?JSON.parse(await readFile(dir,'utf8')):null;
const qa=rawJob?{raw:{file:job.raw},source:{file:job.reference}}:JSON.parse(await readFile(path.join(dir,'qa.json'),'utf8')),reference=JSON.parse(await readFile(path.resolve(root,qa.source.file),'utf8'));
if(!reference.directions.includes(direction)&&!(direction==='all'&&selectedColumn!==null))throw Error('Choose one source direction, or all with a frame index');
if(selectedColumn!==null&&(!Number.isInteger(selectedColumn)||selectedColumn<0||selectedColumn>=reference.columns))throw Error('Frame index must be zero-based and in range');
const raw=await readFile(path.resolve(root,qa.raw.file)),input=qa.cleanup?await readFile(path.join(dir,'cleaned-raw.png')):raw;
if(rawJob){if(raw.toString('hex',0,8)!=='89504e470d0a1a0a')throw Error('Raw repair input must be PNG');qa.rawCell=[raw.readUInt32BE(16)/reference.columns,raw.readUInt32BE(20)/8]}
const scale=384/qa.rawCell[0];
const browser=await launchTestBrowser(process.env.BROWSER_BINARY,{disableSandbox:process.env.BROWSER_NO_SANDBOX==='1'});let page;
try{
 page=await browser.page();const result=await page.evaluate('('+async function({url,reference,direction,scale,selectedColumn,padding},extract){
  const image=new Image;image.src=url;await image.decode();const original=document.createElement('canvas');original.width=image.width;original.height=image.height;const oc=original.getContext('2d');oc.drawImage(image,0,0);const data=oc.getImageData(0,0,image.width,image.height).data,geometry=extract(data,image.width,image.height,8,reference.columns);
  const multi=selectedColumn===null||direction==='all',cellSize=384+padding*2,canvas=document.createElement('canvas');canvas.width=(multi?2:1)*cellSize;canvas.height=(multi?Math.ceil((direction==='all'?8:reference.columns)/2):1)*cellSize;const ctx=canvas.getContext('2d'),frames=[];
  for(const [index,frame] of geometry.frames.entries()){
   if((direction!=='all'&&reference.directions[frame.row]!==direction)||(selectedColumn!==null&&frame.column!==selectedColumn))continue;
   const [x,y,w,h]=frame.crop,cell=document.createElement('canvas');cell.width=w;cell.height=h;const cc=cell.getContext('2d'),id=cc.createImageData(w,h);
   for(let py=Math.max(0,y);py<Math.min(image.height,y+h);py++)for(let px=Math.max(0,x);px<Math.min(image.width,x+w);px++){
    const at=py*image.width+px;if(geometry.labels[at]===index)id.data.set(data.subarray(at*4,at*4+4),((py-y)*w+px-x)*4);
   }
   cc.putImageData(id,0,0);const [bx,by,bw,bh]=frame.bbox;let sum=0,weight=0;
   for(let py=by+bh-Math.max(4,Math.ceil(bh*.075));py<by+bh;py++)for(let px=bx;px<bx+bw;px++){const at=py*image.width+px,alpha=data[at*4+3];if(alpha>=16&&geometry.labels[at]===index){sum+=px*alpha;weight+=alpha}}
   const rawFoot=[sum/weight,by+bh-1],translation=[192+padding-(rawFoot[0]-x)*scale,300+padding-(rawFoot[1]-y)*scale],target=document.createElement('canvas');target.width=target.height=cellSize;const tc=target.getContext('2d');tc.imageSmoothingQuality='high';tc.drawImage(cell,...translation,w*scale,h*scale);
   const pixels=tc.getImageData(0,0,cellSize,cellSize).data;let edgePixels=0;for(let py=0;py<cellSize;py++)for(let px=0;px<cellSize;px++)if(pixels[(py*cellSize+px)*4+3]&&(px===0||py===0||px===cellSize-1||py===cellSize-1))edgePixels++;
   if(edgePixels)throw Error(direction+' '+frame.column+' guide reaches an edge; preserve the body and repair background before export');
   const guideRect=multi?[(frames.length%2)*cellSize,Math.floor(frames.length/2)*cellSize,cellSize,cellSize]:[0,0,cellSize,cellSize];ctx.drawImage(target,guideRect[0],guideRect[1]);frames.push({direction:reference.directions[frame.row],column:frame.column,bodyIndex:index,sourceCrop:frame.crop,rawFoot,guideRect,translation,scale,edgePixels});
  }
  return{width:canvas.width,height:canvas.height,frames,png:canvas.toDataURL('image/png').split(',')[1]};
 }.toString()+')('+JSON.stringify({url:'data:image/png;base64,'+input.toString('base64'),reference,direction,scale,selectedColumn,padding})+',('+shieldComponents.toString()+'))');
 const stem=path.join(root,'docs/art/shield-pairs/inputs',reference.class+'-'+reference.family,reference.action+'-'+direction+(selectedColumn===null?'':'-frame-'+(selectedColumn+1))+'-correction'),bytes=Buffer.from(result.png,'base64');await writeFile(stem+'.png',bytes);
 const contract={schema:'lineage-shield-direction-edit-v1',raw:qa.raw.file,rawSHA256:createHash('sha256').update(raw).digest('hex'),guideInput:qa.cleanup?path.relative(root,path.join(dir,'cleaned-raw.png')).replaceAll('\\','/'):qa.raw.file,guideInputSHA256:createHash('sha256').update(input).digest('hex'),sourceQA:path.relative(root,path.join(dir,'qa.json')).replaceAll('\\','/'),columns:reference.columns,rows:8,direction,guideSize:[result.width,result.height],guideCell:[384,384],rawCell:qa.rawCell,rawToGuideScale:scale,frames:result.frames,method:'Complete body masks use one raw-cell-derived scale. Translation aligns the guide only; its exact inverse maps the edited pixels back to the original raw positions. No body bbox fitting. Image edits must preserve the guide canvas aspect ratio.',outputSHA256:createHash('sha256').update(bytes).digest('hex')};
 if(rawJob){contract.sourceQA=null;contract.sourceJob=path.relative(root,dir).replaceAll('\\','/');contract.purpose='Repair guide for unaccepted raw; no geometry or semantic acceptance is implied'}
 contract.guideCell=[384+padding*2,384+padding*2];contract.padding=padding;contract.guideFoot=[192+padding,300+padding];contract.guideColumns=selectedColumn===null||direction==='all'?2:1;contract.guideRows=direction==='all'?4:selectedColumn===null?Math.ceil(reference.columns/2):1;
 await writeFile(stem+'.json',JSON.stringify(contract,null,2)+'\n');console.log(JSON.stringify({file:path.relative(root,stem+'.png').replaceAll('\\','/'),frames:result.frames.length,scale,size:[result.width,result.height]}));
}finally{page?.close();await browser.close();}
