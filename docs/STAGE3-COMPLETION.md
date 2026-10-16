# Stage3 需求實作對照

日期：2026-10-11。本文件以使用者提供的缺口清單編號重新對照當前程式，沒有沿用舊 ZIP 的完成數字；只整理需求摘要、程式與可重跑測試，不含私人訊息連結或機器路徑。147 個有效直接需求全部對照，合併為 44 列，同一編號僅出現一次。這不是遊戲完成百分比。

**狀態仍為整合候選。**「已實作」代表程式接線存在且有相關定點測試，不代表最終整包、所有視覺、所有世界路線或真手機驗收。最終程式樹的 Node 測試為 444 通過／0 失敗／3 權限略過；依使用者要求只做一次最後整合瀏覽器檢查，1／1 通過。前段原生 20／20 與最後素材檢查分開記錄，沒有製作或驗證新版 ZIP。

已批准試玩規則見 [P1–P5 規格](STAGE3-GAP-PROPOSAL.md) 與 [寵物 v4 規格](PET-V4-PROPOSAL.md)。原來源未列明的機率／區間由使用者確認採本次試玩提案；不是外部原作官方數值。測試方法及桌面／手機證據界線見 [TESTING](TESTING.md)。

## 147 項直接需求對照

下表檔名未列目錄者，程式位於 dist/full/，機械測試位於 tests/full/，native 開頭測試位於 tests/browser/。同列的每個編號具有相同狀態；合併只為便於閱讀。

