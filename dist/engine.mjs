/* Ashen Covenant II. Original tunable balance; no claim of historical accuracy.
 * Pure serializable deterministic simulation: no DOM, wall clock, or global RNG.
 * Mutators modify their state argument and return {state, events}. Simulation is
 * a 4 Hz logical model, not render-frame replay. Feed any duration/chunking; the
 * saved fractional tick carries forward. Offline callers can batch arbitrarily.
 */
export const ATTRS = ['STR','DEX','CON','WIS','CHA','INT'];
export const CLASSES = {
  knight:{id:'knight',name:'騎士',base:{STR:16,DEX:12,CON:14,WIS:9,CHA:12,INT:8},points:4,weapon:'longsword',hp:64,mp:12,hpGrowth:10,mpGrowth:2,speed:108,description:'重甲近戰、堅守與藥水專精'},
  elf:{id:'elf',name:'妖精',base:{STR:11,DEX:12,CON:12,WIS:12,CHA:9,INT:12},points:7,weapon:'longbow',hp:48,mp:30,hpGrowth:7,mpGrowth:4,speed:118,description:'弓與劍、生命轉換、自然治癒；寵物容量 +2'},
  mage:{id:'mage',name:'法師',base:{STR:8,DEX:7,CON:12,WIS:12,CHA:8,INT:12},points:16,weapon:'ash_staff',hp:38,mp:48,hpGrowth:5,mpGrowth:7,speed:104,description:'快速回魔、範圍法術；仍須取得技能書'},
  darkelf:{id:'darkelf',name:'黑暗妖精',base:{STR:12,DEX:15,CON:8,WIS:10,CHA:9,INT:11},points:10,weapon:'twin_blades',hp:46,mp:22,hpGrowth:7,mpGrowth:3,speed:132,description:'雙刃暴擊、閃避與疾行'}
};
export const ITEMS = {
  longsword:{id:'longsword',name:'長劍',kind:'equipment',slot:'weapon',weight:45,attack:8,range:66,classes:['knight','elf'],price:220},
  longbow:{id:'longbow',name:'長弓',kind:'equipment',slot:'weapon',weight:30,attack:7,range:300,ranged:true,classes:['elf'],price:220},
  ash_staff:{id:'ash_staff',name:'灰木法杖',kind:'equipment',slot:'weapon',weight:35,attack:6,magic:2,range:72,classes:['mage'],price:220},
  twin_blades:{id:'twin_blades',name:'雙刃',kind:'equipment',slot:'weapon',weight:35,attack:8,range:62,classes:['darkelf'],price:220},
  chain_mail:{id:'chain_mail',name:'鎖子甲',kind:'equipment',slot:'armor',weight:75,ac:5,classes:['knight','elf','darkelf'],price:260},
  cloth_robe:{id:'cloth_robe',name:'布袍',kind:'equipment',slot:'armor',weight:25,ac:2,mp:8,classes:['mage'],price:180},
  ward_amulet:{id:'ward_amulet',name:'守護項鍊',kind:'equipment',slot:'charm',weight:6,mr:8,attrs:{WIS:1},price:350},
  red_potion:{id:'red_potion',name:'紅色藥水',kind:'potion',weight:2,heal:45,price:8},
  strong_potion:{id:'strong_potion',name:'濃縮藥水',kind:'potion',weight:2,heal:110,price:22},
  blue_potion:{id:'blue_potion',name:'藍色藥水',kind:'potion',weight:2,mana:30,price:12},
  resurrection_scroll:{id:'resurrection_scroll',name:'寵物復活卷軸',kind:'supply',weight:1,price:70},
  meat:{id:'meat',name:'鮮肉',kind:'food',weight:2,price:10},
  fish:{id:'fish',name:'鮮魚',kind:'food',weight:2,price:10},
  bone:{id:'bone',name:'肉骨',kind:'food',weight:2,price:10},
  pelt:{id:'pelt',name:'獸皮',kind:'loot',weight:3,value:7},
  fang:{id:'fang',name:'獠牙',kind:'loot',weight:1,value:5},
  shard:{id:'shard',name:'墓穴碎片',kind:'loot',weight:2,value:12},
  pet_collar:{id:'pet_collar',name:'寵物項圈',kind:'collar',weight:1}
};
export const SKILLS = {
  shield_wall:{id:'shield_wall',name:'堅壁',classId:'knight',mp:6,cooldown:18,duration:8,description:'8 秒內受到的傷害降低 45%'},
  heavy_strike:{id:'heavy_strike',name:'破甲重擊',classId:'knight',mp:5,cooldown:8,range:80,description:'強力近戰攻擊'},
  blood_mana:{id:'blood_mana',name:'生命轉換',classId:'elf',mp:0,cooldown:6,hpCost:20,description:'消耗 20 生命，恢復 25 魔力'},
  nature_heal:{id:'nature_heal',name:'自然治癒',classId:'elf',mp:9,cooldown:7,description:'以魔力恢復生命'},
  piercing_arrow:{id:'piercing_arrow',name:'貫穿射擊',classId:'elf',mp:7,cooldown:7,range:330,description:'強力遠程攻擊，需裝備弓'},
  ember_storm:{id:'ember_storm',name:'餘燼風暴',classId:'mage',mp:15,cooldown:7,range:330,radius:155,description:'對目標周圍敵人造成範圍魔法傷害'},
  arcane_mend:{id:'arcane_mend',name:'秘法治癒',classId:'mage',mp:8,cooldown:6,description:'以魔力恢復生命'},
  ice_lance:{id:'ice_lance',name:'霜之矛',classId:'mage',mp:8,cooldown:4,range:340,description:'遠程魔法傷害'},
  shadow_step:{id:'shadow_step',name:'影步',classId:'darkelf',mp:7,cooldown:18,duration:9,description:'9 秒內移速與閃避提高'},
  death_mark:{id:'death_mark',name:'致命印記',classId:'darkelf',mp:7,cooldown:14,duration:7,description:'7 秒內暴擊率提高'},
  double_cut:{id:'double_cut',name:'雙重斬擊',classId:'darkelf',mp:6,cooldown:6,range:75,description:'雙刃迅速斬擊'}
};
for (const skill of Object.values(SKILLS)) ITEMS['book_'+skill.id] = {id:'book_'+skill.id,name:skill.name+'技能書',kind:'book',skillId:skill.id,weight:1,monsterDropOnly:true};
export const PET_TYPES = {
  wolf:{id:'wolf',name:'野狼',food:'meat',hp:70,attack:5,speed:155,range:80,description:'中等生命、較低攻擊；可跨兩格躍擊'},
  husky:{id:'husky',name:'哈士奇',food:'fish',hp:105,attack:7,speed:115,range:55,description:'高生命、平均攻擊與速度'},
  doberman:{id:'doberman',name:'杜賓犬',food:'bone',hp:48,attack:10,speed:175,range:55,description:'低生命、高攻擊、快速移動'}
};
export const MAPS = {
  town:{id:'town',name:'灰燼鎮',width:1600,height:900,spawn:{x:800,y:700},obstacles:[{x:145,y:130,w:260,h:210},{x:1100,y:110,w:300,h:220},{x:690,y:270,w:230,h:140}],npcs:[{id:'shop',name:'補給商人',x:530,y:420},{id:'storage',name:'倉庫管理員',x:1050,y:430},{id:'pet',name:'寵物照護員',x:420,y:630}],description:'安全區：治療、倉庫、藥水與寵物照護'},
  forest:{id:'forest',name:'暮光森林',width:1600,height:900,spawn:{x:650,y:650},obstacles:[{x:250,y:230,w:280,h:150},{x:90,y:530,w:400,h:230},{x:1270,y:80,w:260,h:200},{x:1370,y:490,w:220,h:250}],description:'適合初學者；所有職業技能書都有機會掉落'},
  crypt:{id:'crypt',name:'沉眠墓穴',width:1600,height:900,spawn:{x:140,y:460},obstacles:[{x:410,y:80,w:90,h:280},{x:410,y:560,w:90,h:260},{x:900,y:280,w:90,h:340},{x:1200,y:0,w:80,h:210}],description:'危險的不死生物，較高經驗與掉落'}
};
export const MONSTERS = {
  spider:{name:'林地巨蛛',hp:45,attack:7,defense:1,xp:24,gold:12,range:55,speed:82,loot:'pelt'},
  orc:{name:'荒野獸人',hp:58,attack:9,defense:2,xp:32,gold:16,range:58,speed:95,loot:'fang'},
  skeleton:{name:'墓穴骷髏',hp:125,attack:16,defense:4,xp:70,gold:28,range:58,speed:90,loot:'shard'},
  werewolf:{name:'墓穴狼人',hp:155,attack:19,defense:5,xp:95,gold:38,range:190,speed:88,loot:'shard'},
  boss:{name:'灰燼守墓者',hp:700,attack:31,defense:10,xp:600,gold:220,range:90,speed:74,loot:'shard',boss:true,magic:true}
};
const STEP=0.25, MAX=Number.MAX_SAFE_INTEGER, MAX_EVENTS=40, NAV=40;
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const finite=(v)=>typeof v==='number'&&Number.isFinite(v);
const has=(dictionary,key)=>typeof key==='string'&&Object.hasOwn(dictionary,key);
const integer=(v)=>Number.isSafeInteger(v)&&v>=0;
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const equipment=(s,uid)=>s.inventory.equipment.find(e=>e?.uid===uid);
const result=(state,events=[])=>({state,events});
function addEvent(events,type,message,data={}){if(events.length===MAX_EVENTS)events.shift();events.push({type,message,...data});}
function addCount(obj,key,n){const next=(obj[key]||0)+n;if(!integer(next))throw new RangeError('整數資源已達安全上限');if(next)obj[key]=next;else delete obj[key];}
function count(s,id){return s.inventory.stacks[id]||0;}
function consume(s,id,n=1){if(count(s,id)<n)return false;addCount(s.inventory.stacks,id,-n);return true;}
function inc(s,key,n=1){s.summary[key]=Math.min(MAX,(s.summary[key]||0)+n);}
function rng(s){let x=s.rng>>>0;x^=x<<13;x^=x>>>17;x^=x<<5;s.rng=x>>>0;return s.rng/4294967296;}
function uid(s,prefix='e'){if(s.nextId>=MAX)throw new RangeError('識別碼已達上限');return prefix+(s.nextId++);}
function normalSeed(seed){if(typeof seed==='string'){let n=2166136261;for(const c of seed)n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0||1;}return (Number(seed)>>>0)||1;}
function gearCount(e){return e.count??1;}
function mergeEquipment(s,bag,itemId,plus,n=1){const worn=new Set(Object.values(s.equipped));const e=bag.equipment.find(e=>e.itemId===itemId&&e.plus===plus&&!worn.has(e.uid));if(e){if(gearCount(e)>MAX-n)throw new Error('裝備堆疊已達安全上限');e.count=gearCount(e)+n;return e;}const fresh={uid:uid(s),itemId,plus,count:n};bag.equipment.push(fresh);return fresh;}
function awardEquipment(s,itemId,plus=0){return mergeEquipment(s,s.inventory,itemId,plus);}
function removeGear(bag,id,n=1){const e=bag.equipment.find(e=>e.uid===id);if(!e||gearCount(e)<n)throw new Error('裝備數量不足');if(gearCount(e)===n)bag.equipment=bag.equipment.filter(item=>item.uid!==id);else e.count=gearCount(e)-n;}
function consolidateGear(s,bag){for(const e of [...bag.equipment]){if(ITEMS[e.itemId].kind!=='equipment'||Object.values(s.equipped).includes(e.uid)||locked(s,e.uid))continue;const other=bag.equipment.find(x=>x.uid!==e.uid&&x.itemId===e.itemId&&x.plus===e.plus&&!Object.values(s.equipped).includes(x.uid)&&!locked(s,x.uid));if(other&&gearCount(other)<=MAX-gearCount(e)){other.count=gearCount(other)+gearCount(e);bag.equipment=bag.equipment.filter(x=>x.uid!==e.uid);}}}

