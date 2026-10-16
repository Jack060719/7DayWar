# Elf sword shield trial

2026-10-11：使用 generate2dsprite 與 imagegen 技能，內建 image_gen 單次編輯原始 S 向 idle 六幀。只在本資料夾保存試製，沒有接 runtime。

Chrome 實際灰綠／白底合成確認六幀均為左前臂一面盾、右手原劍、完整身體，透明背景沒有 inline 預覽所見的棕暈。角色保留金髮與原服裝，但面部／耳朵細節有重繪，不是逐像素不變。

原圖每格 384、生成每格 512；若統一縮回 192，身高約 95 px（原 93–94），腳底逐格偏移約 3–8 px。原幀各 160 ms、anchor [96,150] 保留在 reference.json 與 trial-qc.json；尚須以固定縮放、逐格平移對齊原定位後再验。不得以不同倍率縮每幀掩蓋漂移。

- 原始編輯目標：elf-sword-idle-S-reference-2x3.png
- 未加工生成原圖：raw-sheet.png
- 全六格實際灰底：six-frames-gray-preview.png
- 原／新首格白底與灰底：first-frame-comparison.png
- 提示與來源：prompt-used.txt、reference.json、trial-qc.json
- 透明度原始證據：alpha-qc.json、alpha-histogram.json

這只是南向 idle 小樣；其餘方向、動作與遊戲內持盾切換尚未完成。
