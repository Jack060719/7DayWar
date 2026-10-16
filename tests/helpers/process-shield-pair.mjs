import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {launchTestBrowser} from './browser.mjs';
import {shieldComponents} from './shield-components.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url)),sha=bytes=>createHash('sha256').update(bytes).digest('hex');
if(!process.argv[2])throw Error('Usage: process-shield-pair.mjs <job.json>');
const job=JSON.parse(await readFile(path.resolve(root,process.argv[2]),'utf8'));
const referenceBytes=await readFile(path.resolve(root,job.reference)),reference=JSON.parse(referenceBytes);
if(!['with-shield','without-shield'].includes(job.variant))throw Error('Choose a shield variant');
const output=path.resolve(root,job.outputDir),staging=path.join(root,'docs/art/shield-pairs/processed');
if(!output.startsWith(staging+path.sep))throw Error('Output must stay in docs/art/shield-pairs/processed');
const profilePath=path.resolve(root,job.profile),profileInside=profilePath.startsWith(path.join(root,'docs/art/shield-pairs')+path.sep);
if(!profileInside)throw Error('Profile must stay in the shield-pairs art folder');
let profile;try{profile=JSON.parse(await readFile(profilePath,'utf8'))}catch(error){if(error.code!=='ENOENT')throw error}
if(job.createProfile&&(profile||reference.action!=='idle'))throw Error('Only a new complete idle profile may be created');
if(!profile&&!job.createProfile)throw Error('A fixed idle profile is required');
if(profile&&(profile.schema!=='lineage-shield-geometry-profile-v1'||profile.character!==reference.class+'-'+reference.family||profile.variant!==job.variant))throw Error('Profile does not match this character and variant');
if(reference.directions?.join(',')!=='S,SW,W,NW,N,NE,E,SE'||reference.cell?.join(',')!=='192,192')throw Error('Expected the complete eight-direction 192-cell reference');
const sourceFile=path.join(path.dirname(path.resolve(root,job.reference)),reference.output.file),rawFile=path.resolve(root,job.raw);
const sourceBytes=await readFile(sourceFile),rawBytes=await readFile(rawFile),sources=[sourceBytes,rawBytes].map(bytes=>'data:image/png;base64,'+bytes.toString('base64'));