function validCreation(classId,allocated){const cls=CLASSES[classId];if(!cls)throw new Error('未知職業');let spent=0;const attrs={...cls.base};for(const key of ATTRS){const n=allocated?.[key]??0;if(!integer(n))throw new Error('配點必須為非負整數');attrs[key]+=n;spent+=n;if(attrs[key]>(classId==='knight'&&key==='STR'?20:18))throw new Error('創角屬性超過上限');}if(spent!==cls.points)throw new Error(`請分配完 ${cls.points} 點創角屬性`);return attrs;}
export function createGame(classId='knight',name='旅人',allocatedAttrs,seed=1){
  const cls=CLASSES[classId];if(!cls)throw new Error('未知職業');
  if(!allocatedAttrs){allocatedAttrs={};let remain=cls.points;const order=classId==='mage'?['INT','WIS','CON','DEX','CHA','STR']:classId==='elf'?['DEX','CON','WIS','STR','INT','CHA']:classId==='darkelf'?['DEX','STR','CON','WIS','INT','CHA']:['STR','CON','DEX','WIS','CHA','INT'];for(const key of order){const v=Math.min(remain,(classId==='knight'&&key==='STR'?20:18)-cls.base[key]);allocatedAttrs[key]=v;remain-=v;}}
  const attrs=validCreation(classId,allocatedAttrs),s={version:2,seed:normalSeed(seed),rng:normalSeed(seed),time:0,tickRemainder:0,nextId:1,
    player:{name:String(name||'旅人').slice(0,20),classId,level:1,xp:0,attributePoints:0,attrs,hp:1,mp:1,hpGrowth:0,mpGrowth:0,gold:500,map:'town',x:800,y:700,targetId:null,moveTo:null,path:[],attackIntent:false,attackCooldown:0,potionCooldown:0,skills:[],cooldowns:{},buffs:{}},
    inventory:{stacks:{red_potion:30,blue_potion:15,meat:3,fish:3,bone:3,resurrection_scroll:1},equipment:[]},storage:{stacks:{},equipment:[]},equipped:{weapon:null,armor:null,charm:null},pets:[],
    world:{monsters:[],wildPets:[],map:'town'},auto:{enabled:false,selectedMap:'forest',phase:'idle',phaseTimer:0,reason:'',settings:{autoStore:true,hpPotion:'red_potion',hpTarget:30,mpPotion:'blue_potion',mpTarget:15,hpThreshold:.45,mpThreshold:.3,useSkills:true}},
    fusion:{nextTx:1,pending:null,lastCommitted:0,lastResult:null},summary:{kills:0,deaths:0,goldEarned:0,goldLost:0,xpEarned:0,potionsUsed:0,captures:0,petDeaths:0,petRevives:0,books:0,equipmentDrops:0,fusions:0,fusionSuccess:0,simulatedSeconds:0}};
  s.equipped.weapon=awardEquipment(s,cls.weapon).uid;s.equipped.armor=awardEquipment(s,classId==='mage'?'cloth_robe':'chain_mail').uid;const st=stats(s);s.player.hp=st.maxHp;s.player.mp=st.maxMp;return s;
}
export function stats(s){const p=s.player,c=CLASSES[p.classId],attrs={...p.attrs};let attack=0,ac=0,mr=0,magic=0,extraHp=0,extraMp=0,range=55,ranged=false;
  for(const [slot,id] of Object.entries(s.equipped)){const e=equipment(s,id);if(!e)continue;const item=ITEMS[e.itemId];for(const key of ATTRS)attrs[key]+=item.attrs?.[key]||0;if(slot==='weapon'){attack=(item.attack||0)+e.plus*2;range=item.range||55;ranged=!!item.ranged;magic+=(item.magic||0)+e.plus;}ac+=(item.ac||0)+(slot==='armor'?e.plus:0);mr+=(item.mr||0)+(slot==='charm'?e.plus*2:0);extraHp+=item.hp||0;extraMp+=item.mp||0;}
  const shadow=(p.buffs.shadow_step||0)>0,marked=(p.buffs.death_mark||0)>0;
  return {attrs,maxHp:c.hp+p.attrs.CON*2+p.hpGrowth+extraHp,maxMp:c.mp+p.attrs.WIS*2+p.mpGrowth+extraMp,
    attack:Math.max(1,attack+Math.floor(((ranged?attrs.DEX:attrs.STR)-8)/2)+Math.floor(p.level/5)),magic:magic+Math.max(0,attrs.INT-8)*1.8+Math.floor(p.level/4),heal:12+attrs.INT*2,
    ac:ac+Math.floor((attrs.DEX-8)/3),mr:mr+Math.max(0,attrs.WIS-8)*2,hit:clamp(.72+(attrs.DEX-10)*.012+(attrs.STR-10)*.004,.6,.97),
    hpRegen:Math.max(.4,(attrs.CON-5)*.12),mpRegen:Math.max(.3,(attrs.WIS-5)*.1)*(p.classId==='mage'?2.5:1),carry:180+attrs.STR*12+attrs.CON*9,
    petCapacity:Math.floor(attrs.CHA/6)+(p.classId==='elf'?2:0),speed:c.speed*(shadow?1.35:1),crit:clamp((p.classId==='darkelf'?.18:.05)+(marked?.3:0),0,.85),evasion:clamp((p.classId==='darkelf'?.09:.02)+(attrs.DEX-10)*.006+(shadow?.2:0),0,.55),
    attackInterval:p.classId==='darkelf'?.8:1.1,range,ranged,damageReduction:(p.buffs.shield_wall||0)>0?.45:0};
}
export function weight(s){let total=0;for(const [id,n]of Object.entries(s.inventory.stacks))total+=(ITEMS[id]?.weight||0)*n;for(const e of s.inventory.equipment)total+=(ITEMS[e.itemId]?.weight||0)*gearCount(e);const capacity=stats(s).carry,ratio=total/capacity;return {total,capacity,ratio,regenMultiplier:ratio<=.5?1:ratio<.8?.5:0,label:ratio<=.5?'輕盈：自然恢復 100%':ratio<.8?'負重：自然恢復 50%':'沉重：自然恢復停止'};}
function blocked(map,x,y,r=12){return x<r||y<r||x>map.width-r||y>map.height-r||map.obstacles.some(o=>x>o.x-r&&x<o.x+o.w+r&&y>o.y-r&&y<o.y+o.h+r);}
function segmentIntersectsRect(a,b,rect,inflation=0){
  let enter=0,exit=1;
  for(const [axis,size]of [['x','w'],['y','h']]){
    const min=rect[axis]-inflation,max=rect[axis]+rect[size]+inflation,delta=b[axis]-a[axis];
    if(delta===0){if(a[axis]<min||a[axis]>max)return false;continue;}
    let near=(min-a[axis])/delta,far=(max-a[axis])/delta;
    if(near>far)[near,far]=[far,near];
    enter=Math.max(enter,near);exit=Math.min(exit,far);
    if(enter>exit)return false;
  }
  return true;
}
function clearSegment(map,a,b,inflation){
  if(!map||!a||!b||![a.x,a.y,b.x,b.y].every(finite))return false;
  if(blocked(map,a.x,a.y,inflation)||blocked(map,b.x,b.y,inflation))return false;
  return !map.obstacles.some(rect=>segmentIntersectsRect(a,b,rect,inflation));
}
export function lineOfSight(mapId,a,b){return has(MAPS,mapId)&&clearSegment(MAPS[mapId],a,b,0);}
function walkClear(map,a,b){return clearSegment(map,a,b,12);}
function findPath(map,a,b){
  const end={x:clamp(b.x,16,map.width-16),y:clamp(b.y,16,map.height-16)};
  if(blocked(map,end.x,end.y))return [];
  if(walkClear(map,a,end))return [end];
  const cols=Math.ceil(map.width/NAV),rows=Math.ceil(map.height/NAV),gridPoint=i=>({x:(i%cols)*NAV+NAV/2,y:Math.floor(i/cols)*NAV+NAV/2}),index=p=>clamp(Math.floor(p.y/NAV),0,rows-1)*cols+clamp(Math.floor(p.x/NAV),0,cols-1),start=index(a),point=i=>i===start?{x:a.x,y:a.y}:gridPoint(i),q=[start],prev=new Int32Array(cols*rows).fill(-1);
  prev[start]=start;let head=0,found=-1;
  while(head<q.length){
    const at=q[head++],p=point(at);
    if(walkClear(map,p,end)){found=at;break;}
    for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){
      const x=at%cols+dx,y=Math.floor(at/cols)+dy;
      if(x<0||y<0||x>=cols||y>=rows)continue;
      const ni=y*cols+x,np=point(ni);
      if(prev[ni]!==-1||blocked(map,np.x,np.y)||!walkClear(map,p,np))continue;
      prev[ni]=at;q.push(ni);
    }
  }
  if(found===-1)return [];
  const path=[end];let i=found;
  while(i!==start){path.push(point(i));i=prev[i];}
  path.reverse();return path;
}

