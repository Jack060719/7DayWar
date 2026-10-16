import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {launchTestBrowser} from './browser.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url)),family=process.argv[2];
if(!/^(knight|elf|mage)-[a-z_]+$/.test(family||''))throw Error('Expected a character-family reference');
const folder=path.join(root,'docs/art/shield-pairs/inputs',family),output=path.join(folder,'spaced');
await mkdir(output,{recursive:true});
const browser=await launchTestBrowser(process.env.BROWSER_BINARY,{disableSandbox:process.env.BROWSER_NO_SANDBOX==='1'});let page;
try{
 page=await browser.page();
 for(const action of ['idle','walk','attack','hit','death','cast']){
  const bytes=await readFile(path.join(folder,action+'.png')),reference=JSON.parse(await readFile(path.join(folder,action+'.json'),'utf8'));
  const result=await page.evaluate('('+async function(url,columns){
   const im=new Image;im.src=url;await im.decode();if(im.width!==columns*192||im.height!==1536)throw Error('Expected original 192-cell reference');
   const source=document.createElement('canvas');source.width=im.width;source.height=im.height;const sc=source.getContext('2d');sc.drawImage(im,0,0);
   const canvas=document.createElement('canvas');canvas.width=columns*288;canvas.height=8*288;const ctx=canvas.getContext('2d');
   for(let row=0;row<8;row++)for(let column=0;column<columns;column++)ctx.putImageData(sc.getImageData(column*192,row*192,192,192),column*288+48,row*288+48);
   return canvas.toDataURL('image/png').split(',')[1];
  }.toString()+')('+JSON.stringify('data:image/png;base64,'+bytes.toString('base64'))+','+reference.columns+')');
  const png=Buffer.from(result,'base64');await writeFile(path.join(output,action+'.png'),png);
  await writeFile(path.join(output,action+'.json'),JSON.stringify({purpose:'Sparse original geometry guide; not generated artwork or acceptance',source:family+'/'+action+'.png',sourceSHA256:createHash('sha256').update(bytes).digest('hex'),cell:[288,288],sourceCell:[192,192],translation:[48,48],scale:1,columns:reference.columns,rows:8,outputSHA256:createHash('sha256').update(png).digest('hex')},null,2)+'\n');
 }
 console.log(JSON.stringify({family,actions:6,scale:1,cell:[288,288]}));
}finally{page?.close();await browser.close();}
