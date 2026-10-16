# Stage3 物品圖示來源與驗證（2026-10-11）

本次補入 47 個靜態背包圖示：21 張 Boss 變身契約、11 件裝備、金屬塊與 2 種藥水、12 種融合卷軸。現有 324 個物品皆已有圖示綁定。這是圖示表現補齊，沒有改變裝備數值、鑑定、掉落或融合規則；未鑑定卷軸依原 UI 隱藏圖示。

## 原始來源

- [raw-items.png](raw-items.png)：內建 image generation 產生的原創 3×5 圖，共 14 個物品與 1 個契約框。保留精緻手繪／厚塗、金屬皮革質感。
- [raw-scrolls.png](raw-scrolls.png)：內建 image generation 產生的原創 3×4 融合卷軸。由上而下為初、中、高階；每列為武器普通、武器祝福、防具普通、防具祝福。
- 21 張契約是在生成的契約框中，合成專案既有原創 Boss 的南向 idle 第一幀。使用來源、精確 frame rect 及來源 atlas SHA-256 全列於 [pipeline-meta.json](pipeline-meta.json)；不使用外部商用遊戲圖。
- [prompts-used.md](prompts-used.md) 保存本次兩段實際原始生成提示。各原始圖、既有 Boss atlas 與最終 atlas 的雜湊均有記錄。沒有替任何尚未另行授權的內容新增開源授權聲明。
- 另一張生成式去背嘗試實際為棕色背景、沒有可用 alpha，因此捨棄，未進入成品。

## 確定性處理

技能 generate2dsprite 的 Python helper 在本環境無法執行：python、py、python3 均不在可用 PATH，亦未發現既有 Python 安裝。此次明確採用 [build-stage3-icons.mjs](../../../tests/helpers/build-stage3-icons.mjs) 透過隔離 Chrome Canvas 做去背、裁格、縮放與打包；沒有以 Canvas 程序繪製新美術。

去背沿用 helper 的 RGB magenta 距離 100 門檻及由外緣連通的 150 門檻（8 鄰接）。第一次等高切 15 格時，原始圖各列位置略有偏移，7 格觸邊，流程拒絕寫入 runtime。修正為在預期列界上下 20% 列高內尋找完整透明帶，以中點作列界，實際 y=325、661；保持原圖完整，也保留原先的零接邊驗收。卷軸原圖可直接均分 3×4。

每個物品按 alpha bbox 等比縮至最多 56×56，置中於 64×64 格。契約沿用同一完整框，Boss 內容最多 30×34。最終 16 欄×3 列 atlas 是 1024×192 WebP，47 格使用、最後一格空白，159,286 bytes。每一個中間 PNG 另存於 frames/，可追溯與重新打包。

現有圖示 CSS 原先固定 atlas 為 512×576，會拉長新矮圖集；因此只改成 512px auto。舊 1024×1152 圖集仍是原來的 512×576，書本專用樣式不變。圖示內容32×32，沿用既有 1px 外框，DOM 外框尺寸為34×34。

## 本次驗證

[qa-summary.json](qa-summary.json) 保存去識別結果；[browser-gallery-32.png](browser-gallery-32.png) 是使用真 iconHTML 與 app.css 的原生 Chrome 圖庫。另實看原圖、Boss 來源、64px/32px 預覽，以及遊戲背包中的已鑑定普通／祝福卷軸與未鑑定條目。

- 27 個原始裁格均非空且無 alpha 接邊；47 個實際 WebP 重解碼格均非空、無接邊且圖像互異。
- 去背檢測式 R>180、B>180、G<100 的重解碼殘留有22個像素，全部 alpha=1/255；alpha≥16 的殘留為0。這是透明邊缘編碼量化記錄，不聲稱所有非零 alpha 都沒有紫色 RGB。實看深／淺背景32px及64px，未見紫邊。
- Node v24.20.0：圖示來源、所有物品綁定及品質／背包回歸合計39通過、0失敗、0略過。
- Chrome 154.0.8037.98：原生圖示及品質／旋轉2通過、0失敗、0略過。使用合成角色、隔離設定檔、headless、disable-gpu/in-process-gpu。圖示測試驗證 HTTP 素材可解碼、實際 CSS 尺寸、atlas 比例、位置、每格 alpha 與差異。
- Boss 全身縮圖在32px下細節有限，仍須搭配既有名稱閱讀。這不是動畫、怪物完整身體、Android／iPhone實機或使用者最終美術接受的證據。

## 重跑

在專案根目錄使用已安裝的 Chrome／Chromium 設定 BROWSER_BINARY；需要時依環境設定 BROWSER_NO_SANDBOX=1。無 npm 依賴或安裝步驟。

~~~text
node tests/helpers/build-stage3-icons.mjs docs/art/stage3-icons/raw-items.png docs/art/stage3-icons/raw-scrolls.png
node --test tests/full/stage3-icons.test.mjs tests/full/item-presentation.test.mjs tests/full/recovery-ui-contract.test.mjs
node --test tests/browser/native-stage3-icons.test.mjs tests/browser/native-quality-orientation.test.mjs
~~~

未設定 BROWSER_BINARY 時原生測試會明確略過；略過不能算通過。打包後須由最終整合流程另做完整樹、乾淨解壓及資產雜湊核對。

## 後續 P3：9 種附魔石

P3 增加的9顆附魔石沿用原有原創寶石／石頭圖，不擷取外部素材、不程序繪製新美術；以火、水、風、地、血、魔、麻、緩、破文字角標區別用途，四元素角標使用已確認顏色。詳見 [enchantment-stone-bindings.json](enchantment-stone-bindings.json)。這9個綁定與前述47格新圖集分開計數；原47圖集與雜湊不變。角標是介面文字，不是新增怪物或角色素材。