function moveEntity(s,e,dest,speed,dt,usePath=true){if(!dest)return true;const map=MAPS[s.player.map];if(usePath&&(!e.path?.length||dist(e.path[e.path.length-1],dest)>48)){e.path=findPath(map,e,dest);}const waypoint=usePath?e.path?.[0]:dest;if(!waypoint)return true;let budget=speed*dt;let loops=0;while(budget>0&&loops++<10){const wp=usePath?e.path?.[0]:dest;if(!wp)return true;const d=dist(e,wp);if(d<.01){if(usePath)e.path.shift();else return true;continue;}const fraction=Math.min(1,budget/d),next={x:e.x+(wp.x-e.x)*fraction,y:e.y+(wp.y-e.y)*fraction};if(!walkClear(map,e,next)){if(usePath)e.path=[];return true;}e.x=next.x;e.y=next.y;budget-=Math.min(d,budget);if(fraction===1){if(usePath)e.path.shift();else return true;}else break;}return dist(e,dest)<2;}
function spawnMonster(s,type,x,y,index){const m=MONSTERS[type];return {id:'m'+index,type,name:m.name,x,y,homeX:x,homeY:y,hp:m.hp,maxHp:m.hp,attackCooldown:0,respawn:0,path:[]};}
function setMap(s,id){const map=MAPS[id],p=s.player;p.map=id;p.x=map.spawn.x;p.y=map.spawn.y;p.targetId=null;p.moveTo=null;p.path=[];p.attackIntent=false;s.world={map:id,monsters:[],wildPets:[]};if(id!=='town'){const points=id==='forest'?[[800,450],[1100,400],[820,220],[1190,660],[1330,380],[650,780]]:[[330,430],[700,190],[730,700],[1150,440],[1370,280],[1390,700]];s.world.monsters=points.map(([x,y],i)=>spawnMonster(s,id==='forest'?(i%2?'orc':'spider'):(i===5?'boss':i%2?'werewolf':'skeleton'),x,y,i));s.world.wildPets=id==='forest'?[{id:'wild_wolf',type:'wolf',name:'飢餓的野狼',x:550,y:300},{id:'wild_husky',type:'husky',name:'迷路的哈士奇',x:1100,y:780},{id:'wild_doberman',type:'doberman',name:'警戒的杜賓犬',x:1200,y:330}]:[];}for(const pet of s.pets){pet.x=p.x-25;pet.y=p.y+25;pet.path=[];}}
export function xpNeeded(level){return Math.min(MAX,55+level*level*9);}
function gainXp(s,n,events){const p=s.player;inc(s,'xpEarned',n);p.xp=Math.min(MAX,p.xp+n);while(p.xp>=xpNeeded(p.level)&&p.level<1000000){p.xp-=xpNeeded(p.level);p.level++;const c=CLASSES[p.classId];p.hpGrowth+=c.hpGrowth+Math.floor((p.attrs.CON-10)/2);p.mpGrowth+=Math.max(1,c.mpGrowth+Math.floor((p.attrs.WIS-10)/3));if(p.level>=51)p.attributePoints++;const st=stats(s);p.hp=st.maxHp;p.mp=st.maxMp;addEvent(events,'level',`升至 ${p.level} 級${p.level>=51?'，獲得 1 點屬性':''}`,{level:p.level});}}
function petStats(p){const t=PET_TYPES[p.type];return {maxHp:Math.round((t.hp+(p.level-1)*7)*p.aptitudes.hp),attack:(t.attack+(p.level-1)*1.2)*p.aptitudes.attack,speed:t.speed*p.aptitudes.speed,range:t.range,interval:p.type==='doberman'?.8:1.15};}
export {petStats};
function reconcilePets(s,events){let active=0,cap=stats(s).petCapacity;for(const pet of s.pets){if(pet.active&&active++>=cap){pet.active=false;addEvent(events,'pet',`${pet.name} 已休息：目前魅力可帶 ${cap} 隻。`);}}}
function stackDrop(s,id,n,events){if((count(s,id)||0)>MAX-n){stopAuto(s,'背包堆疊已達安全整數上限，請整理倉庫。',events);return false;}addCount(s.inventory.stacks,id,n);return true;}
function killMonster(s,m,events){if(m.hp>0||m.respawn>0)return;const def=MONSTERS[m.type];m.hp=0;m.respawn=def.boss?90:13;inc(s,'kills');const gold=Math.floor(def.gold*(.85+rng(s)*.3));s.player.gold=Math.min(MAX,s.player.gold+gold);inc(s,'goldEarned',gold);gainXp(s,def.xp,events);stackDrop(s,def.loot,def.boss?8:1,events);if(def.boss){for(let i=0;i<3;i++)awardEquipment(s,CLASSES[s.player.classId].weapon);inc(s,'equipmentDrops',3);inc(s,'bossKills');addEvent(events,'boss','擊倒灰燼守墓者，獲得三件同本體武器！',{monsterId:m.id});}if(rng(s)<.22)stackDrop(s,'red_potion',1,events);if(rng(s)<.13)stackDrop(s,'blue_potion',1,events);
  if(rng(s)<(s.player.map==='crypt'?.105:.065)){const all=Object.values(SKILLS);const own=all.filter(k=>k.classId===s.player.classId);const pool=rng(s)<.7?own:all;const skill=pool[Math.floor(rng(s)*pool.length)];if(stackDrop(s,'book_'+skill.id,1,events)){inc(s,'books');addEvent(events,'book',`獲得 ${skill.name}技能書；需手動閱讀。`,{itemId:'book_'+skill.id});}}
  if(rng(s)<(s.player.map==='crypt'?.12:.07)){const pool=[CLASSES[s.player.classId].weapon,s.player.classId==='mage'?'cloth_robe':'chain_mail','ward_amulet'];awardEquipment(s,pool[Math.floor(rng(s)*pool.length)]);inc(s,'equipmentDrops');}
  for(const pet of s.pets.filter(p=>p.active&&!p.dead)){pet.xp+=Math.floor(def.xp/2);while(pet.xp>=40+pet.level*35&&pet.level<1000000){pet.xp-=40+pet.level*35;pet.level++;pet.hp=petStats(pet).maxHp;}}
  addEvent(events,'kill',`擊倒${m.name}，獲得 ${gold} 金幣。`,{monsterId:m.id,gold,xp:def.xp});if(s.player.targetId===m.id){s.player.targetId=null;s.player.attackIntent=false;}}
