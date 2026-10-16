# 暗黑精靈既有本體沿用驗證

2026-10-11：MON-DARK-ELF 現在沿用專案既有 MON-FI-DARK-ELF 弓手完整本體（asset ID ASSET-BODY-MON-FI-DARK-ELF）。主 manifest 明記 reuseOf；原本體、WebP、來源欄位與既有接觸／箭矢標記沒有修改。這是相同物種外觀的程式接線，不是新繪獨立本體，也不代表完成外部原作來源還原。

## 本次實際檢查

- Windows Node.js v24.20.0、Chrome 154.0.8037.98 隔離設定檔的原生 Canvas 解碼：40 組、272 格全數載入，沒有空白格或 alpha ≥ 16 的像素碰到 192×192 格邊界。
- 實際檢視 S／SW／W／NW／N／NE／E／SE 的 idle、walk、attack、hit、death 逐格圖。八方向可辨識，站姿與行走足底在原錨點附近；死亡保留倒地末格。沿用既有較重複的步態與少量姿勢跳接，不宣稱重新修整動畫。
- attack 檢視圖疊上既有箭矢發射點。沿用接觸時序：S 為第 3 格，其餘第 4 格（皆從 0 起算）。S／N 仍保留原標記的低信心／估計旗標，不升級成已精密校準。
- 真實 FullRenderer 在銀騎場景畫出合成野怪與玩家實際使用卷軸後的變身，驗證相同本體的 idle 與弓箭攻擊；已有地形、陰影、名牌、箭矢起點。呈現過程沒有變更合成遊戲狀態或 RNG。
- 變身仍需累積 300 隻擊殺；解鎖後消耗一張變身卷軸。JSON 重開後保留正確效果與渲染 consumer ID。

## 可重跑證據

- tests/full/dark-elf-art.test.mjs：2／2 通過。
- tests/browser/native-dark-elf.test.mjs：1／1 通過；設定 BROWSER_BINARY 後可重跑。未設定時為略過，不算驗收通過。
- 原生測試產生 reports/dark-elf/ 下的五組逐格 PNG、場景 idle／arrow PNG 及結果 JSON。這些是可重建的本機產物，交付時不假定存在。

當次 headless 瀏覽器使用 --disable-gpu、--in-process-gpu，並透過 BROWSER_NO_SANDBOX=1 僅對合成測試的隔離設定檔啟動。沒有驗證 Android／iPhone、手機 GPU、觸控或所有技能施法動作；也沒有重新稽核原始 Blender／imagegen 素材的完整來源鏈。
