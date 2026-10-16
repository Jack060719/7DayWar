import {advance,summarize,validate} from './engine.mjs';
import * as rosterEngine from './roster.mjs';
let running=false,cancel=false,waiting=null,sequence=0;
self.onmessage=async({data})=>{
 if(data.type==='pause'){cancel=true;return}
 if(data.type==='ack'){if(waiting?.id===data.checkpointId){const resolve=waiting.resolve;waiting=null;resolve()}return}
 if(data.type!=='simulate'||running)return;
 running=true;cancel=false;
 try{
  const roster=data.roster,state=roster?rosterEngine.selectedView(roster):data.state,v=roster?rosterEngine.validateRoster(roster):validate(state),payload=()=>roster?{roster}:{state},selected=()=>roster?rosterEngine.selectedView(roster):state;if(!v.ok)throw Error(v.errors.join('；'));
  const total=data.seconds;if(!Number.isFinite(total)||total<0)throw Error('離線時間無效');
  let processed=0,quantum=1,last=performance.now();const before=summarize(state);
  while(processed<total){
   const step=Math.min(total-processed,quantum),started=performance.now();if(roster)rosterEngine.advance(roster,step,{offline:data.offline!==false});else advance(state,step,{offline:data.offline!==false});processed+=step;const spent=performance.now()-started;if(spent>50)quantum=Math.max(.25,quantum/2);else if(spent<15)quantum=Math.min(60,quantum*2);
   if(performance.now()-last>=100||cancel){
    const checkpointId=++sequence,persisted=new Promise(resolve=>waiting={id:checkpointId,resolve});
    self.postMessage({type:'checkpoint',...payload(),processed,total,checkpointId});
    await persisted; // At most one serialized checkpoint awaits durable storage.
    await new Promise(r=>setTimeout(r,0));last=performance.now();
    if(cancel){self.postMessage({type:'paused',...payload(),processed,total});return}
   }
  }
  self.postMessage({type:'done',...payload(),processed,total,before,after:summarize(selected())});
 }catch(e){self.postMessage({type:'error',message:e.message})}
 finally{running=false;waiting=null}
};