function damageMonster(s,m,damage,events,kind='hit'){if(!m||m.hp<=0)return;m.hp=Math.max(0,m.hp-Math.max(1,Math.round(damage)));addEvent(events,kind,`對${m.name}造成 ${Math.round(damage)} 傷害。`,{targetId:m.id,damage:Math.round(damage)});if(m.hp<=0)killMonster(s,m,events);}
function usePotion(s,id,events){const item=ITEMS[id],p=s.player;if(item?.kind!=='potion')throw new Error('不是可用藥水');if(p.potionCooldown>0)throw new Error('藥水尚在冷卻');if(!count(s,id))throw new Error('藥水不足');const st=stats(s);if(item.heal&&p.hp>=st.maxHp)throw new Error('生命已滿');if(item.mana&&p.mp>=st.maxMp)throw new Error('魔力已滿');consume(s,id);p.hp=Math.min(st.maxHp,p.hp+(item.heal||0)*(p.classId==='knight'?1.2:1));p.mp=Math.min(st.maxMp,p.mp+(item.mana||0));p.potionCooldown=1.5;inc(s,'potionsUsed');addEvent(events,'potion',`使用${item.name}。`,{itemId:id});}
function castSkill(s,id,events,targetId){const p=s.player,k=SKILLS[id];if(!k||k.classId!==p.classId||!p.skills.includes(id))throw new Error('尚未學會此職業技能');if((p.cooldowns[id]||0)>0)throw new Error('技能尚在冷卻');if(p.mp<k.mp)throw new Error('魔力不足');if(k.hpCost&&p.hp<=k.hpCost)throw new Error('生命不足，無法安全轉換');const st=stats(s),m=s.world.monsters.find(m=>m.id===(targetId||p.targetId)&&m.hp>0);const offensive=['heavy_strike','piercing_arrow','ember_storm','ice_lance','double_cut'].includes(id);if(offensive&&(!m||dist(p,m)>k.range||!lineOfSight(p.map,p,m)))throw new Error('目標不在技能射程或視線內');if(id==='piercing_arrow'&&!st.ranged)throw new Error('貫穿射擊需要弓');if(id==='blood_mana'&&p.mp>=st.maxMp)throw new Error('魔力已滿');if(['nature_heal','arcane_mend'].includes(id)&&p.hp>=st.maxHp)throw new Error('生命已滿');
  p.mp-=k.mp;p.cooldowns[id]=k.cooldown;if(k.duration)p.buffs[id]=k.duration;if(id==='blood_mana'){p.hp-=20;p.mp=Math.min(st.maxMp,p.mp+25);}else if(['nature_heal','arcane_mend'].includes(id))p.hp=Math.min(st.maxHp,p.hp+st.heal*(id==='arcane_mend'?1.15:1));else if(id==='ember_storm'){for(const enemy of s.world.monsters.filter(e=>e.hp>0&&dist(e,m)<=k.radius&&lineOfSight(p.map,m,e)))damageMonster(s,enemy,18+st.magic*1.5,events,'magic');}else if(id==='ice_lance')damageMonster(s,m,12+st.magic*1.5,events,'magic');else if(offensive)damageMonster(s,m,st.attack*(id==='double_cut'?2.5:2.15),events,'skill');addEvent(events,'skill',`施放${k.name}。`,{skillId:id});}
function stopAuto(s,reason,events){s.auto.enabled=false;s.auto.phase='stopped';s.auto.reason=reason;s.player.attackIntent=false;s.player.targetId=null;s.player.moveTo=null;s.player.path=[];addEvent(events,'stop',reason);}
function beginTownCycle(s,reason,events){setMap(s,'town');s.auto.phase='heal';s.auto.phaseTimer=2;s.auto.reason=reason;addEvent(events,'town',reason+'，返回灰燼鎮。');}
function playerDeath(s,events){const p=s.player;if(p.hp>0)return;const loss=Math.floor(p.gold*.1);p.gold-=loss;inc(s,'goldLost',loss);inc(s,'deaths');p.hp=1;beginTownCycle(s,`死亡失去 ${loss} 金幣`,events);}
function petDeath(s,pet,events){if(pet.dead)return;pet.hp=0;pet.dead=true;inc(s,'petDeaths');if(consume(s,'resurrection_scroll')){pet.dead=false;pet.hp=Math.ceil(petStats(pet).maxHp*.6);inc(s,'petRevives');addEvent(events,'pet',`${pet.name} 使用復活卷軸復活。`,{petId:pet.id});}else{beginTownCycle(s,`${pet.name} 倒下，需由照護員召回`,events);}}
function storeLoot(s,events){let n=0;for(const [id,amount]of Object.entries(s.inventory.stacks)){if(['loot','book'].includes(ITEMS[id]?.kind)&&(s.storage.stacks[id]||0)>MAX-amount)throw new Error('倉庫堆疊已達安全上限');}const worn=new Set(Object.values(s.equipped)),lockedIds=new Set(s.fusion.pending?.inputUids||[]);const movable=s.inventory.equipment.filter(e=>!worn.has(e.uid)&&!lockedIds.has(e.uid)&&ITEMS[e.itemId].kind!=='collar');for(const e of movable){const existing=s.storage.equipment.find(x=>x.itemId===e.itemId&&x.plus===e.plus);if(existing&&gearCount(existing)>MAX-gearCount(e))throw new Error('倉庫裝備堆疊已達安全上限');}for(const [id,amount]of Object.entries(s.inventory.stacks)){if(!['loot','book'].includes(ITEMS[id]?.kind))continue;addCount(s.storage.stacks,id,amount);delete s.inventory.stacks[id];n+=amount;}for(const e of movable){mergeEquipment(s,s.storage,e.itemId,e.plus,gearCount(e));removeGear(s.inventory,e.uid,gearCount(e));n+=gearCount(e);}if(n)addEvent(events,'store',`安全存入 ${n} 件戰利品與技能書。`,{count:n});}

