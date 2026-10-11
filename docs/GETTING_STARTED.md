# 本機與手機啟動

本文件對應重建後的完整 `lineage-dream/` 資料夾。Node 靜態伺服器已支援以下參數並有定點測試；最終 ZIP 乾淨解壓與 Windows／手機實機仍須依 [測試說明](TESTING.md) 分別驗收。

## 電腦

1. 完整解壓 ZIP，確認根目錄有 `dist/`、`portable/` 與兩個 `START-*.cmd`。
2. 執行 `node --version`。目前程式檢查環境使用 `v24.19.0`；未安裝時可由 [Node.js 官方網站](https://nodejs.org/)取得。
3. Windows 雙擊 `START-LOCAL.cmd`。macOS／Linux 或命令列使用者在根目錄執行：

   ```sh
   node portable/server.mjs --root ../dist
   ```

4. 開啟 `http://localhost:8080/full/`。保持終端機開啟，Ctrl+C 停止。

目前不需要 `npm install` 或 `npm run build`。不要用 `file://` 直接開 HTML。

`--root` 相對於伺服器腳本資料夾，因此 `../dist` 正確指向遊戲檔案，與呼叫端工作目錄無關。省略它時伺服器會尋找同層 `site/`，供舊便攜包相容使用；本儲存庫不複製第二份 `site/`。切勿把整個儲存庫當成靜態根目錄。

伺服器預設監聽 `127.0.0.1`，僅提供讀取靜態檔案，不收存檔、不管理帳號，也不提供多人同步。

## 同一可信任家用網路的手機

1. 先停止本機模式，再雙擊 `START-LAN.cmd`，或在根目錄執行：

   ```sh
   node portable/server.mjs --root ../dist --lan
   ```

2. 手機與電腦連上同一可信任網路，在手機瀏覽器輸入終端機列出的 `LAN candidate` 完整網址。手機不能使用電腦的 `localhost`。
3. 多個位址中，選實際家用 Wi-Fi／乙太網路位址；VPN、虛擬網卡或有裝置隔離的訪客 Wi-Fi 未必可用。
4. 若 Windows 顯示防火牆提示，由你確認是否允許該可信任私人網路。程式不改防火牆與路由器，勿為此關閉防火牆或開公網轉發。

LAN 模式監聽所有本機 IPv4 介面，沒有登入或 HTTPS，只供可信任私人網路測試。手機各自是獨立單機，無法在同一世界看見彼此。

## 常見問題

- **找不到 `site/`：** 使用完整的 `node portable/server.mjs --root ../dist`，並確認資料夾完整。
- **8080 被占用：** 關閉另一個伺服器再重試。也可執行 `node portable/server.mjs --root ../dist --port 8081`，再開 `http://localhost:8081/full/`；更換連接埠會切換存檔來源。
- **手機連不上：** 核對終端機列出的網路位址、同一網路及電腦是否仍在執行。不要用本機模式或手機的 localhost。
- **原本角色不見：** `localhost`、電腦 IP、不同 IP、HTTP／HTTPS及連接埠都是不同儲存來源。回原網址匯出 JSON，再於新網址匯入。見 [SAVE_SAFETY.md](SAVE_SAFETY.md)。

目前已有伺服器的預設／自訂根目錄、模組 MIME、不同工作目錄、中文空白路徑、拒絕寫入與路徑／符號連結越界等程式測試。這些不等於實際手機觸控、音訊、效能或 Windows `.cmd` 已通過。