async function processImages({sources,reference,profile,cleanupDetachedAlpha1,cleanupDistantAlpha1,componentExtraction,identityAlpha,registrationPoints,registrationMode,packingTranslations},extractComponents){
 if(registrationMode&&(!['attack','death'].includes(reference.action)||registrationMode!=='silhouette-center'))throw Error('Silhouette registration is limited to attack/death');
 const images=await Promise.all(sources.map(async source=>{const image=new Image;image.src=source;await image.decode();return image}));
 const pixels=images.map(image=>{const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);return ctx.getImageData(0,0,image.width,image.height).data});
 const cleanup=[];let cleanedRaw,backgroundBranches;
 if(cleanupDetachedAlpha1){
  const width=images[1].width,height=images[1].height,data=pixels[1],seen=new Uint8Array(width*height),removed=[],preserved=[];
  for(let start=0;start<seen.length;start++){
   if(seen[start]||!data[start*4+3])continue;
   const queue=[start];seen[start]=1;let maxAlpha=0,left=width,top=height,right=-1,bottom=-1;
   for(let cursor=0;cursor<queue.length;cursor++){
    const at=queue[cursor],x=at%width,y=Math.floor(at/width);maxAlpha=Math.max(maxAlpha,data[at*4+3]);left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
     const nx=x+dx,ny=y+dy,next=ny*width+nx;if(nx<0||ny<0||nx>=width||ny>=height||seen[next]||!data[next*4+3])continue;seen[next]=1;queue.push(next);
    }
   }
   if(maxAlpha===1)removed.push({pixels:queue,bbox:[left,top,right-left+1,bottom-top+1]});else for(const at of queue)preserved.push(at);
  }
  const distance=new Uint16Array(width*height);distance.fill(65535);const queue=new Int32Array(width*height);let head=0,tail=0;
  for(const at of preserved){distance[at]=0;queue[tail++]=at}
  while(head<tail){
   const at=queue[head++],x=at%width,y=Math.floor(at/width),nextDistance=distance[at]+1;
   for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
    const nx=x+dx,ny=y+dy,next=ny*width+nx;if(nx<0||ny<0||nx>=width||ny>=height||distance[next]<=nextDistance)continue;distance[next]=nextDistance;queue[tail++]=next;
   }
  }
  for(const component of removed){let minimumDistance=65535;for(const at of component.pixels){minimumDistance=Math.min(minimumDistance,distance[at]);data[at*4+3]=0}cleanup.push({bbox:component.bbox,pixels:component.pixels.length,alphaRange:[1,1],minimumChebyshevDistanceToPreservedComponent:minimumDistance})}
  if(cleanupDistantAlpha1){
   distance.fill(65535);head=tail=0;for(let at=0;at<data.length/4;at++)if(data[at*4+3]>=2){distance[at]=0;queue[tail++]=at}
   while(head<tail){
    const at=queue[head++],x=at%width,y=Math.floor(at/width),nextDistance=distance[at]+1;
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
     const nx=x+dx,ny=y+dy,next=ny*width+nx;if(nx<0||ny<0||nx>=width||ny>=height||distance[next]<=nextDistance)continue;distance[next]=nextDistance;queue[tail++]=next;
    }
   }
   const coordinates=[];for(let at=0;at<data.length/4;at++)if(data[at*4+3]===1&&distance[at]>=3){coordinates.push([at%width,Math.floor(at/width)]);data[at*4+3]=0}
   backgroundBranches={reason:'Reviewed alpha-1 background branches reach frame boundaries. Preserve all alpha>=2 pixels and every alpha-1 pixel within two Chebyshev pixels of them; remove only alpha-1 background at distance at least three.',alphaRange:[1,1],minimumDistanceFromAlpha2:3,pixels:coordinates.length,coordinates};
  }
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;canvas.getContext('2d').putImageData(new ImageData(data,width,height),0,0);images[1]=canvas;cleanedRaw=canvas.toDataURL('image/png').split(',')[1];
 }
 const columns=reference.columns,rows=8,rawCell=[images[1].width/columns,images[1].height/rows];
 if(Math.abs(rawCell[0]/rawCell[1]-1)>.005)throw Error('Raw grid cells are not square; preserve-scale processing cannot distort them');
 function analyze(which){
  const width=images[which].width,height=images[which].height,data=pixels[which],seen=new Uint8Array(width*height),components=[];
  for(let start=0;start<seen.length;start++){
   if(seen[start]||data[start*4+3]<16)continue;
   const queue=[start];seen[start]=1;let left=width,top=height,right=-1,bottom=-1;
   for(let cursor=0;cursor<queue.length;cursor++){
    const at=queue[cursor],x=at%width,y=Math.floor(at/width);left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
     const nx=x+dx,ny=y+dy,next=ny*width+nx;
     if(nx<0||ny<0||nx>=width||ny>=height||seen[next]||data[next*4+3]<16)continue;
     seen[next]=1;queue.push(next);
    }
   }
   if(queue.length>=512)components.push({bbox:[left,top,right-left+1,bottom-top+1],pixels:queue.length});
  }
  if(components.length!==rows*columns)throw Error('Expected '+rows*columns+' separate whole bodies, found '+components.length);
  components.sort((a,b)=>(a.bbox[1]+a.bbox[3]/2)-(b.bbox[1]+b.bbox[3]/2));
  const grouped=Array.from({length:rows},(_,row)=>components.slice(row*columns,(row+1)*columns).sort((a,b)=>a.bbox[0]-b.bbox[0]));
  const yBounds=[0,...grouped.slice(1).map((row,index)=>Math.floor((Math.max(...grouped[index].map(c=>c.bbox[1]+c.bbox[3]))+Math.min(...row.map(c=>c.bbox[1])))/2)),height],frames=[];
  for(let row=0;row<rows;row++){
   const xBounds=[0,...grouped[row].slice(1).map((body,index)=>Math.floor((grouped[row][index].bbox[0]+grouped[row][index].bbox[2]+body.bbox[0])/2)),width];
   for(let column=0;column<columns;column++){
    let left=width,top=height,right=-1,bottom=-1,edge=0;
    for(let y=yBounds[row];y<yBounds[row+1];y++)for(let x=xBounds[column];x<xBounds[column+1];x++)if(data[(y*width+x)*4+3]>=16){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);if(x===xBounds[column]||x===xBounds[column+1]-1||y===yBounds[row]||y===yBounds[row+1]-1)edge++;}
    frames.push({row,column,bbox:[left,top,right-left+1,bottom-top+1],crop:[xBounds[column],yBounds[row],xBounds[column+1]-xBounds[column],yBounds[row+1]-yBounds[row]],edgePixels:edge});
   }
  }
  const heights=frames.map(frame=>frame.bbox[3]),mean=heights.reduce((a,b)=>a+b)/heights.length;
  return{frames,height:{mean,min:Math.min(...heights),max:Math.max(...heights),cv:Math.sqrt(heights.reduce((n,v)=>n+(v-mean)**2,0)/heights.length)/mean}};
 }
 const extraction=componentExtraction?extractComponents(pixels[1],images[1].width,images[1].height,rows,columns,identityAlpha):null;
 const analyses=[analyze(0),extraction||analyze(1)];
 const rawMasks=extraction?extraction.frames.map((frame,index)=>{
  const [x,y,width,height]=frame.crop,canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d'),data=ctx.createImageData(width,height);
  for(let py=Math.max(0,y);py<Math.min(images[1].height,y+height);py++)for(let px=Math.max(0,x);px<Math.min(images[1].width,x+width);px++){
   const at=py*images[1].width+px;if(extraction.labels[at]===index)data.data.set(pixels[1].subarray(at*4,at*4+4),((py-y)*width+px-x)*4);
  }
  ctx.putImageData(data,0,0);return canvas;
 }):null;
 if(analyses.some(result=>result.frames.some(frame=>frame.edgePixels)))throw Error('A raw body touches its extraction boundary');
 // Silhouette height includes the weapon: preserve variation already present in the reference directions.
 if(!profile&&analyses[1].height.cv>Math.max(.08,analyses[0].height.cv))throw Error('Idle silhouette-height variation exceeds reference: '+JSON.stringify({source:analyses[0].height,raw:analyses[1].height}));
 const scale=profile?profile.uniformReferenceScale*profile.rawReferenceCell[0]/rawCell[0]:analyses[0].height.mean/analyses[1].height.mean;
 if(!Number.isFinite(scale)||scale<=0)throw Error('Invalid fixed profile scale');
 if(profile&&Math.abs(profile.rawReferenceCell[0]/rawCell[0]-profile.rawReferenceCell[1]/rawCell[1])>.005)throw Error('Raw profile cell ratios differ');
 function feet(which,bbox,index){
  const [x,y,w,h]=bbox,width=images[which].width,data=pixels[which];let sum=0,weight=0;
  for(let py=y+h-Math.max(4,Math.ceil(h*.075));py<y+h;py++)for(let px=x;px<x+w;px++){const at=py*width+px,alpha=data[at*4+3];if(alpha>=16&&(!which||!extraction||extraction.labels[at]===index)){sum+=px*alpha;weight+=alpha}}
  return{x:sum/weight,y:y+h-1};
 }
 const sheet=document.createElement('canvas');sheet.width=columns*192;sheet.height=rows*192;const sheetCtx=sheet.getContext('2d');
 const preview=document.createElement('canvas');preview.width=1536;preview.height=768;const previewCtx=preview.getContext('2d');previewCtx.fillStyle='#718478';previewCtx.fillRect(0,0,1536,768);
 const frames=[],clips=[];
 for(let row=0;row<rows;row++){
  const strip=document.createElement('canvas');strip.width=columns*192;strip.height=192;const stripCtx=strip.getContext('2d');
  for(let column=0;column<columns;column++){
   const index=row*columns+column,source=analyses[0].frames[index],raw=analyses[1].frames[index],originalFeet=feet(0,source.bbox),generatedFeet=feet(1,raw.bbox,index),[cx,cy,cw,ch]=raw.crop;
   const registration=registrationPoints?.[reference.directions[row]+':'+column]||(registrationMode==='silhouette-center'?{source:[source.bbox[0]+(source.bbox[2]-1)/2-column*192,source.bbox[1]+(source.bbox[3]-1)/2-row*192],raw:[raw.bbox[0]+(raw.bbox[2]-1)/2,raw.bbox[1]+(raw.bbox[3]-1)/2],reason:'Align source/generated alpha>=16 silhouette centers by translation only; the fixed bundle scale is unchanged. This is silhouette registration, not a measured foot landmark.'}:null);
   if(registration){
    if(!registration.reason?.trim()||!Array.isArray(registration.source)||!Array.isArray(registration.raw)||registration.source.length!==2||registration.raw.length!==2||![...registration.source,...registration.raw].every(Number.isFinite)||registration.source.some(n=>n<0||n>=192)||registration.raw[0]<0||registration.raw[0]>=images[1].width||registration.raw[1]<0||registration.raw[1]>=images[1].height)throw Error('A contact-point override requires valid source-cell/raw-absolute coordinates and its reviewed reason');
    originalFeet.x=registration.source[0]+column*192;originalFeet.y=registration.source[1]+row*192;generatedFeet.x=registration.raw[0];generatedFeet.y=registration.raw[1];
   }
   const packing=packingTranslations?.[reference.directions[row]+':'+column]||[0,0];
   if(packing.length!==2||!packing.every(Number.isSafeInteger))throw Error('Packing translations must be two integer pixels');
   const target=[originalFeet.x-column*192,originalFeet.y-row*192],dx=target[0]-(generatedFeet.x-cx)*scale+packing[0],dy=target[1]-(generatedFeet.y-cy)*scale+packing[1];
   const cell=document.createElement('canvas');cell.width=cell.height=192;const ctx=cell.getContext('2d',{willReadFrequently:true});ctx.imageSmoothingQuality='high';ctx.drawImage(rawMasks?rawMasks[index]:images[1],rawMasks?0:cx,rawMasks?0:cy,cw,ch,dx,dy,cw*scale,ch*scale);
   const rendered=ctx.getImageData(0,0,192,192),data=rendered.data;let outputCleanup;
   if(cleanupDistantAlpha1){
    const coordinates=[];
    for(let y=0;y<192;y++)for(let x=0;x<192;x++){
     if(data[(y*192+x)*4+3]!==1)continue;let nearProtected=false;
     for(let yy=Math.max(0,y-2);yy<=Math.min(191,y+2)&&!nearProtected;yy++)for(let xx=Math.max(0,x-2);xx<=Math.min(191,x+2);xx++)if(data[(yy*192+xx)*4+3]>=2){nearProtected=true;break}
     if(!nearProtected)coordinates.push([x,y]);
    }
    if(coordinates.length){
     outputCleanup={reason:'Resampling can create new alpha-1 background pixels. Remove only alpha 1 at least three Chebyshev pixels from every alpha>=2 pixel; retain all protected pixels and their two-pixel antialiasing neighborhood.',alphaRange:[1,1],minimumDistanceFromAlpha2:3,pixels:coordinates.length,coordinates,beforePNG:cell.toDataURL('image/png').split(',')[1]};
     for(const [x,y]of coordinates)data[(y*192+x)*4+3]=0;ctx.putImageData(rendered,0,0);
    }
   }
   let left=192,top=192,right=-1,bottom=-1,edge=0,allAlphaEdge=0;
   for(let y=0;y<192;y++)for(let x=0;x<192;x++){const alpha=data[(y*192+x)*4+3];if(alpha>0&&(x===0||y===0||x===191||y===191))allAlphaEdge++;if(alpha<16)continue;left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);if(x===0||y===0||x===191||y===191)edge++;}
   const transformed=[dx+(raw.bbox[0]-cx)*scale,dy+(raw.bbox[1]-cy)*scale,raw.bbox[2]*scale,raw.bbox[3]*scale],clipped=transformed[0]<0||transformed[1]<0||transformed[0]+transformed[2]>192||transformed[1]+transformed[3]>192;
   let footX=0,footWeight=0;for(let y=bottom-Math.max(4,Math.ceil((bottom-top+1)*.075))+1;y<=bottom;y++)for(let x=left;x<=right;x++){const alpha=data[(y*192+x)*4+3];if(alpha>=16){footX+=x*alpha;footWeight+=alpha}}
   stripCtx.drawImage(cell,column*192,0);sheetCtx.drawImage(cell,column*192,row*192);
   if(column===0){const px=(row%4)*384,py=Math.floor(row/4)*384;previewCtx.drawImage(cell,px,py,384,384);previewCtx.fillStyle='#fff';previewCtx.font='bold 22px sans-serif';previewCtx.fillText(reference.directions[row],px+12,py+30)}
   frames.push({direction:reference.directions[row],column,sourceCrop:raw.crop,scale,translation:[dx,dy],sourceFeet:target,outputBBox:[left,top,right-left+1,bottom-top+1],footError:[footX/footWeight-target[0],bottom-target[1]],edgePixels:edge,allAlphaEdgePixels:allAlphaEdge,empty:right<0,clipped,semanticStatus:'pending',png:cell.toDataURL('image/png').split(',')[1]});
   if(packing[0]||packing[1])frames.at(-1).packingTranslation={offset:packing,reason:'Integer atlas packing only; the frame anchor moves by the same offset, preserving every world-space pixel position and the fixed scale.'};
   if(outputCleanup)frames.at(-1).outputCleanup=outputCleanup;
   if(registration)frames.at(-1).registrationOverride={sourceCell:registration.source,rawAbsolute:registration.raw,reason:registration.reason,footErrorNote:'For this reviewed override, footError still reports the automatic lower-silhouette diagnostic; it is not the selected anatomical landmark error.'};
  }
  const webp=strip.toDataURL('image/webp',1);if(!webp.startsWith('data:image/webp'))throw Error('Chromium did not encode WebP');
  clips.push({direction:reference.directions[row],png:strip.toDataURL('image/png').split(',')[1],webp:webp.split(',')[1]});
 }
 const extractionSummary=extraction?{method:'Body identity seeds use alpha>='+identityAlpha+'. All remaining nonzero-alpha pixels are assigned to the nearest body pixels by an 8-neighbor multi-source flood, with deterministic ties. Component masks retain every original pixel once; visible bounds and edge checks still use alpha>=16, and the final all-alpha edge gate is unchanged.',identityAlpha,nonzeroPixels:extraction.nonzeroPixels,assignedPixels:extraction.assignedPixels}:null;
 if(extraction)delete extraction.labels;
 return{scale,rawCell,analyses,frames,clips,cleanup,backgroundBranches,cleanedRaw,extraction:extractionSummary,sheet:sheet.toDataURL('image/png').split(',')[1],preview:preview.toDataURL('image/png').split(',')[1]};
}

