import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {launchTestBrowser} from './browser.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url)),[input,output,columnsText,rowsText]=process.argv.slice(2),columns=Number(columnsText),rows=Number(rowsText);
if(!input||!output||!Number.isInteger(columns)||!Number.isInteger(rows)||columns<1||rows<1)throw Error('Usage: pad-shield-sheet.mjs input.png output.png columns rows');
const source=path.resolve(root,input),target=path.resolve(root,output),artRoot=path.join(root,'docs/art/shield-pairs');
if(source===target||![source,target].every(file=>file.startsWith(artRoot+path.sep)))throw Error('Keep originals and outputs in the shield-pairs art folder');
const bytes=await readFile(source),sha=value=>createHash('sha256').update(value).digest('hex');
const browser=await launchTestBrowser(process.env.BROWSER_BINARY,{disableSandbox:process.env.BROWSER_NO_SANDBOX==='1'});let page;
try{
 page=await browser.page();const result=await page.evaluate('('+async function({url,columns,rows}){
  const image=new Image;image.src=url;await image.decode();
  const original=document.createElement('canvas');original.width=image.width;original.height=image.height;const originalCtx=original.getContext('2d');originalCtx.drawImage(image,0,0);
  const originalPixels=originalCtx.getImageData(0,0,image.width,image.height).data;
  const cell=Math.ceil(Math.max(image.width/columns,image.height/rows)),width=cell*columns,height=cell*rows,offset=[Math.floor((width-image.width)/2),Math.floor((height-image.height)/2)];
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d');ctx.drawImage(original,...offset);
  const retained=ctx.getImageData(offset[0],offset[1],image.width,image.height).data;let changedChannels=0;
  for(let i=0;i<retained.length;i++)if(retained[i]!==originalPixels[i])changedChannels++;
  if(changedChannels)throw Error('Padding changed source RGBA channels');
  return{originalSize:[image.width,image.height],outputSize:[width,height],offset,cell,changedChannels,png:canvas.toDataURL('image/png').split(',')[1]};
 }.toString()+')('+JSON.stringify({url:'data:image/png;base64,'+bytes.toString('base64'),columns,rows})+')');
 const padded=Buffer.from(result.png,'base64');delete result.png;await writeFile(target,padded);
 const report={schema:'lineage-shield-transparent-padding-v1',source:{file:input,sha256:sha(bytes)},output:{file:output,sha256:sha(padded)},columns,rows,...result,method:'Only add transparent canvas padding, with integer translation. No image resampling, stretching, body fitting, or creative pixel edits. Every decoded original RGBA channel is checked unchanged.'};
 await writeFile(target.replace(/\.png$/,'.padding.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{page?.close();await browser.close();}