function resupply(s,events){const a=s.auto.settings,orders=[[a.hpPotion,a.hpTarget],[a.mpPotion,a.mpTarget]],cost=orders.reduce((sum,[id,target])=>sum+Math.max(0,target-count(s,id))*ITEMS[id].price,0);if(cost>s.player.gold){stopAuto(s,`補給需要 ${cost} 金幣，目前只有 ${s.player.gold}；已在城鎮安全停止。`,events);return false;}for(const [id,target]of orders){const n=Math.max(0,target-count(s,id));if(n){s.player.gold-=n*ITEMS[id].price;addCount(s.inventory.stacks,id,n);}}addEvent(events,'supply',`補給完成，花費 ${cost} 金幣。`,{cost});return true;}
function townTick(s,dt,events){const p=s.player,st=stats(s);if(!['heal','store','resupply','return'].includes(s.auto.phase)){p.hp=Math.min(st.maxHp,p.hp+st.maxHp*.15*dt);p.mp=Math.min(st.maxMp,p.mp+st.maxMp*.15*dt);return;}s.auto.phaseTimer-=dt;if(s.auto.phaseTimer>0)return;if(s.auto.phase==='heal'){p.hp=st.maxHp;p.mp=st.maxMp;for(const pet of s.pets){if(pet.dead){pet.dead=false;inc(s,'petRevives');addEvent(events,'pet',`照護員召回 ${pet.name}；身分與資質保留。`,{petId:pet.id});}pet.hp=petStats(pet).maxHp;}s.auto.phase='store';s.auto.phaseTimer=.25;}else if(s.auto.phase==='store'){if(s.auto.enabled&&s.auto.settings.autoStore)storeLoot(s,events);s.auto.phase=s.auto.enabled?'resupply':'idle';s.auto.phaseTimer=.25;}else if(s.auto.phase==='resupply'){if(resupply(s,events)){s.auto.phase='return';s.auto.phaseTimer=1;}}else if(s.auto.phase==='return'){if(s.auto.enabled){setMap(s,s.auto.selectedMap);s.auto.phase='hunt';s.auto.reason='';addEvent(events,'return',`返回${MAPS[s.auto.selectedMap].name}自動狩獵。`);}else s.auto.phase='idle';}}
function autoSkill(s,events){const p=s.player,st=stats(s);let order=[];if(p.classId==='elf')order=p.hp/st.maxHp<.65?['nature_heal']:p.mp/st.maxMp<.4&&p.hp/st.maxHp>.6?['blood_mana']:['piercing_arrow'];else if(p.classId==='mage')order=p.hp/st.maxHp<.6?['arcane_mend']:['ember_storm','ice_lance'];else if(p.classId==='knight')order=p.hp/st.maxHp<.65?['shield_wall','heavy_strike']:['heavy_strike'];else order=['death_mark','shadow_step','double_cut'];for(const id of order){if(!p.skills.includes(id)||(p.cooldowns[id]||0)>0)continue;try{castSkill(s,id,events);return;}catch{}}}
function tick(s,events){const dt=STEP,p=s.player;s.time+=dt;s.summary.simulatedSeconds=s.time;for(const k of Object.keys(p.cooldowns))p.cooldowns[k]=Math.max(0,p.cooldowns[k]-dt);for(const k of Object.keys(p.buffs))p.buffs[k]=Math.max(0,p.buffs[k]-dt);p.attackCooldown=Math.max(0,p.attackCooldown-dt);p.potionCooldown=Math.max(0,p.potionCooldown-dt);reconcilePets(s,events);if(p.hp<=0){playerDeath(s,events);return;}if(p.map==='town'){if(p.moveTo&&moveEntity(s,p,p.moveTo,stats(s).speed,dt))p.moveTo=null;for(const pet of s.pets)if(pet.active&&!pet.dead&&dist(pet,p)>70)moveEntity(s,pet,{x:p.x-25,y:p.y+25},petStats(pet).speed,dt);townTick(s,dt,events);return;}const st=stats(s),w=weight(s);p.hp=Math.min(st.maxHp,p.hp+st.hpRegen*w.regenMultiplier*dt);p.mp=Math.min(st.maxMp,p.mp+st.mpRegen*w.regenMultiplier*dt);
  for(const m of s.world.monsters){if(m.hp<=0){m.respawn=Math.max(0,m.respawn-dt);if(m.respawn<=0){m.hp=m.maxHp;m.x=m.homeX;m.y=m.homeY;m.path=[];}continue;}m.attackCooldown=Math.max(0,m.attackCooldown-dt);}
  if(s.auto.enabled){const a=s.auto.settings;if(p.hp/st.maxHp<a.hpThreshold&&p.potionCooldown<=0){if(count(s,a.hpPotion))usePotion(s,a.hpPotion,events);else if(p.hp/st.maxHp<.35){beginTownCycle(s,'生命藥水耗盡',events);return;}}if(p.mp/st.maxMp<a.mpThreshold&&p.potionCooldown<=0&&count(s,a.mpPotion))usePotion(s,a.mpPotion,events);if(!s.world.monsters.some(m=>m.id===p.targetId&&m.hp>0)){const targets=s.world.monsters.filter(m=>m.hp>0).sort((a,b)=>dist(p,a)-dist(p,b));p.targetId=targets[0]?.id||null;p.path=[];}p.attackIntent=!!p.targetId;if(a.useSkills)autoSkill(s,events);}
  let target=s.world.monsters.find(m=>m.id===p.targetId&&m.hp>0);if(p.attackIntent&&target){if(dist(p,target)>st.range||!lineOfSight(p.map,p,target)){moveEntity(s,p,target,st.speed,dt);}else if(p.attackCooldown<=0){p.attackCooldown=st.attackInterval;if(rng(s)<st.hit){const critical=rng(s)<st.crit;damageMonster(s,target,Math.max(1,st.attack-MONSTERS[target.type].defense)*(critical?1.85:1),events,critical?'critical':'hit');}else addEvent(events,'miss','攻擊落空。',{targetId:target.id});}}else if(p.moveTo){if(moveEntity(s,p,p.moveTo,st.speed,dt))p.moveTo=null;}
  target=s.world.monsters.find(m=>m.id===p.targetId&&m.hp>0);for(const pet of s.pets){if(!pet.active||pet.dead)continue;const ps=petStats(pet);pet.attackCooldown=Math.max(0,(pet.attackCooldown||0)-dt);pet.hp=Math.min(ps.maxHp,pet.hp+.6*w.regenMultiplier*dt);if(target){if(dist(pet,target)>ps.range||!lineOfSight(p.map,pet,target))moveEntity(s,pet,target,ps.speed,dt);else if(pet.attackCooldown<=0){pet.attackCooldown=ps.interval;if(pet.type==='wolf'&&dist(pet,target)>35){const distance=dist(pet,target),leap=Math.min(NAV*2,Math.max(0,distance-30)),dest={x:pet.x+(target.x-pet.x)*leap/distance,y:pet.y+(target.y-pet.y)*leap/distance};if(walkClear(MAPS[p.map],pet,dest)){pet.x=dest.x;pet.y=dest.y;pet.path=[];addEvent(events,'petLeap',`${pet.name} 兩格躍擊。`,{petId:pet.id,targetId:target.id});}}damageMonster(s,target,Math.max(1,ps.attack-MONSTERS[target.type].defense*.5),events,'petHit');}}else if(dist(pet,p)>70)moveEntity(s,pet,{x:p.x-25,y:p.y+25},ps.speed,dt);}
  for(const m of s.world.monsters){if(m.hp<=0)continue;const def=MONSTERS[m.type];if(dist(m,p)>400)continue;const nearby=s.pets.filter(pet=>pet.active&&!pet.dead&&dist(pet,m)<100);const tank=nearby.find(pet=>pet.type==='husky')||nearby[0],victim=tank||p;const range=def.range;if(dist(m,victim)>range||!lineOfSight(p.map,m,victim)){moveEntity(s,m,victim,def.speed,dt);continue;}if(m.attackCooldown>0)continue;m.attackCooldown=1.55;if(victim===p){if(rng(s)<st.evasion)continue;const mitigation=def.magic?st.mr*.06:st.ac*.5;p.hp=Math.max(0,p.hp-Math.max(1,(def.attack-mitigation)*(1-st.damageReduction)));if(p.hp<=0){playerDeath(s,events);return;}}else{victim.hp=Math.max(0,victim.hp-Math.max(1,def.attack-2));if(victim.hp<=0){petDeath(s,victim,events);if(p.map==='town')return;}}}
}
export function advance(s,seconds,options={}){if(!finite(seconds)||seconds<0)throw new Error('模擬時間必須為非負有限秒數');if(s.time+seconds>MAX/4)throw new Error('模擬時間已達安全上限');const events=[];const total=s.tickRemainder+seconds;const ticks=Math.floor((total+1e-9)/STEP);s.tickRemainder=Math.max(0,Math.round((total-ticks*STEP)*1e9)/1e9);for(let i=0;i<ticks;i++){tick(s,events);if(s.player.map==='town'&&!s.auto.enabled&&['idle','stopped'].includes(s.auto.phase)&&!s.player.moveTo&&s.player.attackCooldown===0&&s.player.potionCooldown===0&&Object.values(s.player.cooldowns).every(n=>n===0)&&Object.values(s.player.buffs).every(n=>n===0)){const st=stats(s);if(s.player.hp===st.maxHp&&s.player.mp===st.maxMp&&s.pets.every(p=>!p.active||p.dead||dist(p,s.player)<=70)){s.time+=(ticks-i-1)*STEP;s.summary.simulatedSeconds=s.time;break;}}}return result(s,events);}
export function fusionChance(plus){return clamp(.9-plus*.07,.15,.9);}
function fusionProblem(s){
  const f=s.fusion,object=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
  if(!object(f)||!integer(f.lastCommitted)||!Number.isSafeInteger(f.nextTx)||f.nextTx<1)return '無效融合交易序號';
  if(!object(s.summary)||!integer(s.summary.fusions)||!integer(s.summary.fusionSuccess)||s.summary.fusions!==f.lastCommitted||s.summary.fusionSuccess>s.summary.fusions)return '融合累計次數與交易序號不一致';
  const gearUid=id=>typeof id==='string'&&/^e[1-9][0-9]*$/.test(id)&&Number.isSafeInteger(Number(id.slice(1)))&&Number(id.slice(1))<s.nextId;
  const transaction=tx=>object(tx)&&Number.isSafeInteger(tx.id)&&tx.id>=1&&Array.isArray(tx.inputUids)&&tx.inputUids.length===2&&tx.inputUids.every(gearUid)&&has(ITEMS,tx.itemId)&&ITEMS[tx.itemId].kind==='equipment'&&integer(tx.plus)&&tx.plus<99&&typeof tx.success==='boolean'&&finite(tx.chance)&&tx.chance===fusionChance(tx.plus);
  if(f.lastCommitted===0){if(f.lastResult!==null||s.summary.fusionSuccess!==0)return '尚未融合卻有歷史結果';}
  else if(!transaction(f.lastResult)||f.lastResult.id!==f.lastCommitted||(f.lastResult.success?!gearUid(f.lastResult.outputUid):f.lastResult.outputUid!==null))return '無效的已提交融合紀錄';
  else if(f.lastResult.success?s.summary.fusionSuccess<1:s.summary.fusionSuccess>=s.summary.fusions)return '融合成功次數與最近結果不一致';
  if(f.pending===null){if(f.nextTx!==f.lastCommitted+1)return '融合交易序號不連續';return null;}
  const tx=f.pending;
  if(!transaction(tx)||tx.id!==f.lastCommitted+1||f.nextTx!==tx.id+1)return '待提交融合紀錄不一致';
  if(!Array.isArray(s.inventory?.equipment)||!object(s.equipped))return '融合材料背包無效';
  const inputs=tx.inputUids.map(id=>equipment(s,id));
  if(inputs.some(e=>!e||(!has(ITEMS,e.itemId)||ITEMS[e.itemId].kind!=='equipment')||e.itemId!==tx.itemId||e.plus!==tx.plus||!Number.isSafeInteger(gearCount(e))||gearCount(e)<1)||tx.inputUids.some(id=>Object.values(s.equipped).includes(id))||(tx.inputUids[0]===tx.inputUids[1]&&gearCount(inputs[0])<2))return '融合交易材料缺失或不相符';
  return null;
}
function stageFusion(s,c,events){const problem=fusionProblem(s);if(problem)throw new Error(problem);if(s.fusion.pending)throw new Error('已有待提交的融合，請先完成');const ids=c.uids||[c.firstUid,c.secondUid];if(ids.length!==2)throw new Error('請選兩件裝備');const [a,b]=ids.map(id=>equipment(s,id));if(!a||!b||ITEMS[a.itemId]?.kind!=='equipment'||a.itemId!==b.itemId||a.plus!==b.plus)throw new Error('融合需要兩件同本體、同 +N 的裝備');if(ids[0]===ids[1]&&gearCount(a)<2)throw new Error('此裝備堆疊不足兩件');if(Object.values(s.equipped).some(id=>ids.includes(id)))throw new Error('請先卸下要融合的裝備');if(a.plus>=99)throw new Error('裝備已達 +99 安全上限');if(s.fusion.nextTx>=MAX)throw new Error('融合交易序號已達安全上限');const id=s.fusion.nextTx++,chance=fusionChance(a.plus);s.fusion.pending={id,inputUids:[...ids],itemId:a.itemId,plus:a.plus,success:rng(s)<chance,chance};addEvent(events,'fusionStaged','融合結果已鎖定，等待存檔提交。',{transaction:{...s.fusion.pending}});}
function commitFusion(s,c,events){const problem=fusionProblem(s);if(problem)throw new Error(problem);const id=c.transactionId??c.id??s.fusion.pending?.id;if(!Number.isSafeInteger(id)||id<1)throw new Error('無效的融合交易 ID');if(id<=s.fusion.lastCommitted){addEvent(events,'fusionDuplicate','此融合已完成；沒有重複消耗。',{transactionId:id});return;}const tx=s.fusion.pending;if(!tx||tx.id!==id)throw new Error('找不到待提交的融合');const inputs=tx.inputUids.map(id=>equipment(s,id));if(inputs.some(e=>!e||e.itemId!==tx.itemId||e.plus!==tx.plus))throw new Error('融合材料狀態不一致，未消耗任何物品');if(tx.inputUids[0]===tx.inputUids[1]&&gearCount(inputs[0])<2)throw new Error('融合材料數量不足');if(tx.success){const output=s.inventory.equipment.find(e=>e.itemId===tx.itemId&&e.plus===tx.plus+1&&!Object.values(s.equipped).includes(e.uid));if(output&&gearCount(output)>=MAX)throw new Error('融合產物堆疊已達安全上限');if(!output&&s.nextId>=MAX)throw new Error('識別碼已達安全上限');}for(const inputUid of tx.inputUids)removeGear(s.inventory,inputUid);let output=null;if(tx.success)output=awardEquipment(s,tx.itemId,tx.plus+1);s.fusion.lastCommitted=id;s.fusion.lastResult={...tx,outputUid:output?.uid||null};s.fusion.pending=null;inc(s,'fusions');if(tx.success)inc(s,'fusionSuccess');addEvent(events,'fusion',tx.success?`融合成功：${ITEMS[tx.itemId].name} +${tx.plus+1}`:'融合失敗：兩件材料均已消失。',{transactionId:id,success:tx.success,outputUid:output?.uid||null});}
function locked(s,uid){return s.fusion.pending?.inputUids.includes(uid);}
export function command(s,c){const events=[];try{const p=s.player;
  switch(c.type){
    case 'move':{if(!finite(c.x)||!finite(c.y))throw new Error('無效座標');const map=MAPS[p.map],dest={x:clamp(c.x,16,map.width-16),y:clamp(c.y,16,map.height-16)};if(blocked(map,dest.x,dest.y))throw new Error('目的地有障礙物');p.targetId=null;p.attackIntent=false;p.moveTo=dest;p.path=findPath(map,p,dest);if(s.auto.enabled){s.auto.enabled=false;s.auto.phase='idle';}break;}
    case 'target':{if(c.targetId&&!s.world.monsters.some(m=>m.id===c.targetId&&m.hp>0))throw new Error('找不到目標');p.targetId=c.targetId||null;p.moveTo=null;p.path=[];p.attackIntent=false;break;}
    case 'attack':{const targetId=c.targetId||p.targetId;if(!s.world.monsters.some(m=>m.id===targetId&&m.hp>0))throw new Error('請先選擇目標');p.targetId=targetId;p.attackIntent=true;p.moveTo=null;break;}
    case 'skill':castSkill(s,c.skillId,events,c.targetId);break;
    case 'potion':usePotion(s,c.itemId||'red_potion',events);break;
    case 'travel':{if(!MAPS[c.mapId])throw new Error('未知地圖');if(c.mapId==='town'){beginTownCycle(s,'手動返回城鎮',events);s.auto.enabled=false;}else{setMap(s,c.mapId);s.auto.selectedMap=c.mapId;s.auto.phase=s.auto.enabled?'hunt':'idle';}break;}
    case 'toggleAuto':{
      if(c.enabled!==undefined&&typeof c.enabled!=='boolean')throw new Error('自動狩獵開關必須為布林值');
      if(c.mapId!==undefined&&(!has(MAPS,c.mapId)||c.mapId==='town'))throw new Error('請選擇狩獵地圖');
      s.auto.enabled=c.enabled??!s.auto.enabled;s.auto.reason='';
      if(s.auto.enabled){
        if(c.mapId!==undefined)s.auto.selectedMap=c.mapId;
        if(p.map==='town'){s.auto.phase='heal';s.auto.phaseTimer=.25;}
        else if(p.map!==s.auto.selectedMap)beginTownCycle(s,`切換狩獵地圖至${MAPS[s.auto.selectedMap].name}`,events);
        else s.auto.phase='hunt';
      }else{s.auto.phase='idle';p.attackIntent=false;p.targetId=null;p.path=[];}
      break;
    }
    case 'configureAuto':{if(c.mapId!==undefined&&(!has(MAPS,c.mapId)||c.mapId==='town'))throw new Error('無效的狩獵地圖');const next={...s.auto.settings,...c.settings};if(!ITEMS[next.hpPotion]?.heal||!ITEMS[next.mpPotion]?.mana||!integer(next.hpTarget)||!integer(next.mpTarget)||next.hpTarget>10000||next.mpTarget>10000||!finite(next.hpThreshold)||!finite(next.mpThreshold)||next.hpThreshold<0||next.hpThreshold>1||next.mpThreshold<0||next.mpThreshold>1)throw new Error('無效的補給設定');next.autoStore=!!next.autoStore;next.useSkills=!!next.useSkills;s.auto.settings=next;if(c.mapId){if(!MAPS[c.mapId]||c.mapId==='town')throw new Error('無效的狩獵地圖');s.auto.selectedMap=c.mapId;}break;}
    case 'learn':{const id=c.skillId||ITEMS[c.itemId]?.skillId,k=SKILLS[id];if(!k||k.classId!==p.classId)throw new Error('這不是你的職業技能書');if(p.skills.includes(id))throw new Error('已學會此技能');if(!consume(s,'book_'+id))throw new Error('需要背包中的技能書；只能由怪物掉落取得');p.skills.push(id);addEvent(events,'learn',`學會${k.name}。`,{skillId:id});break;}
    case 'equip':{const e=equipment(s,c.uid),item=ITEMS[e?.itemId];if(!e||item.kind!=='equipment')throw new Error('找不到可裝備物品');if(locked(s,e.uid))throw new Error('融合材料已鎖定');if(item.classes&&!item.classes.includes(p.classId))throw new Error('職業無法裝備');if(gearCount(e)>1){removeGear(s.inventory,e.uid);const split={uid:uid(s),itemId:e.itemId,plus:e.plus,count:1};s.inventory.equipment.push(split);s.equipped[item.slot]=split.uid;}else s.equipped[item.slot]=e.uid;consolidateGear(s,s.inventory);reconcilePets(s,events);const st=stats(s);p.hp=Math.min(p.hp,st.maxHp);p.mp=Math.min(p.mp,st.maxMp);break;}
    case 'unequip':{if(!Object.hasOwn(s.equipped,c.slot))throw new Error('無效裝備欄');s.equipped[c.slot]=null;consolidateGear(s,s.inventory);reconcilePets(s,events);const st=stats(s);p.hp=Math.min(p.hp,st.maxHp);p.mp=Math.min(p.mp,st.maxMp);break;}
    case 'fuseStage':stageFusion(s,c,events);break;
    case 'fuseCommit':commitFusion(s,c,events);break;
    case 'feed':{const wild=s.world.wildPets.find(w=>w.id===c.wildId);if(!wild)throw new Error('找不到野生寵物');if(dist(p,wild)>180)throw new Error('請靠近野生寵物再餵食');const food=c.itemId||PET_TYPES[wild.type].food;if(ITEMS[food]?.kind!=='food')throw new Error('請使用食物');if(!consume(s,food))throw new Error('食物不足');const favorite=food===PET_TYPES[wild.type].food;if(rng(s)>=(favorite?.6:.12)){addEvent(events,'feed',favorite?'牠很喜歡，但仍有戒心。':'牠似乎更喜歡別種食物。',{captured:false});break;}const pet={id:uid(s,'p'),type:wild.type,name:PET_TYPES[wild.type].name,level:1,xp:0,aptitudes:{hp:Math.round((.85+rng(s)*.3)*100)/100,attack:Math.round((.85+rng(s)*.3)*100)/100,speed:Math.round((.9+rng(s)*.2)*100)/100},hp:1,active:s.pets.filter(p=>p.active).length<stats(s).petCapacity,dead:false,x:wild.x,y:wild.y,path:[],attackCooldown:0,collarUid:null};pet.hp=petStats(pet).maxHp;const collar={uid:uid(s,'c'),itemId:'pet_collar',plus:0,count:1,petId:pet.id};pet.collarUid=collar.uid;s.inventory.equipment.push(collar);s.pets.push(pet);s.world.wildPets=s.world.wildPets.filter(w=>w.id!==wild.id);inc(s,'captures');addEvent(events,'capture',`馴服${pet.name}，專屬項圈已加入背包。`,{petId:pet.id,captured:true});break;}
    case 'petActive':{if(c.active!==undefined&&typeof c.active!=='boolean')throw new Error('寵物出戰開關必須為布林值');const pet=s.pets.find(pet=>pet.id===c.petId);if(!pet)throw new Error('找不到寵物');const active=c.active??!pet.active;if(active&&!pet.active&&s.pets.filter(p=>p.active).length>=stats(s).petCapacity)throw new Error('魅力不足，請先讓其他寵物休息');if(active&&pet.dead)throw new Error('請先復活或回城召回');pet.active=active;pet.x=p.x-25;pet.y=p.y+25;pet.path=[];break;}
    case 'petRecall':{if(p.map!=='town')throw new Error('請到灰燼鎮找寵物照護員');const pet=s.pets.find(p=>p.id===c.petId);if(!pet)throw new Error('找不到寵物');if(pet.dead)inc(s,'petRevives');pet.dead=false;pet.hp=petStats(pet).maxHp;addEvent(events,'pet',`${pet.name} 已由照護員召回。`,{petId:pet.id});break;}
    case 'heal':{if(p.map!=='town')throw new Error('請先回城治療');const st=stats(s);p.hp=st.maxHp;p.mp=st.maxMp;addEvent(events,'heal','城鎮治療完成。');break;}
    case 'restock':{if(p.map!=='town')throw new Error('請先回城補給');const a=s.auto.settings;const cost=[[a.hpPotion,a.hpTarget],[a.mpPotion,a.mpTarget]].reduce((sum,[id,n])=>sum+Math.max(0,n-count(s,id))*ITEMS[id].price,0);if(cost>p.gold)throw new Error(`補給需要 ${cost} 金幣，目前只有 ${p.gold}`);resupply(s,events);break;}
    case 'buy':{if(p.map!=='town')throw new Error('請先回城補給');const item=ITEMS[c.itemId],n=c.count??1;if(!item?.price||!['potion','food','supply'].includes(item.kind)||item.monsterDropOnly)throw new Error('商店不販售此物品');if(!integer(n)||n<1||n>10000)throw new Error('購買數量不正確');if(p.gold<n*item.price)throw new Error('金幣不足');if(count(s,item.id)>MAX-n)throw new Error('堆疊數量過高');p.gold-=n*item.price;addCount(s.inventory.stacks,item.id,n);break;}
    case 'store':case 'withdraw':{if(p.map!=='town')throw new Error('請先回城使用倉庫');if(c.allLoot){if(c.type!=='store')throw new Error('請指定取出的物品');storeLoot(s,events);break;}const from=c.type==='store'?s.inventory:s.storage,to=c.type==='store'?s.storage:s.inventory;if(c.uid){const e=from.equipment.find(e=>e.uid===c.uid);if(!e)throw new Error('找不到物品');if(Object.values(s.equipped).includes(e.uid)||locked(s,e.uid)||ITEMS[e.itemId].kind==='collar')throw new Error('裝備中、融合中或專屬項圈不可存入');const n=c.count??gearCount(e);if(!integer(n)||n<1||n>gearCount(e))throw new Error('裝備數量不足');const existing=to.equipment.find(x=>x.itemId===e.itemId&&x.plus===e.plus&&!Object.values(s.equipped).includes(x.uid));if(existing&&gearCount(existing)>MAX-n)throw new Error('裝備堆疊數量過高');mergeEquipment(s,to,e.itemId,e.plus,n);removeGear(from,e.uid,n);}else{const n=c.count??from.stacks[c.itemId]??0;if(!integer(n)||n<1||(from.stacks[c.itemId]||0)<n)throw new Error('物品數量不足');if((to.stacks[c.itemId]||0)>MAX-n)throw new Error('堆疊數量過高');addCount(from.stacks,c.itemId,-n);addCount(to.stacks,c.itemId,n);}break;}
    case 'allocate':{const key=c.attr,n=c.count??1;if(!ATTRS.includes(key)||!integer(n)||n<1||p.attributePoints<n)throw new Error('可分配屬性點不足');if(p.attrs[key]+n>99)throw new Error('屬性已達 99 上限');p.attrs[key]+=n;p.attributePoints-=n;reconcilePets(s,events);break;}
    default:throw new Error('未知操作');
  }
  }catch(error){addEvent(events,'error',error.message);return {...result(s,events),ok:false,error:error.message};}return {...result(s,events),ok:true};}