const browser=await launchTestBrowser(process.env.BROWSER_BINARY,{disableSandbox:process.env.BROWSER_NO_SANDBOX==='1'});let page;
try{
 page=await browser.page();const result=await page.evaluate('('+processImages.toString()+')('+JSON.stringify({sources,reference,profile,cleanupDetachedAlpha1:job.cleanupDetachedAlpha1===true,cleanupDistantAlpha1:job.cleanupDistantAlpha1===true,componentExtraction:job.extraction==='components',identityAlpha:job.identityAlpha===32?32:16,registrationPoints:job.registrationPoints,registrationMode:job.registration,packingTranslations:job.packingTranslations})+',('+shieldComponents.toString()+'))');
 const actionDir=path.join(output,reference.action);await mkdir(path.join(actionDir,'frames'),{recursive:true});await mkdir(path.join(actionDir,'clips'),{recursive:true});
 for(const name of ['sheet','preview'])await writeFile(path.join(actionDir,name==='sheet'?'sheet-transparent.png':'eight-directions-gray-preview.png'),Buffer.from(result[name],'base64'));
 if(result.cleanedRaw)await writeFile(path.join(actionDir,'cleaned-raw.png'),Buffer.from(result.cleanedRaw,'base64'));
 for(const frame of result.frames){if(frame.outputCleanup){frame.outputCleanup.beforeSHA256=sha(Buffer.from(frame.outputCleanup.beforePNG,'base64'));frame.outputCleanup.afterSHA256=sha(Buffer.from(frame.png,'base64'));delete frame.outputCleanup.beforePNG}await writeFile(path.join(actionDir,'frames',frame.direction+'-'+frame.column+'.png'),Buffer.from(frame.png,'base64'));delete frame.png}
 for(const clip of result.clips){for(const extension of ['png','webp'])await writeFile(path.join(actionDir,'clips',reference.action+'-'+clip.direction+'.'+extension),Buffer.from(clip[extension],'base64'));}
 const directions=Object.fromEntries(reference.directions.map((direction,row)=>[direction,{[reference.action]:reference.frames[row].map((frame,column)=>({rect:[column*192,0,192,192],duration:frame.duration,anchor:(frame.anchor||reference.anchor).map((n,axis)=>n+(result.frames[row*reference.columns+column].packingTranslation?.offset[axis]||0)),atlas:'clips/'+reference.action+'-'+direction+'.webp'}))}]));
 const manifest={schema:'lineage-shield-staging-v1',consumerId:'CLASS-'+reference.class.toUpperCase()+':'+reference.family+':'+job.variant,cellWidth:192,cellHeight:192,baseHeight:reference.baseHeight,anchor:reference.anchor,status:'pending-semantic-and-native-qa',directions};
 await writeFile(path.join(actionDir,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 const failures=result.frames.filter(frame=>frame.empty||frame.clipped||frame.edgePixels||frame.allAlphaEdgePixels),drift=result.analyses[1].height.mean*result.scale/result.analyses[0].height.mean-1;
 const summary={schema:'lineage-shield-staging-qa-v1',status:'pending-semantic-and-native-qa',runtimeModified:false,source:{file:job.reference,sha256:sha(referenceBytes),imageSHA256:sha(sourceBytes)},raw:{file:job.raw,sha256:sha(rawBytes)},action:reference.action,variant:job.variant,profile:job.profile,scale:result.scale,rawCell:result.rawCell,method:'Whole-sheet 8-connected alpha components locate bodies; transparent-seam extraction retains all crop pixels. One profile scale for the entire sheet; only per-frame translation using the corresponding source lower-7.5% alpha-weighted foot centroid and bottom. No shield drawing, pixel erasure, or per-frame/action fitting.',heightDiagnostic:{source:result.analyses[0].height,raw:result.analyses[1].height,scaledToSourceDrift:drift,deathExempt:reference.action==='death',warning:reference.action!=='death'&&Math.abs(drift)>.08,note:'Alpha silhouette height includes weapons and pose changes; this is a review diagnostic, not a measured anatomical torso height.'},geometryFailures:failures.length,frames:result.frames};
 if(job.cleanupDetachedAlpha1)summary.cleanup={method:'Remove only entire 8-connected nonzero-alpha components whose every pixel has alpha exactly 1. Any component with alpha above 1 is preserved in full, including all connected antialiasing and weapon pixels. The strict all-alpha edge gate is unchanged.',components:result.cleanup,removedPixels:result.cleanup.reduce((n,c)=>n+c.pixels,0),cleanedRawSHA256:sha(Buffer.from(result.cleanedRaw,'base64'))};
 if(result.backgroundBranches)summary.cleanup.backgroundBranches=result.backgroundBranches;
 if(result.extraction){summary.extraction=result.extraction;summary.method=result.extraction.method+' One unchanged idle-profile scale; corresponding source feet determine translation only. Strict final edge and clipping gates remain unchanged.'}
 await writeFile(path.join(actionDir,'qa.json'),JSON.stringify(summary,null,2)+'\n');
 if(job.createProfile){profile={schema:'lineage-shield-geometry-profile-v1',character:reference.class+'-'+reference.family,variant:job.variant,status:'pending-semantic-and-native-qa',acceptedReference:null,rawReference:job.raw,rawReferenceSHA256:sha(rawBytes),rawReferenceCell:result.rawCell,nativeCell:[192,192],nativeAnchor:reference.anchor,baseHeight:reference.baseHeight,uniformReferenceScale:result.scale,perFrameScaleAllowed:false,maximumAnatomicalScaleDrift:.08,sourceMeanAlphaHeight:result.analyses[0].height.mean,generatedRawMeanAlphaHeight:result.analyses[1].height.mean,scaleForFutureRawCell:'uniformReferenceScale * rawReferenceCell[0] / rawCellWidth; height must have the same ratio',acceptedScope:'None; geometry staging is not semantic acceptance'};await mkdir(path.dirname(profilePath),{recursive:true});await writeFile(profilePath,JSON.stringify(profile,null,2)+'\n');}
 console.log(JSON.stringify({outputDir:path.relative(root,actionDir).replaceAll('\\','/'),frames:result.frames.length,scale:result.scale,geometryFailures:failures.length,scaleDiagnosticWarning:summary.heightDiagnostic.warning,status:summary.status}));if(failures.length)process.exitCode=1;
}finally{page?.close();await browser.close();}
