import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as data from '../../dist/full/data.mjs';
import * as rules from '../../dist/full/rules.mjs';
import * as fusionPolicy from '../../dist/full/fusion-policy.mjs';
import * as fusionInventory from '../../dist/full/fusion-inventory.mjs';
import { SKILL_BEHAVIORS } from '../../dist/full/skill-behaviors.mjs';
import { canRestoreBeforeSilver } from '../../dist/full/stage3-migration.mjs';
import { geometry, lineOfSight, distance } from '../../dist/full/world.mjs';
import { monsterDefinition } from '../../dist/full/silver-monsters.mjs';
import { createGame, command, ensureWorld } from '../../dist/full/engine.mjs';

const source = fs.readFileSync(new URL('../../dist/full/app.mjs', import.meta.url), 'utf8');
const { createGame: createStage2Game } = await import(new URL('../fixtures/stage2/full/engine.mjs', import.meta.url));
const originalApp = fs.readFileSync(new URL('../fixtures/stage2/full/app.mjs', import.meta.url), 'utf8');

// Run actual app rendering and delegated events with a minimal DOM boundary.
// Game rules/recipe functions remain real; canvas/audio/persistence are isolated.
function harness(state = createGame('knight', 'UI', undefined, 3), worldOverrides = {}) {
  const nodes = new Map(), actions = [], creates = [], restores = {silver: 0, original: 0};
  function node(selector) {
    if (!nodes.has(selector)) nodes.set(selector, {
      innerHTML: '', textContent: '', value: '', hidden: false, open: false,
      dataset: {}, listeners: {}, style: { setProperty() {} },
      addEventListener(type, fn) { (this.listeners[type] ??= []).push(fn); },
      querySelector: selector => node(selector), querySelectorAll: () => [],
      showModal() { this.open = true; }, close() { this.open = false; },
      focus() {}, setAttribute() {}, parentElement: { setAttribute() {} },
    });
    return nodes.get(selector);
  }
  const body = node('#panelBody');
  class Session {
    constructor({notify} = {}) { this.notify=notify; this.state = state; this.phase = 'ready'; this.busy = false; this.legacy = []; this.frozen = false; }
    async start() {}
    async export() { return {format:'ashen-covenant-v3',state:this.state}; }
    cancelImport() {}
    async act(action) { actions.push(structuredClone(action)); return command(this.state, action); }
    async create(...args) { creates.push(args); }
    async restoreBeforeSilver() { restores.silver++; if(this.rejectRestore||!canRestoreBeforeSilver(this.pendingImport?.state)) return false; this.state=structuredClone(this.pendingImport.state); this.pendingImport=null; this.phase='rollback-ready'; this.notify(); return true; }
    async restoreBeforeUpgrade() { restores.original++; return true; }
  }
  const noop = () => {};
  const context = {
    ...data, ...rules, ...fusionPolicy, ...fusionInventory, SKILL_BEHAVIORS, canRestoreBeforeSilver,
    GameSession: Session,
    FullRenderer: class { resize() {} load() {} notice() {} interactNPC() {} snap() {} },
    AshenAudio: class { play() {} resetObservation() {} },
    document: { querySelector: node, querySelectorAll: () => [], addEventListener: noop,
      documentElement: { style: { setProperty() {} } }, hidden: false },
    window: { addEventListener: noop }, innerHeight: 800,
    requestAnimationFrame: noop, setInterval: noop, setTimeout: noop, clearTimeout: noop,
    iconHTML: id => `<i data-icon="${id}"></i>`,
    RECIPES: [], TOTEM_EXCHANGE: { npcId: 'none', items: [] }, serviceStock: () => [],
    currentStep: () => null, canAccept: () => false, distance, geometry, lineOfSight, monsterDefinition, ...worldOverrides,
    console, URL, Blob, performance,
  };
  vm.runInNewContext(source.replace(/^import .+;\n/gm, '') + `
    globalThis.ui={showBag,showFusion,showNPC,showCreation,creationKitHTML,itemName,commitFusion,showImport,showBlocked,onSession,showExport,archiveLabel,archiveFilename,resurrectionTargets,showResurrectionTargets,showResurrectionConfirm,commitResurrection,session,
      chooseClass(id,points){chosenClass=id;allocation=points}, selectSkill(id){selectedSkill=id}};
  `, context);
  const ui = context.ui;
  return {
    ui, node, actions, creates, restores, state,
    html: () => body.innerHTML,
    async click(dataset, disabled = false) {
      const button = { dataset, disabled };
      for (const handler of body.listeners.click || []) await handler({ target: { closest: () => button } });
    },
    change(id) { for (const handler of body.listeners.change || []) handler({ target: { id } }); },
  };
}
function fixture({ itemId = 'EQ-DAGGER', plus = 0, quality = 'normal', scrollQuality = 'normal', stats = [] } = {}) {
  const s = createGame('knight', 'Fusion UI', undefined, 3);
  s.equipped = {};
  s.inventory.equipment = ['a', 'b'].map((uid, i) => ({
    uid, itemId, plus, durability: 100, identified: true, cursed: false,
    quality, ...(stats[i] ? { blessingStat: stats[i] } : {}),
  }));
  s.inventory.scrolls = [{ uid: 'scroll', itemId: fusionPolicy.fusionScrollId(
    data.ITEMS[itemId].slot === 'weapon' ? 'weapon' : 'armor',
    fusionPolicy.fusionScrollTier(plus), scrollQuality), identified: true }];
  return s;
}
const disabledCommit = html => /data-commit-fusion="[^"]+" disabled/.test(html);

