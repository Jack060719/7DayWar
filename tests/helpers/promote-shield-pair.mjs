import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=fileURLToPath(new URL('../../',import.meta.url)),job=JSON.parse(await readFile(path.resolve(root,process.argv[2]),'utf8'));
const actions=['idle','walk','attack','hit','death','cast'],directions=['S','SW','W','NW','N','NE','E','SE'];
if(!job.visualReview||actions.some(action=>!job.reviewedActions.includes(action)))throw Error('All six actions need an explicit visual review');
const artRoot=path.join(root,'dist/full/art'),destination=path.resolve(artRoot,job.output);
if(!destination.startsWith(path.join(artRoot,'shield-pairs')+path.sep))throw Error('Output must stay inside the paired artwork directory');
const sourceBytes=await readFile(path.resolve(artRoot,job.sourceManifest)),source=JSON.parse(sourceBytes),manifest={schema:source.schema,consumerId:job.consumerId,assetId:job.assetId,class:source.class,weaponFamily:source.weaponFamily,stance:source.stance,shieldVariant:job.variant,cellWidth:192,cellHeight:192,baseHeight:source.baseHeight,anchor:source.anchor,directions:Object.fromEntries(directions.map(d=>[d,{}])),contacts:job.contacts,emitters:job.emitters,status:'integration-candidate',frameCount:0,clipCount:0,runtimeLayout:'per-action-direction',maximumClipDecodedBytes:0};
const hash=bytes=>createHash('sha256').update(bytes).digest('hex'),sources=[],clips=[];
await mkdir(path.join(destination,'clips'),{recursive:true});
for(const action of actions){
 const actionDir=path.resolve(root,job.staging,action),qaBytes=await readFile(path.join(actionDir,'qa.json')),qa=JSON.parse(qaBytes),codec=job.deferNativeReview?null:JSON.parse(await readFile(path.join(actionDir,'codec-review.json'),'utf8')),staged=JSON.parse(await readFile(path.join(actionDir,'manifest.json'),'utf8'));
 if(qa.frames.some(f=>f.empty||f.clipped||f.allAlphaEdgePixels))throw Error(action+' geometry gate failed');
 if(codec&&(codec.clips.length!==8||codec.clips.some(c=>c.alphaMismatches||c.edgePixels)||!codec.durationsPreserved))throw Error(action+' codec gate failed');
 const generations=qa.raw?.file?{single:qa.raw}:Object.fromEntries(Object.entries(qa.sourceGenerations||{}).map(([key,value])=>[key,value.raw||value]));
 if(!Object.keys(generations).length)throw Error(action+' has no traceable raw source');
 for(const raw of Object.values(generations))if(hash(await readFile(path.resolve(root,raw.file)))!==raw.sha256)throw Error(action+' raw changed after processing');
 if(!qa.raw?.file&&qa.frames.some(frame=>!generations[frame.sourceGeneration]))throw Error(action+' composite frame has no source generation');
 if(codec?.cleanupReview&&(codec.cleanupReview.changedProtectedPixels||codec.cleanupReview.unexpectedAlphaChanges||codec.cleanupReview.removedAlpha1!==codec.cleanupReview.expectedRemoved))throw Error(action+' cleanup verification failed');
 const provenance={action,raw:qa.raw,qa:{file:path.relative(root,path.join(actionDir,'qa.json')).replaceAll('\\','/'),sha256:hash(qaBytes)},sheetSHA256:hash(await readFile(path.join(actionDir,'sheet-transparent.png'))),profile:qa.profile,scale:qa.scale};
 if(!qa.raw?.file){provenance.sourceGenerations=qa.sourceGenerations;provenance.frameSources=qa.frames.map(frame=>({direction:frame.direction,column:frame.column,generation:frame.sourceGeneration,sourceColumn:frame.sourceColumn??frame.column}));}
 sources.push(provenance);
 for(const direction of directions){
  const frames=staged.directions[direction][action],original=source.directions[direction][action];
  if(frames.length!==original.length||frames.some((f,i)=>f.duration!==original[i].duration))throw Error(action+' '+direction+' source timing changed');
  const file=action+'-'+direction+'.webp',bytes=await readFile(path.join(actionDir,'clips',file));await copyFile(path.join(actionDir,'clips',file),path.join(destination,'clips',file));
  manifest.directions[direction][action]=frames.map(f=>({...f,atlas:job.output+'/clips/'+file}));manifest.frameCount+=frames.length;manifest.clipCount++;manifest.maximumClipDecodedBytes=Math.max(manifest.maximumClipDecodedBytes,frames.length*192*192*4);clips.push({file:'clips/'+file,sha256:hash(bytes)});
 }
}
manifest.provenance={method:'Built-in imagegen original paired artwork; native Canvas deterministic component extraction, one frozen bundle scale, translations and verified alpha-1 background cleanup. No procedural drawing or shield overlay.',sourceManifest:{file:job.sourceManifest,sha256:hash(sourceBytes)},review:job.visualReview,sources,clips};
manifest.validation={geometry:'pass',nativeCodec:job.deferNativeReview?'pending-final-integration':'pass',stagingVisual:'reviewed',inGame:job.deferNativeReview?'pending-final-integration':job.nativeReview||'pending',mobile:'not tested',limitations:job.limitations};
await writeFile(path.join(destination,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({manifest:job.output+'/manifest.json',frames:manifest.frameCount,clips:manifest.clipCount,status:manifest.status}));
