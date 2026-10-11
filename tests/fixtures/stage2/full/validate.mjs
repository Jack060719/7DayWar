import {validateFormProgress} from './form-progress.mjs';
import {PORTALS} from './portals.mjs';
import {ROOM_MAPS} from './dungeon-rooms.mjs';
// External recovery contribution. Pure, nonmutating schema-3 validation.
import {CONTENT,ATTRS,CLASSES,ITEMS,MAPS,MONSTERS,POPULATIONS,SKILLS,PETS,QUESTS,has} from './data.mjs';
import {stats,xpAtLevel,xpNeeded} from './rules.mjs';
import {geometry,walkable} from './world.mjs';
import {structureCell,LAYOUT_REVISION,STRUCTURES} from './structures.mjs';
export function validate(s){
 const errors=[],bad=m=>{if(errors.length<100)errors.push(m)},int=(n,min=0)=>Number.isSafeInteger(n)&&n>=min,dec=n=>typeof n==='string'&&/^(0|[1-9]\d*)$/.test(n),check=(v,m)=>{if(!v)bad(m)},seen=new Set();
 function deep(v){if(typeof v==='number')check(Number.isFinite(v),'非有限數值');if(!v||typeof v!=='object')return;check(!seen.has(v),'循環或共用物件');if(seen.has(v))return;seen.add(v);for(const k of Object.keys(v)){check(!['__proto__','prototype','constructor'].includes(k),'不安全欄位');deep(v[k])}seen.delete(v)}
 try{
 deep(s);for(const error of validateFormProgress(s).errors)bad(error);check(s.layoutRevision===undefined||int(s.layoutRevision,1)&&s.layoutRevision<=LAYOUT_REVISION,'地形版本不符');check(s.version===3&&s.contentVersion===CONTENT.version,'存檔版本不符');
 const p=s.player,c=CLASSES[p.classId];check(!!c&&has(MAPS,p.map)&&has(MAPS,p.home),'角色或地圖參照無效');
 const oldLayout=(s.layoutRevision||0)<LAYOUT_REVISION,changedMaps=new Set([...STRUCTURES.map(b=>b.mapId),...ROOM_MAPS,...PORTALS.map(b=>b.mapId)]);function position(a,map,label){const m=MAPS[map];check(!!m&&!!a&&int(a.x)&&int(a.y)&&a.x<m.geometry.width_tiles&&a.y<m.geometry.height_tiles,label+'座標');if(m&&a&&map===p.map&&!(oldLayout&&changedMaps.has(map)))check(walkable(geometry(map),a.x,a.y),label+'位於不可通行處')}position(p,p.map,'角色');
 for(const k of ['nextId','elapsedMs'])check(dec(s[k]),'整數帳本 '+k);check(dec(p.totalXP),'經驗帳本');check(int(s.clockMs)&&int(s.rng,1)&&s.rng<=4294967295,'時鐘或隨機狀態');check(Number.isFinite(s.fractionMs)&&s.fractionMs>=0&&s.fractionMs<1,'小數時間');
 for(const k of ['hp','mp','gold','x','y'])check(int(p[k]),'角色整數 '+k);check(int(p.level,1)&&Array.isArray(p.growth)&&p.level<=p.growth.length+1,'等級成長不符');check(int(p.food)&&p.food<=100,'飽食度');
 if(c){let allocated=0;for(const a of ATTRS){const base=c.base_stats[c.stat_order.indexOf(a)],v=p.creationStats[a];check(int(v,base)&&v<=c.creation_caps[a],'創角屬性 '+a);allocated+=v-base}check(allocated===c.creation_bonus,'創角點數不符')}
 const levels=new Set();for(let i=0;i<p.growth.length;i++){const h=p.growth[i];check(h.level===i+2&&!levels.has(h.level)&&int(h.hp,1)&&int(h.mp),'成長紀錄');levels.add(h.level);let n=0;for(const[a,v]of Object.entries(h.allocated||{})){check(ATTRS.includes(a)&&int(v),'永久配點');n+=v}check(n<=(h.level>=51?1:0),'永久配點超額')}
 if(dec(p.totalXP)&&int(p.level,1)&&p.level<=p.growth.length+1){const xp=BigInt(p.totalXP),start=xpAtLevel(p.level);check(xp>=start&&xp<start+xpNeeded(p.level),'經驗與等級不符')}
 const ids=new Set();let maxId=0n;function identity(id){check(typeof id==='string'&&!!id&&!ids.has(id),'重複或無效身分 '+id);ids.add(id);const m=/^(?:e|m|g|pet|collar|summon|charm|hazard|memory)(\d+)$/.exec(id);check(!!m&&BigInt(m?.[1]||0)>0n,'實例身分格式');if(m)maxId=maxId>BigInt(m[1])?maxId:BigInt(m[1])}
 function equipment(e){identity(e.uid);check(!!ITEMS[e.itemId]?.slot&&int(e.plus)&&int(e.durability)&&e.durability<=(ITEMS[e.itemId]?.durability_max||100)&&typeof e.identified==='boolean'&&typeof e.cursed==='boolean','裝備資料')}
 for(const bag of [s.inventory,s.storage]){check(Array.isArray(bag.equipment),'裝備列表');for(const e of bag.equipment)equipment(e);for(const[id,n]of Object.entries(bag.stacks))check(has(ITEMS,id)&&id!=='ITEM-PET-COLLAR'&&!ITEMS[id].slot&&id!=='ITEM-PET-COLLAR'&&int(n,1),'物品數量或類型')}
 const worn=new Set();for(const[slot,id]of Object.entries(s.equipped)){const e=s.inventory.equipment.find(e=>e.uid===id);check(!!e&&(ITEMS[e.itemId].slot===slot||ITEMS[e.itemId].slot==='ring'&&['ring1','ring2'].includes(slot))&&!worn.has(id),'穿戴欄位或重複參照');worn.add(id)}
 check(new Set(p.skills).size===p.skills.length,'重複技能');for(const id of p.skills)check(has(SKILLS,id),'技能參照');for(const id of p.hotbar||[])if(id!=null)check(p.skills.includes(id),'快捷技能');
 for(const pet of s.pets){for(const key of ['magicAt','mpRegenAt'])if(pet[key]!==undefined)check(int(pet[key]),'寵物計時 '+key);position(pet,pet.map,'寵物');identity(pet.id);identity(pet.collarUid);check(pet.collarInBag===true,'項圈唯一背包紀錄');check(pet.collarInBag===true&&has(PETS,pet.type)&&has(MAPS,pet.map)&&int(pet.level,1)&&dec(pet.xp)&&int(pet.hp)&&int(pet.mp)&&typeof pet.dead==='boolean'&&typeof pet.active==='boolean','寵物資料');for(const a of ['hp','attack','defense','speed'])check(int(pet.aptitudes[a],a==='speed'?90:80)&&pet.aptitudes[a]<=(a==='speed'?110:120),'寵物資質')}
 check(new Set(s.pets.map(p=>p.sourceId)).size===s.pets.length,'重複捕獲野生身分');for(const a of s.summons){position(a,a.map,'召喚物');identity(a.id);check((has(MONSTERS,a.type)||CONTENT.visual_forms.some(f=>f.id===a.type))&&has(MAPS,a.map)&&int(a.hp)&&int(a.level,1),'召喚物資料')}
 for(const[id,w]of Object.entries(s.worlds)){check(has(MAPS,id)&&w.mapId===id,'世界地圖');for(const m of w.monsters){position(m,id,'怪物');position(m.origin,id,'怪物原點');identity(m.id);check(has(MONSTERS,m.type)&&has(POPULATIONS,m.populationId)&&int(m.hp)&&int(m.level,1),'怪物資料')}for(const d of w.ground){position(d,id,'地面物品');identity(d.id);if(d.gear)equipment(d.gear);else check(has(ITEMS,d.itemId)&&int(d.count,1),'地面物品')}for(const h of w.hazards||[])if(h.id)identity(h.id)}
 for(const m of p.memories||[]){identity(m.id);check(has(MAPS,m.mapId)&&int(m.x)&&int(m.y)&&m.x<MAPS[m.mapId].geometry.width_tiles&&m.y<MAPS[m.mapId].geometry.height_tiles&&(walkable(geometry(m.mapId),m.x,m.y)||(s.layoutRevision||0)<LAYOUT_REVISION&&(structureCell(geometry(m.mapId),m.x,m.y)||ROOM_MAPS.has(m.mapId))),'記憶座標')}
 if(dec(s.nextId))check(BigInt(s.nextId)>maxId,'下個身分序號重複');
 for(const[id,q]of Object.entries(s.quests.active)){check(has(QUESTS,id),'任務參照');check(int(q.step)&&int(q.count)&&Array.isArray(q.landmarks),'任務進度');if(QUESTS[id])check(q.step<QUESTS[id].steps.length,'任務步驟越界')}
 check(new Set(s.quests.completed).size===s.quests.completed.length,'重複完成任務');for(const id of s.quests.completed)check(has(QUESTS,id)&&!Object.hasOwn(s.quests.active,id),'完成任務參照');
 if(s.auto.settings.autoHaste!==undefined)check(typeof s.auto.settings.autoHaste==='boolean','自動綠水設定');
 check(typeof s.auto.enabled==='boolean'&&has(MAPS,s.auto.targetMap),'自動狩獵設定');for(const id of s.auto.settings.skillPriority)check(has(SKILLS,id),'自動技能參照');for(const bag of [s.auto.settings.stock,s.auto.settings.minimumStock])for(const[id,n]of Object.entries(bag))check(has(ITEMS,id)&&int(n),'自動補給設定');
 check(!!s.worlds[p.map]&&p.x<MAPS[p.map].geometry.width_tiles&&p.y<MAPS[p.map].geometry.height_tiles,'目前地圖或座標');const st=stats(s);check(p.hp<=st.maxHp&&p.mp<=st.maxMp,'生命魔力上限');for(const v of Object.values(s.summary))check(dec(v),'統計帳本');
 const f=s.fusion;check(dec(f.next)&&dec(f.applied)&&Array.isArray(f.receipts),'合成帳本');if(dec(f.next)&&dec(f.applied)){check(BigInt(f.next)===BigInt(f.applied)+(f.pending?2n:1n),'合成序號');if(f.pending){const t=f.pending;check(dec(t.id)&&BigInt(t.id)===BigInt(f.applied)+1n&&typeof t.success==='boolean'&&int(t.plus),'待決合成紀錄');check(Array.isArray(t.uids)&&t.uids.length===2&&t.uids[0]!==t.uids[1],'合成材料身分');for(const id of t.uids){const e=s.inventory.equipment.find(e=>e.uid===id);check(!!e&&e.itemId===t.itemId&&e.plus===t.plus&&ITEMS[e.itemId].enchantable&&e.identified&&!e.cursed&&!worn.has(id),'待決合成材料不符')}}}
 const receiptIds=new Set;for(const r of f.receipts){check(dec(r.id)&&!receiptIds.has(r.id)&&BigInt(r.id)<=BigInt(f.applied)&&has(ITEMS,r.itemId)&&int(r.plus)&&typeof r.success==='boolean'&&Array.isArray(r.uids)&&r.uids.length===2&&r.uids[0]!==r.uids[1],'融合收據無效');receiptIds.add(r.id)}
 }catch{bad('存檔結構不完整')}
 return{ok:errors.length===0,errors};
}