test('optional missing scroll collections preserve Stage 2 bag and storage rendering', () => {
  const h = harness();
  h.ui.showBag('items'); assert.match(h.html(), /治癒藥水/);
  const bank = Object.values(data.NPCS).find(n => n.service === 'personal_storage');
  h.ui.showNPC(bank.id); assert.match(h.html(), /背包 → 倉庫/); assert.match(h.html(), /倉庫 → 背包/);
  h.ui.showBag('fusion'); assert.match(h.html(), /武器升至 \+6、防具升至 \+4/);
  assert.match(h.html(), /初階 95%、中階 90%、高階 85%/);
});

test('unidentified scroll rows hide names/icons and wire identify/drop by unique UID', async () => {
  const h = harness();
  h.state.inventory.stacks['ITEM-IDENTIFY-SCROLL'] = 2;
  h.state.inventory.scrolls = [{ uid: 'hidden', itemId: 'ITEM-FUSION-ARMOR-ADVANCED-BLESSED', identified: false }];
  h.ui.showBag('items');
  assert.match(h.html(), /未鑑定的融合卷/);
  assert.doesNotMatch(h.html(), /祝福的高階防具融合卷軸|ITEM-FUSION-ARMOR-ADVANCED-BLESSED/);
  assert.match(h.html(), /data-identify="hidden"/); assert.match(h.html(), /data-drop-gear="hidden"/);
  await h.click({ identify: 'hidden' });
  assert.equal(h.actions[0].type, 'useItem'); assert.equal(h.actions[0].uid, 'hidden');
  assert.match(h.html(), /祝福的高階防具融合卷軸/);
  await h.click({ dropGear: 'hidden' });
  assert.deepEqual(h.actions.at(-1), { type: 'drop', uid: 'hidden' });
  assert.equal(h.state.inventory.scrolls.length, 0);
  assert.equal(h.state.worlds[h.state.player.map].ground.at(-1).scroll.uid, 'hidden');
});

test('storage rows preserve scroll identity, identification and UID-directed commands', async () => {
  const h = harness();
  const bank = Object.values(data.NPCS).find(n => n.service === 'personal_storage' && n.map_id === h.state.player.map);
  h.state.player.x = bank.position_tiles[0]; h.state.player.y = bank.position_tiles[1];
  h.state.inventory.scrolls = [{ uid: 'banked', itemId: 'ITEM-FUSION-WEAPON-BASIC-NORMAL', identified: false }];
  h.ui.showNPC(bank.id);
  assert.match(h.html(), /data-bank="store" data-uid="banked"/);
  await h.click({ bank: 'store', uid: 'banked', npc: bank.id });
  assert.equal(h.state.storage.scrolls[0].uid, 'banked');
  assert.equal(h.state.storage.scrolls[0].identified, false);
  assert.match(h.html(), /data-bank="withdraw" data-uid="banked"/);
  assert.doesNotMatch(h.html(), /初階武器融合卷軸/);
  await h.click({ bank: 'withdraw', uid: 'banked', npc: bank.id });
  assert.equal(h.state.inventory.scrolls[0].uid, 'banked');
  assert.equal(h.state.storage.scrolls.length, 0);
});