| 清單編號 | 本輪範圍 | 狀態 | 程式／證據與界線 |
| --- | --- | --- | --- |
| PARTY-01、PARTY-02、PARTY-03、PARTY-05 | 四格帳本、分圖同練、同圖協作、經驗均分與隨機分物 | 已實作；程式測試通過 | roster.mjs／coop-engine.mjs；roster、roster-session、roster-worker、coop-engine 測試 |
| PARTY-04 | 既有同族助攻加上前排攔截、後排拉距與既有控場 | 已實作；程式測試通過 | engine.mjs；monster-tactics.test.mjs；不新增未批准補血技能 |
| REGEN-01、REGEN-02 | 參戰後八秒不自然回血；藥水即時治療保留 | 已實作；程式測試通過 | engine.mjs；combat-travel-respawn、recovery-kit-taming 測試 |
| GEAR-01、GEAR-07 | 新生普通／菁英／Boss 的裝備掉落品質政策 | 已實作；程式測試通過 | elite-policy.mjs／engine.mjs；travel-elite-policy、recovery-drop-integration 測試；舊活怪不追套 |
| GEAR-02、GEAR-05、GEAR-10 | 未鑑定灰色、普通白色、祝福淡黃與 +N 前綴 | 已實作；程式測試通過 | item-presentation.mjs／app.mjs；item-presentation、native-quality-orientation 測試 |
| GEAR-03、GEAR-04 | 鑑定媒介、未鑑定不得穿戴 | 已實作；程式測試通過 | engine.mjs；recovery-ui-contract、silver-items 測試 |
| GEAR-06、GEAR-08、GEAR-09 | 普通／祝福能力差異、對不死加傷與防具屬性 | 已實作；程式測試通過 | rules.mjs／engine.mjs；recovery-blessing-effects 測試；保留既有暫定平衡 |
| GEAR-11、GEAR-12、GEAR-13、GEAR-14、GEAR-15、GEAR-16、GEAR-17、GEAR-18、GEAR-19、GEAR-20、GEAR-21 | 雙材料融合、失敗消耗、祝福繼承、卷階、安全 +N 與來源卷映射 | 已實作；程式測試通過 | fusion-policy／fusion-inventory／engine；fusion-policy、fusion-validation、recovery-fusion-engine、silver-items 測試 |
| SKILL-01、SKILL-02、SKILL-04、SKILL-09 | 各職學習媒介、首次必成、書籍已鑑定與施法材料 | 已實作；程式測試通過 | data／skills／skill-mastery；skill-mastery、recovery-ui-contract 測試 |
| SKILL-03 | 神殿／母親樹地點門檻與黑妖不限地點 | 已實作；程式測試通過 | skill-mastery.mjs／data.mjs；skill-mastery、native-skill-roster 測試 |
| SKILL-05、SKILL-06、SKILL-07、SKILL-08 | 重複媒介突破、失敗只耗書、遞減機率與藍字增益 | 已實作；程式測試通過 | skill-mastery.mjs；skill-mastery、native-skill-roster 測試；採已批准 P1 試玩數值 |
| SKILL-10 | 未列名稱的騎士後期新技能 | 保留：缺具體技能名單 | 現有騎士技能保留；不能把未知新技能捏造成已完成 |
| MAGIC-01、MAGIC-02、MAGIC-03 | 攻擊魔法必中、MR 減傷與控制技能成功率分流 | 既有機制保留；待完整跨單位驗收 | rules／skills／engine；妖魔法師、coop 與 enchantment 定點案例不等於所有法術全覆蓋 |
| PET-01、PET-17 | 各物種棲地、銀騎野狼與牧羊犬 | 已實作；程式測試通過 | engine.mjs；recovery-kit-taming、recovery-camps、pets-v4-engine 測試 |
| PET-02 | 異色出生率及偏高野生資質 | 機制與桌面原生呈現已驗；實機待驗收 | pets-v4／pet-visuals／renderer；原圖輕微色調分支已實看，不是逐物種新配色或新動作 |
| PET-03 | 零重獨立項圈、收藏與實際交易 | 已實作；程式測試通過 | data／trade／room-controller；pet-capacity、trade、pet-trade-save；已用兩個桌面隔離設定檔驗證持久協定，手機另驗 |
| PET-04、PET-05、PET-06、PET-07 | 五屬性成長、忠誠／飢餓、死亡扣值與復活 | 已實作；程式測試通過 | pets-v4／engine／pet-presentation；pets-v4、pets-v4-engine 與 UI 測試 |
| PET-08、PET-09、PET-10、PET-11、PET-12 | 異性繁殖、LV30/45 次數、近親限制、繼承與子代異色 | 已實作；程式測試通過 | pets-v4.mjs；pets-v4、roster-session、pet-trade-save；預備結果保存後單次提交 |
| PET-13、PET-14、PET-15、PET-16 | 永久及裝備 CHA 加隱藏職業值，容量／捕捉與繁殖分流 | 已實作；程式測試通過 | rules.mjs／engine.mjs；pet-capacity、pets-v4 測試 |
| TAME-01、TAME-02、TAME-03、TAME-04 | 半血門檻、指定食物、不停止敵方攻擊與低血加成 | 已實作；程式測試通過 | taming-policy.mjs／engine；recovery-kit-taming、pet-capacity、pets-v4-engine 測試 |
| PET4-01、PET4-02、PET4-03、PET4-04、PET4-05、PET4-06、PET4-07、PET4-08 | 十一物種五屬性、逐項品質、成長上限與橘色光環 | 已實作；程式測試通過 | pets-v4／rules／engine／skills；pets-v4、pets-v4-engine；數值為批准試玩版 |
| PET4-09、PET4-10、PET4-11、PET4-12、PET4-13、PET4-14 | 固定個性、普通／單型／複合池及品質倍率 | 已實作；程式測試通過 | pets-v4.mjs；pets-v4 測試；倍率作用於效果增量而非整個基礎能力 |
| PET4-15、PET4-16、PET4-17、PET4-18、PET4-19、PET4-20 | 子代越界橘色、父母加權、1/32 先祖與主副相加 | 已實作；程式測試通過 | pets-v4.mjs；pets-v4、pet-trade-save；真譜系資料不因交易重抽 |
| PET4-21 | 先祖金色徽章與主副個性資訊 | 文字與桌面原生呈現已驗；實機待驗收 | pet-presentation／pet-visuals／renderer；先祖金字及有效橘屬性足環已實看，手機另驗 |
| POLY-01、POLY-02、POLY-07、POLY-08 | 普通擊殺／菁英機率收藏、攻速與永久收藏增益 | 已實作；程式測試通過 | form-progress／elite-policy／rules；travel-elite-policy、dark-elf-art、coop-engine 測試 |
| POLY-03 | 有等級限制的 Boss 實體契約與交易 | 已實作；程式測試通過 | form-progress／trade；交易及掉落測試，真正跨機交易以本輪持久協定驗證為準 |
| POLY-04 | 可取消、只列可用形態的卷軸變身 | 已實作；程式測試通過 | app／engine；recovery-ui-contract、dark-elf-art；不足八方向施法素材不算全動作完成 |
| POLY-05、POLY-06 | 自己與經同意的友方玩家變身，禁止怪物／寵物／召喚物 | 已實作；程式測試通過 | polymorph-interaction／skills／coop；polymorph-interaction 及 UI／原生同意流程測試 |
| ENCH-01、ENCH-02、ENCH-03、ENCH-04、ENCH-05、ENCH-06、ENCH-07、ENCH-08、ENCH-09、ENCH-10 | 武器雙軌、防具單軌、掉石、成本遞減、實戰效果與融合逐軌繼承 | 已實作；程式測試通過 | enchantment-policy／enchantment／engine／fusion-policy；enchantment、fusion 及 room 保存測試 |
| ENCH-11 | 能力頁以藍色括號列附魔實際增益 | 已實作；程式測試通過 | app.mjs／enchantment-policy；recovery-ui-contract 及原生介面測試 |
| ENCH-12 | 火紅／水藍／風綠／地黃的場景護盾或流光 | 場景已實作；桌面原生限定範圍已驗 | enchantment-visuals／renderer；一套匕首 idle 的四元素 × 八方向與未附魔對照已實看；不是全武器／全動作像素接觸驗收 |
| WORLD-01、WORLD-02 | 銀騎補給／裝備／神殿／倉庫、妖森學習點與非妖精許可 | 已實作；程式測試通過 | data／skill-mastery／world／engine；travel-elite-policy、skill-mastery 測試 |
| WORLD-03、WORLD-04、WORLD-05、WORLD-06 | 指定獵場限制、逐圖步行、有成本的例外傳送與沿途遭遇 | 已實作；程式測試通過 | engine／world；combat-travel-respawn、travel-elite-policy、recovery-deep-scroll 測試；非每路線都實測 |
| WORLD-07 | 敵對血盟／紅名 PvP 攔截 | 保留：不納入本輪家庭合作 | 使用者確認未定規格的 PvP 不自動加入；無血盟／紅名平衡與權限規格 |
| WORLD-08 | 趕路與已到獵場的階段提示 | 已實作；程式測試通過 | app.mjs／engine auto.phase；受控 UI 與路線測試 |
| WORLD-09、WORLD-10 | 缺藥／80%負重回最近可達村莊，補給後走回獵場 | 已實作；程式測試通過 | engine／world；combat-travel-respawn、travel-elite-policy；缺卷停下告警，不偽造返城 |
| WORLD-11、WORLD-12、WORLD-13、WORLD-14、WORLD-15 | 補給清單、初始商店、綠水雙速、四職銀騎出生與起始物品 | 已實作；程式測試通過 | data／rules／engine；recovery-kit-taming、combat-travel-respawn、UI 測試 |
| DENS-01、DENS-02、DENS-03、DENS-04、DENS-05、DENS-06、DENS-07、DENS-10 | 全圖分級營地、可達巡邏、清空後視野外整組再生與邊界限制 | 機制已實作；全區密度／遭遇節奏尚待實機遊玩 | world-camps／engine；world-camps、camp-capacity、combat-travel-respawn；全候選點可達檢查不等於每條狩獵路線體感驗收 |
| DENS-08、DENS-09 | 無視奔跑與順路清怪兩種趕路策略 | 已實作；程式測試通過 | engine.mjs；travel-elite-policy、recovery-ui-contract；保留原目的地 |
| CAM-01 | 直式阻擋操作並可恢復原橫式面板 | 桌面原生已驗；真手機旋轉未跑 | native-quality-orientation；不能代稱 iOS Safari 主畫面驗收 |
| CAM-02、CAM-03、CAM-04 | 永久中央相機、不可通行外框與合法路徑 | 既有實作；桌面原生／路徑定點驗證 | renderer／world；native-ui-transport、recovery-path-scratch；手機觸控另驗 |
| CAM-05 | 邊界附近仍保有可達的視野外怪群 | 機制已實作；全區巡航尚待遊玩驗收 | world-camps／engine；world-camps、camp-capacity 測試 |
| MON-01、MON-02、MON-03、MON-04、MON-05、MON-06、MON-07、MON-08、MON-09、MON-10、MON-11、MON-12、MON-13 | 十二種怪物原有數值、棲地新生、行為、弱點與掉落映射 | 已實作；程式測試通過 | silver-monsters／silver-drop-policy／silver-items；recovery-monster-profile、silver-items、recovery-drop-integration；不追套已存活舊怪 |
| TUNE-01 | 數值允許明列後續變更 | 設計原則 | 本輪 P1–P5 與寵物 proposal 已批准為試玩數值；不改稱官方原作資料 |

