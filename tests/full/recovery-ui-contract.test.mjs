import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as forms from '../../dist/full/form-progress.mjs';
import * as data from '../../dist/full/data.mjs';
import * as rules from '../../dist/full/rules.mjs';
import * as fusionPolicy from '../../dist/full/fusion-policy.mjs';
import * as fusionInventory from '../../dist/full/fusion-inventory.mjs';
import {tradeableItem} from '../../dist/full/trade.mjs';
import {petDetailsHTML,legacyPreviewHTML,petNatureText,PET_EFFECT_LABELS} from '../../dist/full/pet-presentation.mjs';
import {previewLegacyPet,breedingError,petStatsV4,petBagWeight,petAttributes} from '../../dist/full/pets-v4.mjs';
import * as touchControls from '../../dist/full/touch-controls.mjs';
import * as itemPresentation from '../../dist/full/item-presentation.mjs';
import {ENCHANT_STONES,ENCHANT_NAMES,ENCHANT_COLORS,enchantInfo,enchantableTrack} from '../../dist/full/enchantment-policy.mjs';
import {enchantPreview} from '../../dist/full/enchantment.mjs';
import { masteryInfo, skillBehavior } from '../../dist/full/skill-mastery.mjs';
import { learningLocation } from '../../dist/full/skill-learning.mjs';
import { SKILL_BEHAVIORS } from '../../dist/full/skill-behaviors.mjs';
import { canRestoreBeforeSilver } from '../../dist/full/stage3-migration.mjs';
import { geometry, lineOfSight, distance, worldRoute } from '../../dist/full/world.mjs';
import { monsterDefinition } from '../../dist/full/silver-monsters.mjs';
import { createGame, command, ensureWorld } from '../../dist/full/engine.mjs';

const source = fs.readFileSync(new URL('../../dist/full/app.mjs', import.meta.url), 'utf8');
const { createGame: createStage2Game } = await import(new URL('../fixtures/stage2/full/engine.mjs', import.meta.url));
const originalApp = fs.readFileSync(new URL('../fixtures/stage2/full/app.mjs', import.meta.url), 'utf8');