test('ordinary fusion requires explicit identified scroll selection and uses policy boundary chances', () => {
  for (const [itemId, plus, expected] of [
    ['EQ-DAGGER', 5, 100], ['EQ-DAGGER', 6, 95],
    ['EQ-LEATHER-ARMOR', 3, 100], ['EQ-LEATHER-ARMOR', 4, 95],
  ]) {
    const h = harness(fixture({ itemId, plus }));
    h.ui.showFusion(['a', 'b']); assert(disabledCommit(h.html()));
    assert.match(h.html(), /請選擇一張已鑑定的融合卷軸/);
    h.ui.showFusion(['a', 'b'], { scrollUid: 'scroll' });
    assert.match(h.html(), new RegExp(`成功率 ${expected}%`)); assert(!disabledCommit(h.html()));
  }
  const h = harness(fixture()); h.state.inventory.scrolls[0].identified = false;
  h.ui.showFusion(['a', 'b'], { scrollUid: 'scroll' });
  assert(disabledCommit(h.html())); assert.doesNotMatch(h.html(), /option value="scroll"/);
});

test('blessed armor selection is explicit, limited to inputs, and reaches fusionStage', async () => {
  const h = harness(fixture({ itemId: 'EQ-LEATHER-ARMOR', quality: 'blessed', scrollQuality: 'blessed', stats: ['STR', 'WIS'] }));
  h.ui.showFusion(['a', 'b'], { scrollUid: 'scroll' });
  assert(disabledCommit(h.html())); assert.match(h.html(), /id="fusionBlessing"/);
  assert.match(h.html(), /value="STR"/); assert.match(h.html(), /value="WIS"/);
  assert.doesNotMatch(h.html(), /value="CON"/);
  h.ui.showFusion(['a', 'b'], { scrollUid: 'scroll', blessingStat: 'WIS' });
  assert(!disabledCommit(h.html())); assert.match(h.html(), /祝福結果保留 精神/);
  h.node('#fusionScroll').value = 'scroll'; h.node('#fusionBlessing').value = 'WIS';
  await h.click({ commitFusion: 'a,b' });
  assert.deepEqual(h.actions.slice(0, 2), [
    { type: 'fusionStage', uids: ['a', 'b'], scrollUid: 'scroll', blessingStat: 'WIS' },
    { type: 'fusionCommit', transactionId: '1' },
  ]);
  assert.equal(h.state.inventory.scrolls.length, 0);
  assert.equal(h.state.inventory.equipment.length, 1);
  assert.equal(h.state.inventory.equipment[0].blessingStat, 'WIS');
  assert.match(h.html(), /融合成功/);
});

test('mixed quality preview uses 50/50; material dropdown supports distinct choices and rejects duplicates', () => {
  const s = fixture({ scrollQuality: 'blessed' }); s.inventory.equipment[1].quality = 'blessed';
  s.inventory.equipment.push({ ...s.inventory.equipment[0], uid: 'c' });
  const h = harness(s); h.ui.showFusion(['a', 'b'], { scrollUid: 'scroll' });
  assert.match(h.html(), /成功後品質：50%普通／50%祝福/);
  assert.match(h.html(), /value="c"/);
  h.node('#fusionFirst').value = 'a'; h.node('#fusionSecond').value = 'a'; h.node('#fusionScroll').value = 'scroll';
  h.change('fusionSecond'); assert(disabledCommit(h.html())); assert.match(h.html(), /兩件不同的裝備/);
});

test('stale scroll removal and repeated commit cannot dispatch an extra transaction', async () => {
  const h = harness(fixture());
  h.ui.showFusion(['a', 'b'], { scrollUid: 'scroll' }); h.node('#fusionScroll').value = 'scroll';
  await Promise.all([h.click({ commitFusion: 'a,b' }), h.click({ commitFusion: 'a,b' })]);
  assert.equal(h.actions.filter(a => a.type === 'fusionStage').length, 1);
  assert.equal(h.actions.filter(a => a.type === 'fusionCommit').length, 1);
  const stale = harness(fixture()); stale.ui.showFusion(['a', 'b'], { scrollUid: 'scroll' });
  stale.node('#fusionScroll').value = 'scroll'; stale.state.inventory.scrolls = [];
  await stale.click({ commitFusion: 'a,b' }); assert.equal(stale.actions.length, 0);
});

