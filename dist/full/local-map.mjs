import {geometry,project,crossing} from './world.mjs';
import {MAPS,mapNPCs,mapConnections} from './data.mjs';

// Static, original collision-map diagram. No live enemy or loot locations.
export function localMapModel(state){
 const id=state.player.map,g=geometry(id);
 return {mapId:id,name:MAPS[id].name_zh,geometry:g,markers:[
  ...mapConnections(id).map(c=>({...crossing(c.id,id).entrance,kind:'entrance',id:c.id})),
  ...mapNPCs(id).map(n=>({x:n.position_tiles[0],y:n.position_tiles[1],kind:'service',id:n.id})),
  {x:state.player.x,y:state.player.y,kind:'player',id:state.player.id}
 ]};
}

export function drawLocalMap(canvas,state,makeCanvas=()=>document.createElement('canvas')){
 const model=localMapModel(state),g=model.geometry,c=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
 const floor=makeCanvas();floor.width=g.width;floor.height=g.height;
 const fc=floor.getContext('2d'),pixels=fc.createImageData(g.width,g.height),roadColor=[132,120,93],floorColor=[97,100,77],solidColor=[43,42,36];
 for(let i=0;i<g.mask.length;i++){
  const color=g.mask[i]?(g.road[i]?roadColor:floorColor):solidColor;
  const j=i*4;pixels.data[j]=color[0];pixels.data[j+1]=color[1];pixels.data[j+2]=color[2];pixels.data[j+3]=255;
 }
 fc.putImageData(pixels,0,0);
 const scale=Math.min((w-36)/(32*(g.width+g.height)),(h-36)/(16*(g.width+g.height)));
 const left=(w-32*(g.width+g.height)*scale)/2,top=(h-16*(g.width+g.height)*scale)/2;
 const originX=left+g.height*32*scale;
 c.fillStyle='#171812';c.fillRect(0,0,w,h);
 c.save();c.translate(originX,top);c.transform(32*scale,16*scale,-32*scale,16*scale,0,0);c.imageSmoothingEnabled=false;c.drawImage(floor,0,0);c.restore();
 c.strokeStyle='#17130f';c.lineWidth=1.25;for(const edge of g.structureEdges){const [a,b]=edge.split('|').map(p=>p.split(',').map(Number)),dx=b[0]-a[0],dy=b[1]-a[1],n=Math.hypot(dx,dy),mx=(a[0]+b[0])/2+.5,my=(a[1]+b[1])/2+.5;const start=project(mx-dy/n*.45,my+dx/n*.45),end=project(mx+dy/n*.45,my-dx/n*.45);c.beginPath();c.moveTo(originX+start.x*scale,top+start.y*scale);c.lineTo(originX+end.x*scale,top+end.y*scale);c.stroke()}
 const colors={entrance:'#76b5b0',service:'#d6bc78',player:'#f4e1b4'};
 for(const marker of model.markers){const q=project(marker.x+.5,marker.y+.5),x=originX+q.x*scale,y=top+q.y*scale,r=marker.kind==='player'?4:2.5;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fillStyle=colors[marker.kind];c.fill();c.strokeStyle='#171812';c.lineWidth=1;c.stroke();if(marker.kind==='player'){c.beginPath();c.arc(x,y,7,0,Math.PI*2);c.strokeStyle=colors.player;c.stroke()}}
 floor.width=floor.height=1;
 return {mapId:model.mapId,markers:model.markers,width:w,height:h};
}
