# 本機與手機啟動

本文件對應 `7DW-20261016-01` 候選的 `lineage-dream/` 資料夾。遊戲對外名稱為「七日戰線 / 7DayWar」，首次進入輸入 `7day`；相同來源與瀏覽器會記住通過結果。以下是電腦與手機單人啟動；家庭房間另需 [配對服務與 HTTPS](FAMILY-ROOMS.md)。本候選尚未製作新版 ZIP，Windows 啟動器與手機實機仍須依 [測試說明](TESTING.md) 分別驗收。

## 電腦

1. 完整解壓 ZIP，確認根目錄有 `dist/`、`portable/` 與兩個 `START-*.cmd`。
2. 執行 `node --version`。2026-10-11 驗證環境使用 `v24.20.0`；未安裝時可由 [Node.js 官方網站](https://nodejs.org/)取得。
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

LAN 靜態伺服器監聽所有本機 IPv4 介面，沒有登入或 HTTPS，只供可信任私人網路測試。只啟動它時，手機仍各自單人遊玩。家庭共同世界已接入候選，但遊戲入口要求 HTTPS（電腦 localhost 開發測試例外），並需另外運行配對服務；完整步驟見 [FAMILY-ROOMS.md](FAMILY-ROOMS.md)。

若遊戲網站與配對服務都由你的電腦提供，電腦就必須保持開機。將兩項另行託管後，才可不依賴你的電腦；目前尚未選定平台或發布。

## 常見問題

- **找不到 `site/`：** 使用完整的 `node portable/server.mjs --root ../dist`，並確認資料夾完整。
- **8080 被占用：** 關閉另一個伺服器再重試。也可執行 `node portable/server.mjs --root ../dist --port 8081`，再開 `http://localhost:8081/full/`；更換連接埠會切換存檔來源。
- **手機連不上：** 核對終端機列出的網路位址、同一網路及電腦是否仍在執行。不要用本機模式或手機的 localhost。
- **遊戲能開、家庭房間不能開：** 一般 HTTP 電腦 IP 不符合家庭入口的安全來源要求；只有靜態伺服器也沒有 `/signal` API。依 [家庭連線指引](FAMILY-ROOMS.md) 配置 HTTPS 與獨立配對服務。
- **原本角色不見：** `localhost`、電腦 IP、不同 IP、HTTP／HTTPS及連接埠都是不同儲存來源。回原網址匯出 JSON，再於新網址匯入。見 [SAVE_SAFETY.md](SAVE_SAFETY.md)。

目前已有伺服器的預設／自訂根目錄、模組 MIME、不同工作目錄、中文空白路徑、拒絕寫入與路徑／符號連結越界等程式測試。這些不等於實際手機觸控、音訊、效能或 Windows `.cmd` 已通過。