// Run actual app rendering and delegated events with a minimal DOM boundary.
// Game rules/recipe functions remain real; canvas/audio/persistence are isolated.
function harness(state = createGame('knight', 'UI', undefined, 3), worldOverrides = {}) {
  const nodes = new Map(), actions = [], creates = [], downloads = [], restores = {silver: 0, original: 0, recovery: 0, resume: 0, raw: 0, inspect: 0, roomResume: 0};
  function node(selector) {
    if (!nodes.has(selector)) nodes.set(selector, {
      innerHTML: '', textContent: '', value: '', hidden: false, open: false,
      dataset: {}, listeners: {}, classList:{add(){},remove(){}}, style: { setProperty() {} },
      addEventListener(type, fn) { (this.listeners[type] ??= []).push(fn); },
      querySelector: selector => node(selector), querySelectorAll: () => [],
      showModal() { this.open = true; }, close() { this.open = false; },
      focus() {}, setAttribute() {}, parentElement: { setAttribute() {} },
    });
    return nodes.get(selector);
  }
  const body = node('#panelBody');
  class Session {
    constructor({notify} = {}) { this.notify=notify; this.state = state; this.phase = 'ready'; this.busy = false; this.legacy = []; this.frozen = false; this.session={owned:true}; }
    async start() {}
    async export() { return this.state?{format:'ashen-covenant-v3',state:this.state}:null; }
    async exportRawSave() { restores.raw++; return this.raw??null; }
    async inspectRecovery() { restores.inspect++; this.pendingRecovery=null; return this.recovery; }
    selectRecovery(key) { this.pendingRecovery=this.recovery?.candidates.find(row=>row.key===key&&row.valid)||null; return this.pendingRecovery; }
    async confirmRecovery() { if(this.phase!=='blocked'||this.busy||!this.pendingRecovery||!this.session.owned||this.rejectRecovery)return false; this.busy=true; restores.recovery++; await Promise.resolve(); this.state=this.restoreState||createGame(); this.pendingRecovery=null; this.phase='recovery-ready'; this.busy=false; this.notify(); return true; }
    async resumeRecovery() { if(this.phase!=='recovery-ready'||!this.session.owned)return false; restores.resume++; this.phase='ready'; this.notify(); return true; }
    async resumeRoomRecovery() { if(this.phase!=='room-recovered'||!this.session.owned)return false; restores.roomResume++; this.phase='ready'; this.notify(); return true; }
    cancelImport() {}
    async act(action) { actions.push(structuredClone(action)); return command(this.state, action); }
    listCharacters(){return this.characters||[{id:'local-1',name:this.state.player.name,classId:this.state.player.classId,level:this.state.player.level,map:this.state.player.map,hp:this.state.player.hp,maxHp:rules.stats(this.state).maxHp,autoEnabled:this.state.player.auto?.enabled||false,selected:true}]}
    async selectCharacter(id){this.selectedByUI=id;return{ok:true}}
    async configureParty(value){this.partyByUI=value;this.roster={party:value};return{ok:true}}
    async create(...args) { creates.push(args);return{ok:true}; }
    async restoreBeforeSilver() { restores.silver++; if(this.rejectRestore||!canRestoreBeforeSilver(this.pendingImport?.state)) return false; this.state=structuredClone(this.pendingImport.state); this.pendingImport=null; this.phase='rollback-ready'; this.notify(); return true; }
    async restoreBeforeUpgrade() { restores.original++; return true; }
  }
  const noop = () => {};
  const context = {
    ...data, ...rules, ...forms, ...touchControls, ...fusionPolicy, ...fusionInventory, ...itemPresentation, tradeableItem,petDetailsHTML,legacyPreviewHTML,petNatureText,PET_EFFECT_LABELS,previewLegacyPet,breedingError,petStatsV4,petBagWeight,petAttributes, ENCHANT_STONES,ENCHANT_NAMES,ENCHANT_COLORS,enchantInfo,enchantableTrack,enchantPreview, masteryInfo, skillBehavior, learningLocation, SKILL_BEHAVIORS, canRestoreBeforeSilver,
    GameSession: Session,
    FullRenderer: class { resize() {} load() {} notice() {} interactNPC() {} snap() {} },
    AshenAudio: class { play() {} resetObservation() {} },
    document: { querySelector: node, querySelectorAll: () => [], addEventListener: noop,
      documentElement: { style: { setProperty() {} } }, hidden: false },
    window: { addEventListener: noop }, innerHeight: 800,
    requestAnimationFrame: noop, setInterval: noop, setTimeout: noop, clearTimeout: noop,
    iconHTML: id => `<i data-icon="${id}"></i>`,
    RECIPES: [], TOTEM_EXCHANGE: { npcId: 'none', items: [] }, serviceStock: () => [],
    currentStep: () => null, canAccept: () => false, distance, geometry, lineOfSight, worldRoute, monsterDefinition, ...worldOverrides,
    console, URL: class extends URL {static createObjectURL(blob){downloads.push(blob);return 'blob:synthetic-'+downloads.length}static revokeObjectURL(){}}, Blob, performance,
  };
  vm.runInNewContext(source.replace(/^import .+;\n/gm, '') + `
    globalThis.ui={formChoices,wildPetTraitsHTML,showReport,showPets,showPetUpgrade,previewPetUpgrade,commitPetUpgrade,showPetBreeding,commitPetBreeding,showPetBag,showTrade,submitTrade,showPolymorphTargets,showPolymorphForms,showPolymorphInvitations,enchantmentHTML,showEnchant,commitEnchant,showAuto,saveAuto,showCharacters,selectCharacter,saveParty,companionPlayers,showSkills,showLearn,commitLearn,showRoom,castSkill,showBag,showFusion,showNPC,showCreation,creationKitHTML,itemName,autoStateLabel,commitFusion,showImport,showBlocked,onSession,showExport,archiveLabel,archiveFilename,resurrectionTargets,showResurrectionTargets,showResurrectionConfirm,commitResurrection,session,
      setRoom(value){room=value}, chooseClass(id,points){chosenClass=id;allocation=points}, selectSkill(id){selectedSkill=id}};
  `, context);
  const ui = context.ui;
  return {
    ui, node, actions, creates, restores, state, downloads,
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
  for (const text of ['+0 匕首 × 1', '+0 皮甲 × 1', '治癒藥水 × 100', '藍色藥水 × 10',
    '瞬間移動卷軸 × 100', '返回卷軸 × 20', '自我加速藥水 × 30', '不額外贈送技能', '640 / 1260', '50.8%', '自然生命與魔力恢復會停止']) assert(html.replace(/<[^>]*>/g,'').includes(text), text);
  h.node('#newName').value = 'Test'; await h.click({ action: 'create' });
  assert.equal(h.creates.length, 0); assert.match(h.html(), /確認建立新旅程/); assert.match(h.html(), /640 \/ 1260/);
  await h.click({ action: 'confirmNew' }); assert.equal(h.creates.length, 1);
});

