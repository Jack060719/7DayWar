# 七日戰線 / 7DayWar：GitHub Pages 與電腦伺服器

使用者已將儲存庫轉為公開。遊戲名稱更改不會自動更改儲存庫名稱、網址或 Git 歷史；舊的來源紀錄與相容識別保留。以下是待執行的發布步驟，不是已部署完成的聲明。

## 網頁發布

1. 先匯出原網址的玩家備份，並依 [TESTING.md](TESTING.md) 檢閱本次結果。GitHub Pages 是另一個網站來源，不會自動取得原本電腦網址的 IndexedDB 存檔。
2. 檢查待提交變更，包含現有尚未提交的完整程式與素材；排除私人存檔、金鑰、密碼與機器設定。遊玩提示用的公開字串不是伺服器密碼。不要重設工作樹、強制推送或把改名當作刪除歷史的方法。
3. 確認提交及推送目標後，將要發布的完整版本送到 GitHub。這份工作流程不會替使用者執行 Git 提交或推送。
4. 在儲存庫 Settings → Pages 將 Source 選成 **GitHub Actions**。
5. 到 Actions → **Publish 7DayWar to GitHub Pages** → Run workflow，選擇待發布分支。工作流程僅手動觸發，不會每次 push 就部署。
6. 工作流程只上傳 `dist/`。從部署輸出的網址再加上 `full/` 開啟完整版，例如 `https://OWNER.github.io/REPOSITORY/full/`。根目錄保留舊版入口，兩者都有密碼提示。
7. 核對 Pages 上的完整版、資產 MIME、角色建立、備份匯入／匯出與手機實機；本機測試不能代替正式 HTTPS 網站驗收。

參考 [GitHub Pages 說明](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)與 [官方自訂 workflow](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。公開儲存庫可使用 GitHub Free 的 Pages；目前網站約 481 MiB，仍須遵守 [1 GB 網站與頻寬等限制](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)。這次不新增付費服務。

## 密碼與儲存

首次入口密碼為 `7day`，驗證通過後才匯入遊戲主程式。輸入區下方顯示使用者指定的完整標語：

> 此遊戲僅用於學生練習AI應用，造成任何損害均不負責

僅在本機 localStorage 記錄 `7daywar.access.v1=accepted`，不傳送密碼、不儲存明文密碼，也不修改玩家存檔。記住的是同一網站來源、同一瀏覽器；換瀏覽器、清除資料、無痕或禁止儲存時可能需要重輸。兩個遊戲入口在相同來源下共用標記。若只是驗證標記無法寫入，可在本次通過密碼後繼續；若瀏覽器連既有存檔流程所需的儲存也封鎖，仍會顯示原有的「進度已保護」，不略過舊存檔保護。

這個提示可從公開原始碼得知或繞過，不會限制公開程式、圖片與音樂的存取；不可作為多人伺服器身分驗證。標語不代表已取得素材授權或免除法律責任。

## 電腦伺服器的後續階段

GitHub Pages 只提供靜態網頁與素材，不能執行 Node 多人伺服器。目標仍是 Windows 電腦統一結算多人世界；目前 `portable/server.mjs` 只提供靜態檔案，`portable/signaling.mjs` 只做房間配對，房主瀏覽器才執行現有候選的戰鬥。這次改名與入口提示不會把它變成電腦權威伺服器。

後續需完成伺服器結算、持久保存、房員身分驗證、進出房間角色交接，以及可供不同地點連線的私人 HTTPS／WSS 入口。GitHub Pages 的 HTTPS 頁面不能直接把目前 HTTP 電腦網址當作正式連線方案；需核對混合內容、CORS、私人網路存取與實機行為。不得自行公開連接埠或停用防火牆。電腦離線時只讓多人不可用，不能強制阻擋單人。

Android 完整 APK、iPhone 可完整離線啟動的 PWA 與四角色無上限離線補算仍保留原需求；Pages 不會自動產生 Service Worker 或完成離線安裝。程式更新、存檔升級與正式部署須各自驗證。