test('magic fusion displays required automatic first legal scroll and disables absent scroll', () => {
  const h = harness(fixture()); h.ui.selectSkill('SKILL-G10-01');
  h.ui.showFusion(['a', 'b']); assert(!disabledCommit(h.html()));
  assert.match(h.html(), /依背包順序自動使用第一張合法卷軸/);
  assert.match(h.html(), /初階武器融合卷軸/); assert.doesNotMatch(h.html(), /id="fusionScroll"/);
  h.state.inventory.scrolls = []; h.ui.showFusion(['a', 'b']); assert(disabledCommit(h.html()));
});

test('creation review lists the exact kit, no free skills, and low STR/CON mage recovery warning', async () => {
  const h = harness();
  h.ui.chooseClass('mage', { INT: 6, WIS: 6, DEX: 4 });
  const html = h.ui.creationKitHTML('mage', { INT: 6, WIS: 6, DEX: 4 });
  for (const text of ['匕首 +0 × 1', '皮甲 +0 × 1', '治癒藥水 × 100', '藍色藥水 × 10',
    '瞬間移動卷軸 × 100', '返回卷軸 × 20', '自我加速藥水 × 30', '不額外贈送技能', '640 / 1260', '50.8%', '自然生命與魔力恢復會停止']) assert(html.includes(text), text);
  h.node('#newName').value = 'Test'; await h.click({ action: 'create' });
  assert.equal(h.creates.length, 0); assert.match(h.html(), /確認建立新旅程/); assert.match(h.html(), /640 \/ 1260/);
  await h.click({ action: 'confirmNew' }); assert.equal(h.creates.length, 1);
});

test('existing legacy and blocked recovery helpers remain byte-for-byte unchanged', () => {
  const functionLine = (text, name) => text.split('\n').find(line => new RegExp(`^(?:async )?function ${name}\\(`).test(line));
  for (const name of ['showLegacy', 'showBlocked']) {
    assert.equal(functionLine(source, name), functionLine(originalApp, name), `${name} recovery contract changed`);
  }
});


function importSnapshot(h, state) {
  h.ui.session.pendingImport = {state, resolvedAt: 0, exportedAt: 'Stage 2 fixture'};
  h.ui.showImport();
}
function beforeSilver() {
  const state = createStage2Game('knight', 'Stage 2', undefined, 11);
  const contractId = Object.keys(data.ITEMS).find(id => id.startsWith('ITEM-FORM-CONTRACT-'));
  state.inventory.stacks[contractId] = 1;
  assert(state.formProgress);
  assert(canRestoreBeforeSilver(state));
  return state;
}
test('Stage 2 restore is separate, available with form ledger/contracts, and confirmation is read-only', async () => {
  const h = harness(), old = beforeSilver(); importSnapshot(h, old);
  assert.match(h.html(), /恢復升級前 Stage2 存檔並停止/);
  assert.match(h.html(), /舊程式可能忽略新版融合卷/);
  assert.doesNotMatch(h.html(), /data-action="prepareDowngrade"/);
  await h.click({action:'prepareSilverRestore'});
  assert.equal(h.restores.silver, 0); assert.equal(h.restores.original, 0);
  assert.match(h.html(), /不計算備份至今的離線時間/);
  assert.match(h.html(), /不要重新整理目前的新程式/);
  await h.click({action:'cancelSilverRestore'});
  assert.match(h.html(), /確認匯入旅人/); assert.equal(h.restores.silver, 0);
});

test('new fields/items fail Stage 2 restore preview and stale confirmation safely', async () => {
  for(const mutate of [
    state=>{state.monsterRevision=1}, state=>{state.inventory.scrolls=[]},
    state=>{state.worlds[state.player.map].campRevision=1},
    state=>{state.inventory.stacks['ITEM-STRONG-GREEN-POTION']=1},
  ]) {
    const h=harness(), old=beforeSilver(); mutate(old); importSnapshot(h,old);
    assert.doesNotMatch(h.html(), /data-action="prepareSilverRestore"/);
    assert.match(h.html(), /未通過升級前 Stage2 檢查/);
    await h.click({action:'confirmSilverRestore'}); assert.equal(h.restores.silver,0);
  }
  const h=harness(), old=beforeSilver(); importSnapshot(h,old);
  await h.click({action:'prepareSilverRestore'}); old.inventory.scrolls=[];
  await h.click({action:'confirmSilverRestore'}); assert.equal(h.restores.silver,0);
});

