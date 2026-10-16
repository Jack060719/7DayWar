// Pixels remain unchanged. Labels assign each original pixel to one complete body.
export function shieldComponents(data,width,height,rows,columns,identityAlpha=16){
 const size=width*height,seen=new Uint8Array(size),bodies=[];
 for(let start=0;start<size;start++){
  if(seen[start]||data[start*4+3]<identityAlpha)continue;
  const pixels=[start];seen[start]=1;let left=width,top=height,right=-1,bottom=-1;
  for(let cursor=0;cursor<pixels.length;cursor++){
   const at=pixels[cursor],x=at%width,y=Math.floor(at/width);left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);
   for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
    const nx=x+dx,ny=y+dy,next=ny*width+nx;if(nx<0||ny<0||nx>=width||ny>=height||seen[next]||data[next*4+3]<identityAlpha)continue;seen[next]=1;pixels.push(next);
   }
  }
  if(pixels.length>=512)bodies.push({pixels,bbox:[left,top,right-left+1,bottom-top+1]});
 }
 if(bodies.length!==rows*columns)throw Error('Expected '+rows*columns+' complete body components, found '+bodies.length);
 bodies.sort((a,b)=>a.bbox[1]+a.bbox[3]/2-b.bbox[1]-b.bbox[3]/2);
 const ordered=Array.from({length:rows},(_,row)=>bodies.slice(row*columns,(row+1)*columns).sort((a,b)=>a.bbox[0]-b.bbox[0])).flat();
 const labels=new Int16Array(size);labels.fill(-1);const queue=new Int32Array(size);let head=0,tail=0;
 for(let index=0;index<ordered.length;index++)for(const at of ordered[index].pixels){labels[at]=index;queue[tail++]=at}
 while(head<tail){
  const at=queue[head++],x=at%width,y=Math.floor(at/width);
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
   const nx=x+dx,ny=y+dy,next=ny*width+nx;if(nx<0||ny<0||nx>=width||ny>=height||labels[next]!==-1)continue;labels[next]=labels[at];queue[tail++]=next;
  }
 }
 const frames=ordered.map((body,index)=>({row:Math.floor(index/columns),column:index%columns,mainBBox:body.bbox,bounds:[width,height,-1,-1],visibleBounds:[width,height,-1,-1],pixels:0,mainPixels:body.pixels.length,edgePixels:0}));let nonzeroPixels=0;
 for(let at=0;at<size;at++){
  const alpha=data[at*4+3];if(!alpha)continue;nonzeroPixels++;const frame=frames[labels[at]],x=at%width,y=Math.floor(at/width);frame.pixels++;
  for(const bounds of alpha>=16?[frame.bounds,frame.visibleBounds]:[frame.bounds]){bounds[0]=Math.min(bounds[0],x);bounds[1]=Math.min(bounds[1],y);bounds[2]=Math.max(bounds[2],x);bounds[3]=Math.max(bounds[3],y)}
  if(alpha>=16&&(x===0||y===0||x===width-1||y===height-1))frame.edgePixels++;
 }
 for(const frame of frames){const [x,y,right,bottom]=frame.bounds,[vx,vy,vr,vb]=frame.visibleBounds;frame.crop=[x-2,y-2,right-x+5,bottom-y+5];frame.bbox=[vx,vy,vr-vx+1,vb-vy+1];delete frame.bounds;delete frame.visibleBounds}
 const heights=frames.map(f=>f.bbox[3]),mean=heights.reduce((a,b)=>a+b)/heights.length;
 return{labels,frames,nonzeroPixels,assignedPixels:frames.reduce((n,f)=>n+f.pixels,0),height:{mean,min:Math.min(...heights),max:Math.max(...heights),cv:Math.sqrt(heights.reduce((n,h)=>n+(h-mean)**2,0)/heights.length)/mean}};
}
