import {readFile,writeFile} from 'node:fs/promises';
import {launchTestBrowser} from '../../../../tests/helpers/browser.mjs';
const root=new URL('./',import.meta.url),jobs=[{file:'../inputs/elf-sword/idle.png',columns:6,rows:8},{file:'full-idle/raw-sheet.png',columns:6,rows:8}];for(const job of jobs)job.data='data:image/png;base64,'+(await readFile(new URL(job.file,root))).toString('base64');
const browser=await launchTestBrowser(process.env.BROWSER_BINARY,{disableSandbox:process.env.BROWSER_NO_SANDBOX==='1'});let page;try{page=await browser.page();const results=await page.evaluate('('+(async function(jobs){
  const results=[];
  for(const job of jobs){
   const image=new Image;image.src=job.data;await image.decode();const width=image.width,height=image.height;
   const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);
   const rgba=ctx.getImageData(0,0,width,height).data,seen=new Uint8Array(width*height),components=[];
   for(let start=0;start<seen.length;start++){
    if(seen[start]||rgba[start*4+3]<16)continue;
    const queue=[start];seen[start]=1;let minX=width,minY=height,maxX=-1,maxY=-1;
    for(let cursor=0;cursor<queue.length;cursor++){
     const at=queue[cursor],x=at%width,y=Math.floor(at/width);minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
     for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
      const nx=x+dx,ny=y+dy,next=ny*width+nx;
      if(nx<0||ny<0||nx>=width||ny>=height||seen[next]||rgba[next*4+3]<16)continue;
      seen[next]=1;queue.push(next);
     }
    }
    components.push({bbox:[minX,minY,maxX-minX+1,maxY-minY+1],pixels:queue.length});
   }
   const bodies=components.filter(c=>c.pixels>=512).sort((a,b)=>(a.bbox[1]+a.bbox[3]/2)-(b.bbox[1]+b.bbox[3]/2));
   if(bodies.length!==job.columns*job.rows)throw Error(job.file+': found '+bodies.length+' large bodies');
   const rows=Array.from({length:job.rows},(_,row)=>bodies.slice(row*job.columns,(row+1)*job.columns).sort((a,b)=>a.bbox[0]-b.bbox[0]));
   const rowBounds=[0,...rows.slice(1).map((row,index)=>Math.floor((Math.max(...rows[index].map(c=>c.bbox[1]+c.bbox[3]))+Math.min(...row.map(c=>c.bbox[1])))/2)),height];
   const frames=[];
   for(let row=0;row<rows.length;row++){
    const columns=rows[row],bounds=[0,...columns.slice(1).map((body,index)=>Math.floor((columns[index].bbox[0]+columns[index].bbox[2]+body.bbox[0])/2)),width];
    for(let column=0;column<columns.length;column++){
     let left=width,top=height,right=-1,bottom=-1,edge=0;
     for(let y=rowBounds[row];y<rowBounds[row+1];y++)for(let x=bounds[column];x<bounds[column+1];x++)if(rgba[(y*width+x)*4+3]>=16){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);if(x===bounds[column]||x===bounds[column+1]-1||y===rowBounds[row]||y===rowBounds[row+1]-1)edge++;}
     frames.push({row,column,mainBBox:columns[column].bbox,bbox:[left,top,right-left+1,bottom-top+1],crop:[bounds[column],rowBounds[row],bounds[column+1]-bounds[column],rowBounds[row+1]-rowBounds[row]],edgePixels:edge});
    }
   }
   const heights=frames.map(f=>f.bbox[3]),mean=heights.reduce((a,b)=>a+b)/heights.length,cv=Math.sqrt(heights.reduce((n,v)=>n+(v-mean)**2,0)/heights.length)/mean;
   results.push({file:job.file,width,height,bodyCount:bodies.length,componentCounts:{over50:components.filter(c=>c.pixels>=50).length,over128:components.filter(c=>c.pixels>=128).length,over512:bodies.length},heightStats:{mean,cv,min:Math.min(...heights),max:Math.max(...heights)},edgeFrames:frames.filter(f=>f.edgePixels).length,frames});
  }
  return results;
 }).toString()+')('+JSON.stringify(jobs)+')');const report={method:'Reuse review-shield-components: alpha>=16, 8-connected complete bodies >=512; Y rows/X columns; transparent-seam midpoint crops; no creative drawing',results,uniformScaleCandidate:results[0].heightStats.mean/results[1].heightStats.mean};await writeFile(new URL('full-idle/component-review.json',root),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({...report,results:results.map(({frames,...rest})=>rest)}));}finally{page?.close();await browser.close();}