test('successful Stage 2 restore calls only its dedicated method and keeps a stopped screen', async () => {
  const h=harness(), old=beforeSilver(), expected=structuredClone(old); importSnapshot(h,old);
  await h.click({action:'prepareSilverRestore'}); await h.click({action:'confirmSilverRestore'});
  assert.equal(h.restores.silver,1); assert.equal(h.restores.original,0); assert.equal(h.actions.length,0);
  assert.equal(h.ui.session.phase,'rollback-ready'); assert.deepEqual(h.ui.session.state,expected);
  assert.match(h.html(),/Stage2 存檔已恢復，遊戲已停止/);
  assert.match(h.html(),/換回對應的 Stage2 程式/);
  assert.match(h.html(),/不要重新整理目前的新程式/);
  h.ui.onSession(); assert.match(h.html(),/Stage2 存檔已恢復/);
  await h.click({action:'close'}); assert.match(h.html(),/Stage2 存檔已恢復/);
  assert.equal(h.node('#panel').open,true);
});

test('failed Stage 2 restore never reports success or changes the active state', async () => {
  const h=harness(), current=h.ui.session.state; importSnapshot(h,beforeSilver());
  h.ui.session.rejectRestore=true; await h.click({action:'prepareSilverRestore'});
  await h.click({action:'confirmSilverRestore'});
  assert.equal(h.restores.silver,1); assert.equal(h.ui.session.state,current);
  assert.doesNotMatch(h.html(),/Stage2 存檔已恢復/);
  assert.match(h.node('#toast').textContent,/未恢復/);
});

test('original pre-form restore handler and existing preview are preserved beside the new route', async () => {
  const segment=text=>text.slice(text.indexOf("case'prepareDowngrade':"),text.indexOf("case'confirmImport':"));
  assert.equal(segment(source),segment(originalApp));
  const functionLine=(text,name)=>text.split('\n').find(line=>line.startsWith('function '+name+'('));
  const normalizedImport=functionLine(source,'showImport').replace('${silverRestorePreview(chosen.state)}','').replace('<h3>圖鑑升級前：階段1／122版程式</h3>','').replace('chosen.state.formProgress===undefined&&canRestoreBeforeSilver(chosen.state)','chosen.state.formProgress===undefined');
  assert.equal(normalizedImport,functionLine(originalApp,'showImport'));
  const normalizedSession=functionLine(source,'onSession').replace("if(phase==='rollback-ready'&&restoringSilver)showSilverRestored();else ",'');
  assert.equal(normalizedSession,functionLine(originalApp,'onSession'));
  const h=harness(), old=createStage2Game('knight','Pre-form',undefined,11); delete old.formProgress;
  importSnapshot(h,old); assert.match(h.html(),/data-action="prepareDowngrade"/);
  assert.match(h.html(),/data-action="prepareSilverRestore"/);
  await h.click({action:'confirmDowngrade'}); assert.equal(h.restores.original,1); assert.equal(h.restores.silver,0);
});


test('pre-form restore button cannot offer a bypass for new fields or new stack items', () => {
  for (const mutate of [state=>{state.inventory.scrolls=[]},state=>{state.inventory.stacks['ITEM-STRONG-GREEN-POTION']=1}]) {
    const h=harness(), old=createStage2Game('knight','Unsafe pre-form',undefined,11);
    delete old.formProgress; mutate(old); importSnapshot(h,old);
    assert.doesNotMatch(h.html(),/data-action="prepareDowngrade"/);
    assert.doesNotMatch(h.html(),/data-action="prepareSilverRestore"/);
  }
});


test('current export identifies the undelivered Stage3 reconstruction with revision and time', async () => {
  const h=harness(); h.ui.session.revision=73; h.ui.session.stateWallAt=1791648000123;
  await h.ui.showExport();
  assert.match(h.html(),/download="灰燼誓約-Stage3候選重建-未交付-修訂73-1791648000123.json"/);
  assert.doesNotMatch(h.html(),/目前階段2/);
  const exportLine=text=>text.split('\n').find(line=>line.startsWith('async function showExport('));
  const exportBody=line=>line.slice(line.indexOf('{try{'));
  assert.equal(exportBody(exportLine(source)),exportBody(exportLine(originalApp)),'Only default export labeling changes');
});