## 保存、連線及交易補充驗證

- 每台裝置一份四角色帳本、一組 lease／revision／checksum；原單角成為第一角，升級前在同一儲存交易封存。Worker、匯入、匯出與故障復原使用整份帳本。不能用四個獨立 GameSession 假裝同時同世界。
- 家庭房只帶選中角色，其他三角暫停。checkpoint 還原本人原世界、位置、RNG 與時間基準後保存個人成果；收到的房內世界不可覆寫個人世界。重開見房間標記先停下，明確繼續後從當下計時，不補算未確認房間時間。
- 交易尚未雙方確認時不動資產；最後保存中斷則鎖住該次雙向資產，回原房主核對持久決定。其他資產可繼續玩，換角或進出家庭房不會自動清鎖。
- 本次獨立稽核發現「以交易前備份匯入可移除暫鎖」漏洞，已加保存防護：任何帳本成員有 escrow，或房主還有未完成參與者時，拒絕一般整份匯入與降版還原；仍允許匯出與正常遊玩。
- 故障復原先找目前資料與候選中 revision 最新且真的通過校驗的紀錄。若有未結交易，候選必須原樣保留其鎖與房主決定；不得退到無鎖快照。校驗全毀不能宣稱已知遠端決定；保留毀損原文供匯出，既有 lease／CAS／封存不降低。
- 已補測試涵蓋非選中角色鎖、換角、真 CoopRoom 進出、整帳本匯出、損毀候選復原，以及寵物交易碰撞重編。寵物五屬性、性別、異色、主副個性、父母／祖父母譜系、忠誠、繁殖次數與背包附魔都保留；永久譜系不跟著顯示 actor ID 改寫。
- 對應：roster-session、roster-storage、roster-worker、save-recovery、pet-trade-save、trade、room-session 與 room-controller 測試。跨機協定與 UI 已於盾牌重製前做原生驗證；最後素材檢查不重做交易操作，手機交易仍由使用者驗收。純函式交易測試不能取代原生證據。