export function summarize(s){const st=stats(s);return {...s.summary,level:s.player.level,xp:s.player.xp,xpNeeded:xpNeeded(s.player.level),gold:s.player.gold,hp:s.player.hp,maxHp:st.maxHp,mp:s.player.mp,maxMp:st.maxMp,map:MAPS[s.player.map].name,weight:weight(s),auto:s.auto.enabled,phase:s.auto.phase,reason:s.auto.reason,petCapacity:st.petCapacity,activePets:s.pets.filter(p=>p.active).length,ownedPets:s.pets.length};}
export function validate(s){
  const errors=[],fail=message=>errors.push(message),obj=x=>!!x&&typeof x==='object'&&!Array.isArray(x),positive=x=>Number.isSafeInteger(x)&&x>0;
  if(!obj(s)||s.version!==2)return {ok:false,errors:['不支援的存檔版本']};
  const required=['player','inventory','storage','equipped','world','auto','fusion','summary'];
  for(const key of required)if(!obj(s[key]))fail('缺少存檔區塊：'+key);
  if(!Array.isArray(s.pets))fail('缺少寵物清單');
  if(errors.length)return {ok:false,errors};
  const p=s.player,invGear=Array.isArray(s.inventory.equipment)?s.inventory.equipment:[];
  if(!has(CLASSES,p.classId))fail('未知職業');if(!has(MAPS,p.map))fail('未知地圖');
  if(typeof p.name!=='string'||p.name.length<1||p.name.length>20)fail('無效角色名稱');
  for(const key of ['level','xp','attributePoints','gold','hpGrowth','mpGrowth'])if(!integer(p[key]))fail('無效玩家數值：'+key);
  if(!positive(p.level)||p.level>1000000)fail('無效等級');
  if(!obj(p.attrs))fail('缺少屬性');else for(const key of ATTRS)if(!positive(p.attrs[key])||p.attrs[key]>99)fail('無效屬性：'+key);
  for(const key of ['hp','mp','x','y','attackCooldown','potionCooldown'])if(!finite(p[key])||p[key]<0)fail('無效玩家數值：'+key);
  for(const key of ['cooldowns','buffs']){if(!obj(p[key]))fail('缺少技能時鐘');else for(const [id,n]of Object.entries(p[key]))if(!has(SKILLS,id)||!finite(n)||n<0)fail('無效技能時鐘');}
  const point=v=>obj(v)&&finite(v.x)&&finite(v.y);
  if(p.moveTo!==null&&!point(p.moveTo))fail('無效移動目標');
  if(!Array.isArray(p.path)||p.path.length>2000||p.path.some(v=>!point(v)))fail('無效移動路徑');
  if(typeof p.attackIntent!=='boolean')fail('無效攻擊狀態');
  if(!Array.isArray(p.skills)||new Set(p.skills).size!==p.skills.length||p.skills.some(id=>!has(SKILLS,id)||SKILLS[id].classId!==p.classId))fail('技能不屬於此職業');
  if(!positive(s.rng)||s.rng>4294967295||!integer(s.seed)||!positive(s.nextId)||!finite(s.time)||s.time<0||s.time>MAX/4||!finite(s.tickRemainder)||s.tickRemainder<0||s.tickRemainder>=STEP+1e-8)fail('無效模擬時鐘或亂數種子');
  const seen=new Set();let maxId=0;
  const checkUid=id=>{if(typeof id!=='string'||!/^([ecp])([1-9][0-9]*)$/.test(id)){fail('無效物品識別碼');return;}const n=Number(id.slice(1));if(!positive(n)||seen.has(id))fail('重複或無效識別碼：'+id);seen.add(id);maxId=Math.max(maxId,n);};
  for(const bag of [s.inventory,s.storage]){if(!obj(bag.stacks)||!Array.isArray(bag.equipment)){fail('無效背包');continue;}for(const [id,n]of Object.entries(bag.stacks))if(!has(ITEMS,id)||!positive(n)||['equipment','collar'].includes(ITEMS[id].kind))fail('無效堆疊：'+id);for(const e of bag.equipment){if(!obj(e)){fail('無效裝備');continue;}checkUid(e.uid);if(!has(ITEMS,e.itemId)||!['equipment','collar'].includes(ITEMS[e.itemId].kind)||!integer(e.plus)||e.plus>99||!positive(gearCount(e)))fail('無效裝備：'+e.uid);}}
  for(const slot of ['weapon','armor','charm']){const id=s.equipped[slot];if(id===null)continue;const e=invGear.find(e=>e?.uid===id);if(!e||ITEMS[e.itemId]?.slot!==slot||gearCount(e)!==1||ITEMS[e.itemId].classes&&!ITEMS[e.itemId].classes.includes(p.classId))fail('裝備欄不一致：'+slot);}
  for(const pet of s.pets){if(!obj(pet)){fail('無效寵物');continue;}checkUid(pet.id);if(!has(PET_TYPES,pet.type)||typeof pet.name!=='string'||pet.name.length<1||pet.name.length>40||!positive(pet.level)||pet.level>1000000||!integer(pet.xp)||!finite(pet.hp)||pet.hp<0||typeof pet.active!=='boolean'||typeof pet.dead!=='boolean'||!point(pet))fail('無效寵物');const collar=invGear.find(e=>e?.uid===pet.collarUid);if(!collar||collar.itemId!=='pet_collar'||collar.petId!==pet.id||gearCount(collar)!==1)fail('寵物項圈身分不一致');for(const k of ['hp','attack','speed'])if(!finite(pet.aptitudes?.[k])||pet.aptitudes[k]<.5||pet.aptitudes[k]>2)fail('無效寵物資質');if(!Array.isArray(pet.path)||pet.path.some(v=>!point(v))||!finite(pet.attackCooldown)||pet.attackCooldown<0)fail('無效寵物移動狀態');}
  if(s.nextId<=maxId)fail('識別碼計數器可能碰撞');
  const w=s.world;if(w.map!==p.map||!Array.isArray(w.monsters)||!Array.isArray(w.wildPets))fail('無效世界狀態');else{if(w.monsters.length>20||w.wildPets.length>10)fail('世界實體過多');const ids=new Set();for(const m of w.monsters){if(!obj(m)||!has(MONSTERS,m.type)||typeof m.name!=='string'||m.name.length<1||m.name.length>80||typeof m.id!=='string'||!/^m[0-5]$/.test(m.id)||ids.has(m.id)||!point(m)||!finite(m.hp)||!finite(m.maxHp)||m.hp<0||m.maxHp<=0||m.hp>m.maxHp||!finite(m.respawn)||m.respawn<0||!finite(m.attackCooldown)||m.attackCooldown<0||!finite(m.homeX)||!finite(m.homeY)||!Array.isArray(m.path)||m.path.some(v=>!point(v)))fail('無效怪物狀態');if(obj(m))ids.add(m.id);}const wildIds=new Set();for(const pet of w.wildPets){if(!obj(pet)||!has(PET_TYPES,pet.type)||typeof pet.name!=='string'||pet.name.length<1||pet.name.length>80||pet.id!=='wild_'+pet.type||wildIds.has(pet.id)||!point(pet))fail('無效野生寵物');if(obj(pet))wildIds.add(pet.id);}}
  const a=s.auto;if(typeof a.enabled!=='boolean'||!has(MAPS,a.selectedMap)||a.selectedMap==='town'||!['idle','hunt','heal','store','resupply','return','stopped'].includes(a.phase)||!finite(a.phaseTimer)||typeof a.reason!=='string'||!obj(a.settings))fail('無效自動狩獵狀態');else{const x=a.settings;if(!has(ITEMS,x.hpPotion)||!ITEMS[x.hpPotion].heal||!has(ITEMS,x.mpPotion)||!ITEMS[x.mpPotion].mana||!integer(x.hpTarget)||x.hpTarget>10000||!integer(x.mpTarget)||x.mpTarget>10000||!finite(x.hpThreshold)||x.hpThreshold<0||x.hpThreshold>1||!finite(x.mpThreshold)||x.mpThreshold<0||x.mpThreshold>1||typeof x.autoStore!=='boolean'||typeof x.useSkills!=='boolean')fail('無效自動補給設定');}
  for(const [key,n]of Object.entries(s.summary))if(key==='simulatedSeconds'?!finite(n)||n!==s.time:!integer(n))fail('無效統計數值');
  for(const key of ['kills','deaths','goldEarned','goldLost','xpEarned','potionsUsed','captures','petDeaths','petRevives','books','equipmentDrops','fusions','fusionSuccess'])if(!integer(s.summary[key]))fail('缺少有效累計統計：'+key);
  if(s.summary.simulatedSeconds!==s.time)fail('模擬累計時間不一致');
  const fusionError=fusionProblem(s);if(fusionError)fail(fusionError);
  if(!errors.length){const st=stats(s);if(p.hp>st.maxHp+.0001||p.mp>st.maxMp+.0001)fail('生命或魔力超過上限');if(s.pets.filter(p=>p.active).length>st.petCapacity)fail('出戰寵物超過容量');if(blocked(MAPS[p.map],p.x,p.y,0))fail('角色位置越界或在障礙內');}
  return {ok:errors.length===0,errors};
}
export function validateOrThrow(s){const check=validate(s);if(!check.ok)throw new Error(check.errors.join('；'));return s;}