test('archive names prioritize genuine pre-form snapshots and distinguish restorable Stage2 from Stage3', () => {
  const h=harness(), makeRow=state=>({stateJSON:JSON.stringify(state),revision:42,resolvedAt:1791644000123});
  const preForm=createStage2Game('knight','Pre-form',undefined,11); delete preForm.formProgress;
  const row=makeRow(preForm);
  assert.match(h.ui.archiveLabel(row),/^圖鑑升級前/);
  assert.equal(h.ui.archiveFilename(row),'灰燼誓約-圖鑑升級前-修訂42-1791644000123.json');
  const stage2=makeRow(beforeSilver());
  assert.equal(h.ui.archiveLabel(stage2),'怪物升級前，可恢復Stage2');
  assert.equal(h.ui.archiveFilename(stage2),'灰燼誓約-怪物升級前-可恢復Stage2-修訂42-1791644000123.json');
  for(const mutate of [state=>{state.inventory.scrolls=[]},state=>{state.monsterRevision=1},state=>{state.worlds[state.player.map].campRevision=1},state=>{state.inventory.stacks['ITEM-STRONG-GREEN-POTION']=1}]) {
    const state=createStage2Game('knight','New-data',undefined,11); delete state.formProgress; mutate(state);
    const upgraded=makeRow(state);
    assert.match(h.ui.archiveLabel(upgraded),/不可恢復Stage2/);
    assert.doesNotMatch(h.ui.archiveLabel(upgraded),/^圖鑑升級前|^怪物升級前/);
    assert.equal(h.ui.archiveFilename(upgraded),'灰燼誓約-Stage3候選重建-未交付-修訂42-1791644000123.json');
  }
  const invalid={...row,stateJSON:'not json'};
  assert.equal(h.ui.archiveLabel(invalid),'無法判定版本的原始快照');
  assert.equal(h.ui.archiveFilename(invalid),'灰燼誓約-版本未確認-修訂42-1791644000123.json');
});


function reviveFixture(){
 const state=createGame('knight','Revive UI',undefined,17);state.player.map='MAP-REG-SILVER';
 const world=ensureWorld(state,state.player.map),monster=world.monsters.find(m=>m.type==='MON-GOBLIN');
 assert(monster);Object.assign(state.player,{x:monster.x,y:monster.y});
 Object.assign(monster,{hp:0,mp:0,lootDone:true,deadAt:state.clockMs,respawnAt:state.clockMs+60000});
 state.inventory.stacks['ITEM-RESURRECTION-SCROLL']=3;
 const pet={id:'pet-ui',sourceId:'former-wild',collarUid:'collar-ui',collarInBag:true,type:'PET-WOLF',name:'自己的死寵',level:1,
  x:state.player.x,y:state.player.y,map:state.player.map,hp:0,mp:0,food:100,foodAt:60000,mpRegenAt:8000,magicAt:0,xp:'0',
  active:true,dead:true,aptitudes:{hp:100,attack:100,defense:100,speed:100},effects:[],attackAt:0,moveAt:0,path:[],mode:'defend'};
 state.pets.push(pet);return{state,world,monster,pet};
}

test('resurrection item opens a corpse-only picker with owned pets and qualified nearby wild monsters',async()=>{
 const{state,world,monster,pet}=reviveFixture();
 const blocked=[{id:'living',hp:1},{id:'captured',captured:true},{id:'summoned',summoned:true},{id:'consumed',corpseConsumed:true},{id:'already-revived',revivedThisGeneration:true},{id:'far',x:monster.x+4},{id:'legacy-profile',type:'MON-ORC',definitionProfile:undefined}];
 world.monsters.push(...blocked.map(patch=>({...structuredClone(monster),...patch})));
 state.pets.push({...structuredClone(pet),id:'living-pet',dead:false,hp:1},{...structuredClone(pet),id:'other-map-pet',map:'MAP-TOWN-SILVER'});
 const h=harness(state);h.ui.showBag('items');
 assert.match(h.html(),/data-use="ITEM-RESURRECTION-SCROLL"/);
 await h.click({use:'ITEM-RESURRECTION-SCROLL'});assert.equal(h.actions.length,0);
 const actual=h.ui.resurrectionTargets().map(target=>target.kind+':'+target.actor.id);
 assert.deepEqual(Array.from(actual),['pet:'+pet.id,'monster:'+monster.id]);
 assert.match(h.html(),/自己的死寵/);assert.match(h.html(),/野怪屍體/);
 assert.match(h.html(),/每次自然重生後只能復活一次/);
 assert.doesNotMatch(h.html(),/data-resurrection-target="living"/);
 const occluded=harness(state,{lineOfSight:()=>false});
 assert.equal(occluded.ui.resurrectionTargets().length,0);
});