## 美術與平台尾項

| 項目 | 已核對 | 仍保留的限制 |
| --- | --- | --- |
| 暗黑精靈缺本體 | MON-DARK-ELF 沿用既有原創 FI 暗黑精靈弓手，八方向五動作 40 組／272 格已實看及原生解碼；野怪、卷軸變身與箭矢呈現有場景驗證 | 不是新繪獨立本體；原素材來源鏈未重審；S／N 發射點仍是估計；未證明所有施法動作。[沿用驗證](art/dark-elf-reuse.md) |
| 47 個缺道具圖示 | 已產出原創 atlas 並接真正 32 px 圖示，native-stage3-icons 可重跑 | 附件原畫未作精確還原；實手機視覺另驗 |
| 持盾動態外觀 | 15 套配對已接入，新增 5,040 幀／720 clips；裝卸盾切換主角與家庭角色，最後一次原生整合通過 | 保留厚塗風格；動作細節、部分輪廓比例與估計發射點待使用者驗收，見 [素材驗收](art/shield-pairs/ACCEPTANCE.md) |
| 附魔元素護盾／流光 | Canvas 原生實看四元素 × 八方向，另驗未附魔／未鑑定／裝卸狀態；防具足環及護盾弧、武器方向流光 | 一套騎士匕首 idle 的 40 格對照，不是逐武器輪廓或全動作像素對齊；見 [UI 驗證](STAGE3-UI-VALIDATION.md) |
| 異色／先祖／橘光環 | 固定 trait 與只讀 helper；原圖輕微色調、先祖金字與符合條件的橘屬性足環已原生實看 | 不使用隨機畫面重抽；不是逐物種新配色或新動畫，真手機另驗 |
| 桌面原生 | Chromium 真 Canvas、IndexedDB、Worker、WebRTC 隔離設定檔案例；本輪 Node v24.20.0、Chrome 154 | headless、disable-gpu／in-process-gpu，測試專用 no-sandbox；不是 Android、iPhone、觸控、音訊或手機 GPU 效能 |
| 手機離線冷啟動 | 保存後離線收益結算已存在，現在含完整四角帳本 | 全資產 PWA 快取／第一次完全無網開啟尚未實作；本輪選定有網路使用，不能將離線收益說成手機離線啟動完成 |
| 公開服務與交付 | 靜態入口、配對服務與本機啟動可測 | 尚未選定託管與發布；GitHub Pages 本身不能跑配對服務；沒有自行付費、改防火牆或公開資料 |