test('legacy export helper remains byte-for-byte unchanged', () => {
  const functionLine = (text, name) => text.split('\n').find(line => new RegExp(`^(?:async )?function ${name}\\(`).test(line));
  for (const name of ['showLegacy']) {
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
  assert.equal(normalizedImport,functionLine(originalApp,'showImport').replace('匯入後按備份中的裝備、補給與自動狩獵設定，結算保存時間以來尚未處理的離線旅途。','離線結算目前暫停；匯入後保留備份內已取得的進度，不補算備份至今的離線收益。'));
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
  assert.match(h.html(),/download="七日戰線-Stage3候選重建-未交付-修訂73-1791648000123.json"/);
  assert.doesNotMatch(h.html(),/目前階段2/);
  assert.equal(h.downloads.length,1);
  assert.deepEqual(JSON.parse(await h.downloads[0].text()),{format:'ashen-covenant-v3',state:h.state});
  assert.match(h.html(),/id="backupText" readonly/);
});

test('archive names prioritize genuine pre-form snapshots and distinguish restorable Stage2 from Stage3', () => {
  const h=harness(), makeRow=state=>({stateJSON:JSON.stringify(state),revision:42,resolvedAt:1791644000123});
  const preForm=createStage2Game('knight','Pre-form',undefined,11); delete preForm.formProgress;
  const row=makeRow(preForm);
  assert.match(h.ui.archiveLabel(row),/^圖鑑升級前/);
  assert.equal(h.ui.archiveFilename(row),'七日戰線-圖鑑升級前-修訂42-1791644000123.json');
  const stage2=makeRow(beforeSilver());
  assert.equal(h.ui.archiveLabel(stage2),'怪物升級前，可恢復Stage2');
  assert.equal(h.ui.archiveFilename(stage2),'七日戰線-怪物升級前-可恢復Stage2-修訂42-1791644000123.json');
  for(const mutate of [state=>{state.inventory.scrolls=[]},state=>{state.monsterRevision=1},state=>{state.worlds[state.player.map].campRevision=1},state=>{state.inventory.stacks['ITEM-STRONG-GREEN-POTION']=1}]) {
    const state=createStage2Game('knight','New-data',undefined,11); delete state.formProgress; mutate(state);
    const upgraded=makeRow(state);
    assert.match(h.ui.archiveLabel(upgraded),/不可恢復Stage2/);
    assert.doesNotMatch(h.ui.archiveLabel(upgraded),/^圖鑑升級前|^怪物升級前/);
    assert.equal(h.ui.archiveFilename(upgraded),'七日戰線-Stage3候選重建-未交付-修訂42-1791644000123.json');
  }
  const invalid={...row,stateJSON:'not json'};
  assert.equal(h.ui.archiveLabel(invalid),'無法判定版本的原始快照');
  assert.equal(h.ui.archiveFilename(invalid),'七日戰線-版本未確認-修訂42-1791644000123.json');
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

function blockedUI(){
 const h=harness(null);h.ui.session.phase='blocked';h.ui.session.error=Error('synthetic checksum failure');h.ui.session.recovery={currentAvailable:true,currentFingerprint:'original',candidates:[{key:'last-known-good',fingerprint:'backup',revision:3,resolvedAt:1000,name:'Synthetic <backup>',level:1,map:'MAP-TOWN-SILVER',valid:true},{key:'archive:bad',revision:2,resolvedAt:0,valid:false,error:'invalid checksum'}]};h.ui.showBlocked();return h;
}
test('blocked recovery exports the exact damaged original without requiring a loaded character',async()=>{
 const h=blockedUI(),raw={format:'ashen-covenant-v3-recovery-raw',envelope:{stateJSON:'{"damaged":',checksum:'wrong',revision:4}};h.ui.session.raw=raw;assert.doesNotMatch(h.html(),/data-action="export"/);assert.match(h.html(),/data-action="exportRawSave"/);await h.click({action:'exportRawSave'});assert.equal(h.restores.raw,1);assert.equal(h.downloads.length,1);assert.deepEqual(JSON.parse(await h.downloads[0].text()),raw);assert.match(h.html(),/download="七日戰線-原始復原資料.json"/);assert.equal(h.ui.session.phase,'blocked');await h.click({action:'close'});assert.match(h.html(),/進度已保護/);
});
test('null exports create no download and explain the available recovery action',async()=>{
 const h=blockedUI();await h.click({action:'exportRawSave'});assert.equal(h.downloads.length,0);assert.match(h.node('#toast').textContent,/沒有可匯出的原始資料/);await h.ui.showExport();assert.equal(h.downloads.length,0);assert.match(h.node('#toast').textContent,/沒有可讀進度.*原始資料/);assert.doesNotMatch(h.html(),/id="download"/);
});
test('candidate preview and cancellation never restore or start simulation',async()=>{
 const h=blockedUI();assert.match(h.html(),/Synthetic &lt;backup&gt;/);assert.match(h.html(),/data-recovery="archive:bad" disabled/);await h.click({recovery:'last-known-good'});assert.match(h.html(),/確認恢復備份/);assert.match(h.html(),/先完整封存目前原始資料/);assert.equal(h.restores.recovery,0);assert.equal(h.restores.resume,0);assert.equal(h.ui.session.state,null);await h.click({action:'cancelRecovery'});assert.equal(h.ui.session.pendingRecovery,null);assert.match(h.html(),/進度已保護/);await h.click({recovery:'archive:bad'},true);assert.equal(h.restores.recovery,0);assert.equal(h.ui.session.pendingRecovery,null);
});
test('explicit recovery confirmation remains stopped until a separate resume click',async()=>{
 const h=blockedUI();await h.click({recovery:'last-known-good'});await Promise.all([h.click({action:'confirmRecovery'}),h.click({action:'confirmRecovery'})]);assert.equal(h.restores.recovery,1);assert.equal(h.restores.resume,0);assert.equal(h.ui.session.phase,'recovery-ready');assert.match(h.html(),/備份已恢復/);assert.match(h.html(),/遊戲仍暫停/);await h.click({action:'close'});assert.equal(h.node('#panel').open,true);assert.match(h.html(),/備份已恢復/);await h.click({action:'resumeRecovery'});assert.equal(h.restores.resume,1);assert.equal(h.ui.session.phase,'ready');assert.equal(h.node('#panel').open,false);
});
test('failed confirmation, lost ownership and refresh never claim restoration success',async()=>{
 const h=blockedUI();h.ui.session.session.owned=false;h.ui.showBlocked();assert.match(h.html(),/data-recovery="last-known-good" disabled/);await h.click({recovery:'last-known-good'});await h.click({action:'confirmRecovery'});assert.equal(h.restores.recovery,0);assert.equal(h.ui.session.phase,'blocked');assert.match(h.node('#toast').textContent,/未恢復/);h.ui.session.session.owned=true;h.ui.session.rejectRecovery=true;await h.click({action:'confirmRecovery'});assert.equal(h.restores.recovery,0);await h.click({action:'refreshRecovery'});assert.equal(h.restores.inspect,1);assert.equal(h.ui.session.pendingRecovery,null);assert.match(h.html(),/進度已保護/);
});
test('candidate read error is visible without hiding raw export or the original failure',()=>{
 const h=blockedUI();h.ui.session.recoveryError='synthetic candidate read failure';h.ui.showBlocked();assert.match(h.html(),/synthetic candidate read failure/);assert.match(h.html(),/synthetic checksum failure/);assert.match(h.html(),/data-action="exportRawSave"/);
});
test('room interruption uses its own explicit continuation action and stays stopped when closed',async()=>{
 const h=harness();h.ui.session.phase='room-recovered';h.ui.onSession();assert.match(h.html(),/上次連線已結束/);assert.match(h.html(),/最後確認保存/);await h.click({action:'close'});assert.equal(h.node('#panel').open,true);await h.click({action:'resumeRoomRecovery'});assert.equal(h.restores.roomResume,1);assert.equal(h.restores.resume,0);assert.equal(h.node('#panel').open,false);
});

test('ally skills list living family players and companions on the same map and escape their names and IDs',async()=>{
 const h=harness(),map=h.state.player.map,otherMap=Object.keys(data.MAPS).find(id=>id!==map),summonType=Object.keys(data.MONSTERS)[0];
 const room={active:true,state:h.state,players:[
  {player:{id:'family-hero',name:'家人甲',hp:10,map},pets:[{id:'family-pet',name:'家人小狗',hp:2,map}],summons:[{id:'family-summon',type:summonType,hp:2,map}]},
  {player:{id:'dead-hero',name:'死亡家人',hp:0,map},pets:[{id:'dead-pet',name:'死亡寵物',hp:2,dead:true,map}],summons:[]},
  {player:{id:'distant-hero',name:'異圖家人',hp:10,map:otherMap},pets:[{id:'distant-pet',name:'異圖寵物',hp:2,map:otherMap}],summons:[]},
  {player:{id:'x" onclick="bad',name:'<img src=x onerror=bad>',hp:10,map},pets:[],summons:[]}
 ]};h.ui.setRoom(room);await h.ui.castSkill('SKILL-G01-01');
 for(const id of ['hero','family-hero','family-pet','family-summon'])assert(h.html().includes('data-target="'+id+'"'),id);
 for(const id of ['dead-hero','dead-pet','distant-hero','distant-pet'])assert(!h.html().includes('data-target="'+id+'"'),id);
 assert.match(h.html(),/家人甲（家人隊伍）/);assert.match(h.html(),/家人小狗（家人隊伍）/);
 assert.match(h.html(),/&lt;img src=x onerror=bad&gt;/);assert.match(h.html(),/data-target="x&quot; onclick=&quot;bad"/);assert.doesNotMatch(h.html(),/<img src=x|data-target="x" onclick=/);
});
test('ally target buttons send the family actor ID through the room controller without executing a solo action',async()=>{
 const h=harness(),commands=[],map=h.state.player.map;
 h.ui.setRoom({active:true,state:h.state,players:[{player:{id:'family-hero',name:'家人',hp:10,map},pets:[{id:'family-pet',name:'小狗',hp:10,map}],summons:[]}],async command(action){commands.push(structuredClone(action));return{ok:true,events:[]}}});
 for(const targetId of ['family-hero','family-pet']){
  await h.ui.castSkill('SKILL-G01-01');await h.click({allySkill:'SKILL-G01-01',target:targetId});
 }
 assert.deepEqual(commands,[{type:'skill',skillId:'SKILL-G01-01',targetId:'family-hero'},{type:'skill',skillId:'SKILL-G01-01',targetId:'family-pet'}]);
 assert.deepEqual(h.actions,[]);
});


test('equipment identification and quality colors hide unknown powers and consistently prefix +N',()=>{
 const state=fixture({itemId:'EQ-LEATHER-ARMOR',plus:4,quality:'blessed',stats:['STR','WIS']});
 state.inventory.equipment[0].identified=false;state.inventory.scrolls=[];
 state.inventory.equipment.push({...state.inventory.equipment[1],uid:'normal',quality:'normal',plus:0,blessingStat:undefined});
 const h=harness(state);h.ui.showBag('equipment');
 assert.match(h.html(),/data-quality="unidentified">未鑑定的防具<\/strong>/);
 assert.match(h.html(),/data-quality="blessed">\+4 祝福的皮甲 · 精神 \+1<\/strong>/);
 assert.match(h.html(),/data-quality="normal">\+0 皮甲<\/strong>/);
 const unknown=h.html().split('<div class="item">')[1];
 assert.doesNotMatch(unknown,/祝福|力量|耐久|data-icon=/);
 assert.match(unknown,/disabled title="請先鑑定裝備"/);
 const bank=Object.values(data.NPCS).find(n=>n.service==='personal_storage');
 state.storage.equipment=structuredClone(state.inventory.equipment).map((item,i)=>({...item,uid:'bank'+i}));
 h.ui.showNPC(bank.id);
 for(const quality of ['unidentified','normal','blessed'])assert.equal((h.html().match(new RegExp('data-quality="'+quality+'"','g'))||[]).length,2);
});
test('all scroll tiers use identification colors in bag, storage and fusion preview',()=>{
 const h=harness(fixture({scrollQuality:'blessed'}));
 h.state.inventory.scrolls.push({uid:'unknown',itemId:'ITEM-FUSION-ARMOR-ADVANCED-BLESSED',identified:false},{uid:'plain',itemId:'ITEM-FUSION-WEAPON-BASIC-NORMAL',identified:true});
 h.ui.showBag('items');
 assert.match(h.html(),/data-quality="unidentified">未鑑定的融合卷<\/strong>/);
 assert.match(h.html(),/data-quality="normal">初階武器融合卷軸<\/strong>/);
 assert.match(h.html(),/data-quality="blessed">祝福的初階武器融合卷軸<\/strong>/);
 assert.doesNotMatch(h.html(),/高階防具|ARMOR-ADVANCED/);
 h.ui.showFusion(['a','b'],{scrollUid:'scroll'});
 assert.match(h.html(),/data-quality="normal">\+1 匕首<\/strong>/);
 assert.match(h.html(),/data-quality="blessed">祝福的初階武器融合卷軸<\/strong>/);
 h.state.inventory.equipment[1].quality='blessed';h.ui.showBag('fusion');
 assert.match(h.html(),/data-quality="normal">\+0 匕首<\/strong> × 1/);
 assert.match(h.html(),/data-quality="blessed">\+0 祝福的匕首<\/strong> × 1/);
 h.ui.showFusion(['a','b'],{scrollUid:'scroll'});
 assert.match(h.html(),/data-quality="blessed">\+1 祝福的匕首<\/strong>/);
});
test('auto status names the current route and actual hunting floor without changing state',()=>{
 const h=harness(),s=h.state;s.auto.enabled=true;s.auto.targetMap='MAP-REG-SILVER';
 for(const phase of ['TRAVEL','RETURN_MAP']){s.auto.phase=phase;const before=structuredClone(s);assert.match(h.ui.autoStateLabel(s),new RegExp(data.MAPS[s.player.map].name_zh+' → '+data.MAPS[s.auto.targetMap].name_zh));assert.deepEqual(s,before);}
 s.player.map=s.auto.targetMap;s.auto.phase='HUNT';assert.equal(h.ui.autoStateLabel(s),'狩獵中（'+data.MAPS[s.player.map].name_zh+'）');
 s.auto.phase='LOOT';assert.match(h.ui.autoStateLabel(s),/拾取戰利品/);
 s.auto.enabled=false;s.auto.reason='缺少紅水';assert.equal(h.ui.autoStateLabel(s),'缺少紅水');
});

function learningFixture(id='SKILL-G01-04',count='10'){
 const s=createGame('mage','技能合成角色',undefined,7),n=data.NPCS['NPC-SILVER-LAWFUL-SHRINE'];rules.addXP(s,rules.xpAtLevel(50));s.player.map=n.map_id;[s.player.x,s.player.y]=n.position_tiles;s.player.skills=[id];s.player.skillMastery={version:1,successes:{[id]:count}};s.inventory.stacks[data.SKILLS[id].book_id]=2;return s;
}
test('known skills retain cast/quick slots and require a read-only breakthrough confirmation',async()=>{
 const s=learningFixture(),h=harness(s),id='SKILL-G01-04',book=data.SKILLS[id].book_id;
 h.ui.showSkills();assert.match(h.html(),/嘗試突破/);assert.match(h.html(),/傷害 \+6.67%/);assert.match(h.html(),/下次成功率 5%/);assert.match(h.html(),/data-cast="SKILL-G01-04"/);
 const before=structuredClone(s);await h.click({learn:id});assert.deepEqual(s,before);assert.equal(h.actions.length,0);assert.match(h.html(),/失敗仍消耗技能書，不退還/);assert.match(h.html(),/這次成功後/);
 await h.click({panel:'skills'});await h.click({confirmLearn:id});assert.equal(h.actions.length,0);
 await h.click({learn:id});await Promise.all([h.click({confirmLearn:id}),h.click({confirmLearn:id})]);assert.equal(h.actions.length,1);assert.equal(h.actions[0].type,'learn');assert.equal(s.inventory.stacks[book],1);
 await h.click({confirmLearn:id});assert.equal(h.actions.length,1);
});
test('learning confirmation shows first-learn certainty, location restrictions, and rounded zero MP savings',async()=>{
 const s=learningFixture('SKILL-G01-05','1'),h=harness(s);h.ui.showLearn('SKILL-G01-05');assert.match(h.html(),/耗魔 −0 MP/);assert.match(h.html(),/向上取整/);assert.match(h.html(),/實際減少 0 MP/);
 s.player.skills=[];s.player.skillMastery.successes={};h.ui.showLearn('SKILL-G01-05');assert.match(h.html(),/首次學習 100% 成功/);
 s.player.x=0;s.player.y=0;h.ui.showLearn('SKILL-G01-05');assert.match(h.html(),/目前不在可閱讀範圍/);assert.match(h.html(),/data-confirm-learn="SKILL-G01-05" disabled/);assert.equal(h.actions.length,0);
});
test('skill list uses the actual mastery MP cost and all three benefit directions use percentages',()=>{
 const s=learningFixture('SKILL-G05-01','20'),h=harness(s);h.ui.showSkills();assert.match(h.html(),/76 MP/);assert.match(h.html(),/耗魔 −4 MP/);
 for(const[id,label]of[['SKILL-G01-04','傷害'],['SKILL-G01-01','治療'],['SKILL-G01-02','效果時間']]){s.player.skills=[id];s.player.skillMastery.successes={[id]:'20'};h.ui.showSkills();assert.ok(h.html().includes(label+' +10%'));}
});
test('both learning shrines expose the skill panel and reuse a present original NPC body',()=>{
 const s=learningFixture(),h=harness(s),manifest=JSON.parse(fs.readFileSync(new URL('../../dist/full/art/manifest.json',import.meta.url),'utf8'));
 for(const id of ['NPC-SILVER-LAWFUL-SHRINE','NPC-SILVER-CHAOTIC-SHRINE']){h.ui.showNPC(id);assert.match(h.html(),/data-panel="skills"/);assert.equal(manifest.actors[id].manifest,manifest.actors['NPC-SILVER-WARDEN'].manifest);assert.ok(fs.existsSync(new URL('../../dist/full/art/'+manifest.actors[id].manifest,import.meta.url)));}
 h.ui.showRoom();assert.match(h.html(),/Boss 每名參戰者各有一般戰利品並至少可獲得金幣/);assert.match(h.html(),/1／1.5／2.5／3.5／4.5／5 倍/);
});

test('four-character controls select explicitly, preserve names safely and stop at four slots',async()=>{
 const h=harness(),map=h.state.player.map;h.ui.session.characters=Array.from({length:4},(_,i)=>({id:'local-'+(i+1),name:i===1?'<第二角>':'角色'+(i+1),classId:'knight',level:1,map,hp:20,maxHp:20,autoEnabled:i===2,selected:i===0}));
 h.ui.showCharacters();assert.match(h.html(),/4 \/ 4 名角色/);assert.match(h.html(),/&lt;第二角&gt;/);assert.doesNotMatch(h.html(),/<第二角>/);assert.match(h.html(),/data-action="creation" disabled/);assert.match(h.html(),/自動狩獵中/);
 await h.click({selectCharacter:'local-2'});assert.equal(h.ui.session.selectedByUI,'local-2');assert.equal(h.actions.length,0);
 h.node('#partyEnabled').value='1';h.node('#partyLeader').value='local-3';h.node('#partyFollow').value='1';await h.click({action:'saveParty'});assert.deepEqual(structuredClone(h.ui.session.partyByUI),{enabled:true,leaderId:'local-3',follow:true});
});
test('family room and recovery phases prevent character mutation and use their own actor view',async()=>{
 const h=harness();h.ui.session.localView={players:[{id:'local-peer'}]};assert.equal(h.ui.companionPlayers()[0].id,'local-peer');
 const family=[{id:'remote-peer'}];h.ui.setRoom({active:true,players:family});h.ui.session.phase='room';h.ui.showCharacters();assert.match(h.html(),/請先結束家庭房或完成恢復/);assert.match(h.html(),/data-action="saveParty" disabled/);assert.equal(h.ui.companionPlayers()[0].id,'remote-peer');
 await h.click({selectCharacter:'local-2'});await h.click({action:'saveParty'});await h.click({action:'creation'});assert.equal(h.ui.session.selectedByUI,undefined);assert.equal(h.ui.session.partyByUI,undefined);assert.equal(h.creates.length,0);
 h.ui.setRoom(null);h.ui.session.phase='room-recovered';assert.equal(h.ui.companionPlayers().length,0);await h.click({selectCharacter:'local-2'});assert.equal(h.ui.session.selectedByUI,undefined);
});

test('forest permit purchase is explicit, permanent and not charged twice; elf needs no purchase',async()=>{
 const h=harness(),n=data.NPCS['NPC-SILVER-WARDEN'];[h.state.player.x,h.state.player.y]=n.position_tiles;h.state.player.gold=2000;
 h.ui.showNPC(n.id);assert.match(h.html(),/支付 1,000 金幣取得許可/);await h.click({buyForestPermit:'1'});assert.equal(h.state.player.forestPermit,true);assert.equal(h.state.player.gold,1000);assert.match(h.html(),/已持有永久通行許可/);
 await h.click({buyForestPermit:'1'});assert.equal(h.state.player.gold,1000);
 const elf=harness(createGame('elf','Elf',undefined,3));elf.ui.showNPC(n.id);assert.match(elf.html(),/妖精可免費通行/);assert.doesNotMatch(elf.html(),/data-buy-forest-permit/);
});
test('auto settings expose run/clear modes and pass the selected mode through the existing command',async()=>{
 const h=harness();h.ui.showAuto();assert.match(h.html(),/無視奔跑/);assert.match(h.html(),/順路清怪/);
 for(const[id,value]of Object.entries({autoMap:h.state.auto.targetMap,autoHP:'ITEM-RED-POTION',hpThreshold:'50',mpThreshold:'30',returnWeight:'80',autoStore:'0',autoFood:'1',autoHaste:'0',autoTravelMode:'clear'}))h.node('#'+id).value=value;
 await h.click({action:'saveAuto'});assert.equal(h.actions.at(-1).type,'configureAuto');assert.equal(h.actions.at(-1).settings.travelMode,'clear');assert.equal(h.state.auto.settings.travelMode,'clear');
});

test('enchantment details remain hidden until identified and use actual elemental and proc values',()=>{
 const h=harness(),e=h.state.inventory.equipment[0];e.enchantment={version:1,element:{kind:'fire',count:'10'},special:{kind:'life_steal',count:'10'}};e.identified=false;h.ui.showBag();assert.doesNotMatch(h.html(),/屬性傷害|觸發吸血|成功 10 次|#ed665c/);
 e.identified=true;h.ui.showBag();assert.match(h.html(),/屬性傷害 \+5/);assert.match(h.html(),/5% 觸發吸血/);assert.match(h.html(),/#ed665c/);assert.match(h.html(),/collection-bonus/);
});
test('enchantment preview does not spend stones and changing type commits one stable transaction',async()=>{
 const h=harness(),e=h.state.inventory.equipment[0],stone='ITEM-ENCHANT-WATER';e.identified=true;e.enchantment={version:1,element:{kind:'fire',count:'10'}};h.state.inventory.stacks[stone]=2;
 const before=structuredClone(h.state);h.ui.showEnchant(e.uid,stone);assert.deepEqual(h.state,before);assert.match(h.html(),/替換此軌原本的「火」/);assert.match(h.html(),/失敗保留舊效果/);assert.match(h.html(),/成功率 16.67%/);
 await Promise.all([h.click({confirmEnchant:'1'}),h.click({confirmEnchant:'1'})]);assert.equal(h.actions.length,1);assert.equal(h.actions[0].transactionId,'1');assert.equal(h.actions[0].confirmChange,true);assert.equal(h.state.inventory.stacks[stone],1);assert.equal(h.state.enchantments.applied,'1');
 await h.click({confirmEnchant:'1'});assert.equal(h.actions.length,1);
});
test('fusion requires each duplicated enchantment track and preserves the chosen tracks',async()=>{
 const s=fixture(),h=harness(s);s.inventory.equipment[0].enchantment={version:1,element:{kind:'fire',count:'10'},special:{kind:'life_steal',count:'2'}};s.inventory.equipment[1].enchantment={version:1,element:{kind:'water',count:'3'},special:{kind:'slow',count:'4'}};
 h.ui.showFusion(['a','b'],{scrollUid:'scroll'});assert(disabledCommit(h.html()));assert.match(h.html(),/fusionEnchant-element/);assert.match(h.html(),/fusionEnchant-special/);
 h.ui.showFusion(['a','b'],{scrollUid:'scroll',enchantmentChoices:{element:'b',special:'a'}});assert(!disabledCommit(h.html()));assert.match(h.html(),/屬性傷害 \+2.31/);h.node('#fusionScroll').value='scroll';h.node('#fusionEnchant-element').value='b';h.node('#fusionEnchant-special').value='a';await h.ui.commitFusion(['a','b']);assert.deepEqual(h.actions[0].enchantmentChoices,{element:'b',special:'a'});const output=s.inventory.equipment[0];assert.deepEqual(output.enchantment,{version:1,element:{kind:'water',count:'3'},special:{kind:'life_steal',count:'2'}});
});

test('polymorph picker uses target-owned forms and invitations require an explicit answer',async()=>{
 const h=harness(),calls=[];h.ui.session.act=async action=>{calls.push(structuredClone(action));return{ok:true}};
 h.ui.session.localView={pendingPolymorph:{targets:[{memberId:'other',name:'<家人>',forms:[{id:'MON-GOBLIN',name:'哥布林'}]}],incoming:[],outgoing:[]}};
 h.ui.showPolymorphTargets();assert.match(h.html(),/先.*同意|需要對方同意/);assert.match(h.html(),/&lt;家人&gt;/);h.ui.showPolymorphForms('other');assert.match(h.html(),/MON-GOBLIN/);assert.equal(calls.length,0);
 await h.click({polyInvite:'other',formId:'MON-GOBLIN'});assert.deepEqual(calls[0],{type:'invitePolymorph',targetMemberId:'other',formId:'MON-GOBLIN'});
 h.ui.session.localView.pendingPolymorph={incoming:[{id:'poly-1',casterName:'<施法者>',targetName:'UI',formName:'哥布林'}],outgoing:[],targets:[]};h.ui.showPolymorphInvitations();assert.match(h.html(),/&lt;施法者&gt;/);assert.match(h.html(),/接受/);assert.equal(calls.length,1);await h.click({polyAnswer:'poly-1',accept:'0'});assert.deepEqual(calls[1],{type:'answerPolymorph',invitationId:'poly-1',accept:false});
});
function tradeView(){return{targets:[],open:{id:'trade-1',revision:3,selfId:'self',members:['self','other'],names:{self:'UI',other:'<交易對象>'},offers:{self:{gold:2,stacks:{},equipment:[],scrolls:[],petIds:[]},other:{gold:9,stacks:{},equipment:[],scrolls:[],petIds:[]}},assets:{self:{gold:2,stacks:{},equipment:[],scrolls:[],pets:[]},other:{gold:9,stacks:{},equipment:[],scrolls:[],pets:[]}},accepted:[]}}}
test('trade separates readonly peer offer, saves only own input and submits one revision on double click',async()=>{const h=harness(),calls=[];h.ui.session.localView={pendingTrade:tradeView()};h.ui.session.act=async action=>{calls.push(structuredClone(action));await Promise.resolve();return{ok:true}};h.ui.showTrade();assert.match(h.html(),/&lt;交易對象&gt;/);assert.match(h.html(),/对方|對方提出（唯讀）/);assert.equal((h.html().match(/id="tradeGold"/g)||[]).length,1);h.node('#tradeGold').value='12';await Promise.all([h.ui.submitTrade('offerTrade','trade-1'),h.ui.submitTrade('offerTrade','trade-1')]);assert.equal(calls.length,1);assert.equal(calls[0].revision,3);assert.equal(calls[0].offer.gold,12);assert.deepEqual(Array.from(calls[0].offer.equipment),[]);h.ui.session.localView.pendingTrade.open.revision=4;await h.ui.submitTrade('confirmTrade','trade-1');assert.equal(calls.length,1)});
test('trade escrow names original host and limits lock notice to offered assets',()=>{const h=harness();h.state.tradeEscrow={coordinatorName:'<原房主>'};h.ui.showTrade();assert.match(h.html(),/連回 &lt;原房主&gt; 核對/);assert.match(h.html(),/只有本次提出的物品與金幣/);assert.match(h.html(),/其他角色操作仍可繼續/)});
function uiPet(s,id='pet100',v4=false){const keeper=Object.values(data.NPCS).find(n=>n.map_id===s.player.map&&n.service==='paid_player_recovery_and_pet_collar_recall');Object.assign(s.player,{x:keeper.position_tiles[0],y:keeper.position_tiles[1]});const pet={id,sourceId:'synthetic:'+id,collarUid:'collar'+id.slice(3),collarInBag:true,type:'PET-WOLF',name:'<狼>',level:45,x:s.player.x,y:s.player.y,map:s.player.map,hp:1,mp:0,food:100,foodAt:60000,mpRegenAt:8000,magicAt:0,v4At:s.clockMs,xp:'0',active:false,dead:false,aptitudes:{hp:100,attack:100,defense:100,speed:100},effects:[],attackAt:0,moveAt:0,path:[],mode:'defend'};if(v4)pet.v4=previewLegacyPet(pet,{sex:'male',effect:'meleeAttack'}).pet.v4;s.pets.push(pet);return pet}
test('legacy pet upgrade has a readonly comparison and consumes confirmation only once',async()=>{const h=harness(),pet=uiPet(h.state);h.ui.showPets();assert.match(h.html(),/預覽新版升級/);h.ui.showPetUpgrade(pet.id);h.node('#petUpgradeSex').value='female';h.node('#petUpgradeEffect').value='meleeAttack';const before=JSON.stringify(pet);h.ui.previewPetUpgrade(pet.id);assert.equal(JSON.stringify(pet),before);assert.equal(h.actions.length,0);assert.match(h.html(),/原本/);assert.match(h.html(),/升級後/);assert.match(h.html(),/&lt;狼&gt;/);await Promise.all([h.ui.commitPetUpgrade(pet.id),h.ui.commitPetUpgrade(pet.id)]);assert.equal(h.actions.filter(a=>a.type==='petUpgrade').length,1);assert.equal(pet.v4.sex,'female');assert.match(h.html(),/寵物背包/)});
test('breeding resumes a saved transaction without staging another RNG draw',async()=>{const h=harness(),calls=[];h.state.petBreeding={pending:{id:'7',parents:[]}};h.ui.session.act=async action=>{calls.push(structuredClone(action));h.state.petBreeding.pending=null;return{ok:true}};h.ui.showPetBreeding();assert.match(h.html(),/結果已封存，不會重新抽取/);await Promise.all([h.ui.commitPetBreeding('7'),h.ui.commitPetBreeding('7')]);assert.equal(calls.length,1);assert.deepEqual(calls[0],{type:'petBreedCommit',transactionId:'7'})});
test('pet bag sends UID and stack transfers through actual engine without duplicating inventory',async()=>{const h=harness(),pet=uiPet(h.state,'pet100',true);h.state.equipped={};const gear=h.state.inventory.equipment[0],count=h.state.inventory.stacks['ITEM-RED-POTION'];h.ui.showPetBag(pet.id);await h.click({petBagTransfer:pet.id,direction:'deposit',item:'ITEM-RED-POTION',count:'1'});assert.equal(h.state.inventory.stacks['ITEM-RED-POTION'],count-1);assert.equal(pet.v4.bag.stacks['ITEM-RED-POTION'],1);await h.click({petBagTransfer:pet.id,direction:'deposit',uid:gear.uid});assert(pet.v4.bag.equipment.some(e=>e.uid===gear.uid));assert(!h.state.inventory.equipment.some(e=>e.uid===gear.uid))});
test('offline report names every character and presents separate deltas',()=>{const h=harness(),summary={kills:'0',deaths:'0',potionsUsed:'0',xpEarned:'0',gold:0};h.ui.session.report={seconds:60,before:summary,after:summary,characters:[{name:'<一>',before:summary,after:{...summary,kills:'2',xpEarned:'20',gold:5}},{name:'二',before:summary,after:{...summary,kills:'4',xpEarned:'40',gold:8}}]};h.ui.showReport();assert.match(h.html(),/&lt;一&gt;/);assert.match(h.html(),/二/);assert.match(h.html(),/金幣淨變化 5/);assert.match(h.html(),/金幣淨變化 8/);assert.match(h.html(),/各角色分別列出/)});

test('wild pet inspection displays saved traits without reroll or mutation',()=>{const h=harness(),pet=uiPet(h.state,'pet100',true),monster={petType:pet.type,level:pet.level,petV4:pet.v4},before=JSON.stringify(monster),rng=h.state.rng,html=h.ui.wildPetTraitsHTML(monster);assert.match(html,/雄性/);assert.match(html,/出生/);assert.match(html,/STR/);assert.match(html,/個性/);assert.equal(JSON.stringify(monster),before);assert.equal(h.state.rng,rng);assert.equal(h.ui.wildPetTraitsHTML({}), '')});

test('form collection denominator uses the complete current catalog and explains elite unlock',()=>{const h=harness();h.ui.formChoices();assert(h.html().includes('收藏 0/'+forms.formCollection(h.state).length));assert.match(h.html(),/2% 直接永久收藏/);assert.doesNotMatch(h.html(),/菁英分類尚未指定/)});