test('wild corpse confirmation explains danger and once-only/no-reward rules before sending targetId',async()=>{
 const{state,monster}=reviveFixture(),h=harness(state),hostility=monsterDefinition(monster).aggro;
 await h.click({resurrectionTarget:monster.id,kind:'monster'});
 assert.equal(h.actions.length,0);assert.match(h.html(),/主動怪可能立即攻擊/);
 assert.match(h.html(),/恢復30%生命（至少1點），魔力為0/);
 assert.match(h.html(),/每次自然重生後只可復活一次/);
 assert.match(h.html(),/不會得到經驗、金幣、掉落、任務擊殺或圖鑑進度/);
 await h.click({confirmResurrection:monster.id,kind:'monster'});
 assert.deepEqual(h.actions,[{type:'useItem',itemId:'ITEM-RESURRECTION-SCROLL',targetId:monster.id}]);
 assert.equal(monster.hp,Math.max(1,Math.floor(monster.maxHp*.3)));assert.equal(monster.mp,0);
 assert.equal(monster.revivedThisGeneration,true);assert.equal(monsterDefinition(monster).aggro,hostility);
 assert.equal(state.inventory.stacks['ITEM-RESURRECTION-SCROLL'],2);
 assert.equal(h.node('#panel').open,false);assert.match(h.node('#toast').textContent,/保留敵性/);
 assert(!h.ui.resurrectionTargets().some(target=>target.actor.id===monster.id));
});

test('dead-pet button uses the same confirmation and preserves the existing petId command',async()=>{
 const{state,pet}=reviveFixture(),h=harness(state);
 await h.click({revive:pet.id});assert.equal(h.actions.length,0);
 assert.match(h.html(),/確認復活寵物/);assert.doesNotMatch(h.html(),/主動怪可能立即攻擊/);
 await h.click({confirmResurrection:pet.id,kind:'pet'});
 assert.deepEqual(h.actions,[{type:'useItem',itemId:'ITEM-RESURRECTION-SCROLL',petId:pet.id}]);
 assert.equal(pet.dead,false);assert.equal(pet.hp,Math.max(1,Math.floor(rules.petStats(pet).maxHp*.3)));
 assert.equal(pet.mp,0);assert.equal(state.inventory.stacks['ITEM-RESURRECTION-SCROLL'],2);
});

test('resurrection cancellation, stale targets and repeated clicks do not spend an extra scroll',async()=>{
 const first=reviveFixture(),h=harness(first.state);
 await h.click({resurrectionTarget:first.monster.id,kind:'monster'});
 await h.click({action:'resurrectionTargets'});assert.equal(h.actions.length,0);assert.match(h.html(),/選擇復活對象/);
 await h.click({resurrectionTarget:first.monster.id,kind:'monster'});first.monster.hp=1;
 await h.click({confirmResurrection:first.monster.id,kind:'monster'});
 assert.equal(h.actions.length,0);assert.equal(first.state.inventory.stacks['ITEM-RESURRECTION-SCROLL'],3);
 const second=reviveFixture(),double=harness(second.state);
 await double.click({resurrectionTarget:second.monster.id,kind:'monster'});
 await Promise.all([double.click({confirmResurrection:second.monster.id,kind:'monster'}),double.click({confirmResurrection:second.monster.id,kind:'monster'})]);
 assert.equal(double.actions.length,1);assert.equal(second.state.inventory.stacks['ITEM-RESURRECTION-SCROLL'],2);
});

test('resurrection range/LOS changes and no-scroll state disable or reject the action',async()=>{
 const{state,monster}=reviveFixture(),h=harness(state);
 await h.click({resurrectionTarget:monster.id,kind:'monster'});state.player.x+=4;
 await h.click({confirmResurrection:monster.id,kind:'monster'});assert.equal(h.actions.length,0);
 state.player.x-=4;state.inventory.stacks['ITEM-RESURRECTION-SCROLL']=0;
 h.ui.showResurrectionTargets();assert.match(h.html(),/data-kind="monster" disabled/);
 await h.click({confirmResurrection:monster.id,kind:'monster'});assert.equal(h.actions.length,0);
 assert.match(h.node('#toast').textContent,/沒有復活卷軸/);
});