## 13 項較早轉述需求的界線

這些編號不併入上方 147 項，亦不把「全經典世界」等未完整規格當成已完成。

| 編號 | 現況 |
| --- | --- |
| REL-01、REL-02、REL-03 | 狩獵／掉寶／融合、自動補給循環與逐段離線收益有實作；四角共時計算已接，長期平衡與全路線生存不是零死亡保證。 |
| REL-04、REL-05、REL-06、REL-07 | 負重回復、技能學習、四職與 51 級後配點沿用現行規則；未知新增技能不自行補造。 |
| REL-08、REL-09、REL-10 | 狼、哈士奇、杜賓原物種特色保留；v4 個體數值採批准的窄幅區間與成長，不宣稱每個個體排序絕對一致。 |
| REL-11 | 保留原創厚塗／細緻方向，密度機制補足；持盾、全身形武器／施法、來源還原與全方向實機仍分開驗收。 |
| REL-12 | 目前世界與目錄有實作；無證據宣稱全原作裝備、法術、任務和怪物逐一完整還原。 |
| REL-13 | 家庭連線與本機四角已實作候選；線上帳號、持續託管與敵對多人系統不在本輪已完成範圍。 |

## 留給使用者與後續發布的事項

1. Android／iPhone 的觸控、音訊、前後景、2–3 人常態及 10 人長時間共同戰鬥；地區密度與長期成長／掉落體感。
2. 本次配對素材的動作與美術細節；桌面整合檢查不代表逐幀人工或真手機驗收。
3. 託管與 HTTPS 配對服務尚未選定或部署；未具體定案的騎士後期技能、PvP／血盟規則仍保留。
4. 若後續要求 ZIP，另做乾淨解壓與啟動核對。本輪沒有提交、推送或公開發布。
