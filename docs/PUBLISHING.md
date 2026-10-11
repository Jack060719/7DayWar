# 自行推送到 GitHub

目標為私人儲存庫 `Jack060719/lineage-dream`。由持有人自行建立、驗證與推送；這份文件不會替你登入或執行任何 GitHub 操作。

請使用完整交付資料夾，不要只推文件暫存稿。推送前依 [TESTING.md](TESTING.md) 確認當前覆蓋與未完成門檻；私人儲存庫也不得包含玩家存檔、帳密或其他私人資料。

## 建立私人空儲存庫

1. 登入 GitHub，建立新儲存庫，Owner 選擇 `Jack060719`，名稱填 `lineage-dream`。
2. Visibility 選擇 **Private**。
3. 不初始化 README、`.gitignore` 或 LICENSE。本資料夾已有前兩者，整體開源授權尚未選定。
4. 確認遠端沒有提交。若已存在內容，先保留並比較差異，不能強制覆蓋。

建立介面與匯入注意事項可參考 [GitHub 官方建立儲存庫說明](https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-new-repository)。

## 本機檢查與提交

安裝 Git 後，在完整解壓的 `lineage-dream/` 根目錄開啟終端機。以下初始化僅適用於尚無 Git 歷史的新資料夾；已有 `.git` 時先檢查原有分支、遠端與提交，不重設既有專案。

```sh
git init
git branch -M main
git status --short
git add .
git diff --cached --stat
git diff --cached --name-only
```

檢閱待提交清單，確認 `dist/full/` 程式與素材、其他隨包程式、必要 fixture、啟動器和文件都有加入，沒有存檔、帳密或私人工作材料。`.gitignore` 不能移除已追蹤的敏感內容，不能代替人工檢閱。

確認 Git 提交身分已設定：

```sh
git config user.name
git config user.email
```

若未設定，可使用以下命令，但先把兩個占位值換成自己的提交名稱和信箱，不要原樣執行。可使用帳號設定頁提供的 noreply 信箱；設定僅套用本儲存庫。

```sh
git config user.name "YOUR_DISPLAY_NAME"
git config user.email "YOUR_VERIFIED_OR_NOREPLY_EMAIL"
```

不要把密碼或權杖填入 Git 設定、遠端網址或專案文件。

確認清單與身分後：

```sh
git commit -m "Import Lineage Dream development snapshot"
git remote -v
```

## 加入遠端與推送

若目前沒有 `origin`，且已在 GitHub 確認私人空儲存庫：

```sh
git remote add origin https://github.com/Jack060719/lineage-dream.git
git remote -v
git push -u origin main
```

若 `origin` 已存在，先核對它的目標，不要直接覆寫。遠端不是空的或推送遭拒時，停止並處理提交差異；不要使用 `--force`。使用你自行完成的 GitHub 驗證，不把任何驗證資料放進專案。[GitHub 官方本機程式匯入說明](https://docs.github.com/en/migrations/importing-source-code/using-the-command-line-to-import-source-code/adding-locally-hosted-code-to-github)說明了此手動流程。

推送後到 GitHub 核對最新提交及 **Private** 標示。這不會自動建立遊戲網站；私人儲存庫也不代表另行發布的網站必然有存取保護。

## 網站與後續版本

若日後另行部署，網站根目錄只指向 `dist/`，遊戲入口是 `/full/`，不要公開整個儲存庫。程式與資產需使用同一份快照。升級前保留相配舊程式與 JSON，見 [SAVE_SAFETY.md](SAVE_SAFETY.md)。

不預先加入 Git LFS；只有實際大型檔案需求、平台限制與儲存策略確認後才另行處理。每次更新應同步路線圖、規則及真實測試結果，未驗收的素材與裝置仍須明列。
