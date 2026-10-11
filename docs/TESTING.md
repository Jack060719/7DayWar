# 測試、規則狀態與驗收

## 本次證據範圍（2026-10-10 UTC）

第三階段已從核對過的第二階段基線重新實作。目前同版候選已通過 128 項隨包測試，乾淨交付目錄也重跑 128／128。獨立複核核對 294 個凍結檔案雜湊、三身體共 128 張紋理的完整 alpha／尺寸／雜湊、819 幀與 32 個動作標記。ZIP 解壓與累積覆蓋結果另由封存驗證記錄確認。這不等於所有舊測試或全遊戲驗收；恢復前的歷史數字不沿用。

目前可確認的範圍：

- 十二種怪物的 72 個來源數值與 60 組來源掉落映射；已有實際掉落到卷軸取得的機械案例。
- 舊怪物定義／新生切換、融合 pending 保存與單次提交，以及遷移、封存與第二階段恢復，已有有範圍的獨立機械複核。
- 四職各三個種子、每組 300 秒的真實引擎自動狩獵案例：均於 27.5 秒離村、32.5 秒首次命中，各組有 14–27 次擊殺、0–1 次死亡；部分案例會死亡。這不是零死亡保證，也不是長期平衡結論。
- 銀騎 18 個路線方向已做實際引擎遍歷：16 個方向到達，`silver-route-6` 正反兩向均紅水耗盡後死亡，未到終點。使用 50 級騎士、+10 匕首、初始 100 瓶紅水，未開無敵，也沒有自動購藥補給控制器。兩次死亡發生在保留的高等怪區域，屬這組裝備／補給條件的生存限制；不是新手安全或 18 向全通過的證據。
- 銀騎營地有實際清怪、留在視野內超過刷新期限不補怪、走離後下一世代補怪、返回後再次擊殺及狀態校驗的引擎案例；見 [營地循環記錄](../evidence/camp-cycle-rebuilt.json)。
- 妖魔法師施法、有限野怪復活、指定深地監卷軸、祝福效果與受控介面已有測試；最新同版候選的有範圍獨立複核已通過。
- Node 靜態伺服器涵蓋預設／自訂根目錄、中文空白路徑、不同工作目錄、模組 MIME、拒絕寫入、越界與符號連結保護。

可隨包檢視的 [覆蓋摘要](../evidence/coverage-status.json)、[四職狩獵記錄](../evidence/starter-hunt-final.json)及 [路線遍歷記錄](../evidence/route-traversal-rebuilt.json)保留詳細範圍。它們是有限測試證據，不能據此宣稱原生瀏覽器、實際手機或最終壓縮包已通過。

## 有效命令

在完整儲存庫根目錄執行。當前環境為 Node.js `v24.19.0`；程式與測試使用 Node 內建模組及本地檔案，沒有 npm 安裝／建置步驟。

語法與定點檢查：

```sh
node --check dist/full/app.mjs
node --check dist/full/engine.mjs
node --check portable/server.mjs
node --test tests/portable/server-root.test.mjs
node --test tests/full/recovery-stage3-session.test.mjs tests/full/recovery-fusion-engine.test.mjs tests/full/recovery-wizard-presentation.test.mjs
```

重跑所有目前隨包測試，使用明確列舉避免不同 shell 的萬用字元行為差異：

```sh
node -e "const fs=require('node:fs'),cp=require('node:child_process');const files=['tests/full','tests/portable'].flatMap(d=>fs.readdirSync(d).filter(n=>n.endsWith('.test.mjs')).sort().map(n=>d+'/'+n));if(!files.length)process.exit(1);const r=cp.spawnSync(process.execPath,['--test',...files],{stdio:'inherit'});process.exit(r.status??1)"
```

先核對測試檔與 fixture 齊備，再記錄實際通過／失敗／未跑數量。命令只會跑隨包檔案，缺失的歷史測試不會因此自動「通過」。目前不列入未隨包的 fuzz、stress 或 audit 腳本，也不以不存在的 `npm test` 代替。

## 必要測試資料

- `tests/fixtures/stage2/full/`：相配第二階段程式比較基準，供路徑、舊狀態、遷移與介面保持測試使用，不是另一份待編輯現行程式。
- `tests/fixtures/monster12-normalized-typed.json`：十二種怪物來源欄位。
- `tests/fixtures/monster12-drop-groups60.json`：60 組掉落來源資料。
- `tests/fixtures/item-mapping-reconstructed.json`：新物品與來源對應紀錄。
- `tests/helpers/private-engine.mjs`：以測試方式檢查實際引擎內部行為的輔助程式。

測試只用合成狀態；不能加入玩家存檔。移動或打包時保留整組相依，不刪除斷言來掩蓋缺檔。

## 暫定設計揭露

已確認來源數值與本次自訂候選需分開理解。以下來自當前覆蓋摘要及程式，尚不應稱為原作已確認規則：

- 融合風險區成功率為 95%／90%／85%；祝福卷成功率加成為 3 個百分點。
- 新裝備成為祝福品質的機率為 10%；沒有來源掉率的項目採 0.5% 候選值。
- 祝福武器只有實際裝備時，對不死系的成功物理傷害有 1.05 倍；施法／觸發法術與背包未裝備武器不套用。計算順序見覆蓋摘要。祝福防具的選定屬性加 1 點。
- 妖魔法師火球：開始施法扣 8 MP、施法 500 ms、射程 6、基礎傷害 5–9、攻擊間隔 1300 ms；MP 不足改為傷害 1–4、射程 1、間隔 1500 ms 的法杖物理攻擊。為單體火球，魔防沿用現有公式，不是範圍爆炸或另定百分比魔防。
- 投餵先要求 HP 不高於 50%；CHA 10 時，HP 比例 50%／25%／10%／1% 的基準成功率為 5%／20%／40%／65%，CHA 每點影響 0.5 個百分點。其餘插值／物種修正以程式為準。
- 合格野怪每個自然生命週期最多復活一次，恢復 30% HP、0 MP；再次死亡不重複給獎勵。

既有銀騎怪物槽位在原合法出生點離開固定邏輯視野後重生；其他地圖維持舊放置方式。新固定營地保留槽位 ID，以自然生命世代區分重生。這不是全世界的新密度規則。

## 最終交付與實機門檻

三個新怪物已完成素材綁定及有限 E 方向離屏場景檢查；同版獨立複核已通過。實際 Windows `.cmd`、原生瀏覽器與 iPhone／Android 尚未驗證。最終 ZIP 解壓和五基準覆蓋以隨包封存驗證記錄為準。

最終驗證至少需要：

1. 對最終程式與資產建立檔案清單及雜湊，確認相對引用和授權齊備。
2. 在新的中文／空白目錄解壓完整 ZIP，重新執行所有隨包測試，再用根目錄啟動命令讀取 `/full/` 與必要資產。
3. 原生瀏覽器創角、狩獵、開關選單、匯出、重開、匯入；檢查中斷、重複操作、跨圖、載入失敗及 IndexedDB／分頁寫入保護。
4. 手機橫直向、觸控、音訊解鎖、前後景切換、長時間戰鬥、離線恢復與記憶體／載入效能。

受控 DOM、Canvas、儲存或 Worker 測試不能替代真實裝置。實際路線測試也要註明角色、等級與裝備，不能將高等角色可通行當作新手安全保證。完整清單見 [ROADMAP.md](../ROADMAP.md)。
